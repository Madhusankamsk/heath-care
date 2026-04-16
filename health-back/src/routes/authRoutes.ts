import crypto from "crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client";
import { AuthUser } from "../middleware/auth";
import { sendPasswordResetEmail } from "../services/email/passwordResetEmail";

const router = Router();

const JWT_SECRET = process.env.AUTH_JWT_SECRET;

if (!JWT_SECRET) {
  // This will be surfaced as a runtime error if not configured; keeping here for early feedback
  // eslint-disable-next-line no-console
  console.warn("AUTH_JWT_SECRET is not set. Auth routes will not issue tokens.");
}

router.post("/login", async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ message: "Auth not configured on server" });
  }

  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload: AuthUser = {
    sub: user.id,
    email: user.email,
    role: user.role?.roleName,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });

  return res.json({ token, user: payload });
});

const GENERIC_FORGOT_MESSAGE =
  "If an account exists for this email, you will receive reset instructions.";

function hashPasswordResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function resolvePasswordResetAppBaseUrl(): string {
  const fromEnv = process.env.PASSWORD_RESET_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return "";
}

router.post("/forgot-password", async (req, res) => {
  const { email: rawEmail } = req.body as { email?: string };
  const email = rawEmail?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user?.isActive) {
    return res.json({ message: GENERIC_FORGOT_MESSAGE });
  }

  const baseUrl = resolvePasswordResetAppBaseUrl();
  if (!baseUrl) {
    // eslint-disable-next-line no-console
    console.error(
      "[auth] PASSWORD_RESET_APP_URL is not set; cannot complete password reset email flow.",
    );
    return res.json({ message: GENERIC_FORGOT_MESSAGE });
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  });

  if (process.env.NODE_ENV !== "production") {
    const logLink =
      !emailResult.ok ||
      (emailResult.ok && "skipped" in emailResult && emailResult.skipped);
    if (logLink) {
      // eslint-disable-next-line no-console
      console.info("[password-reset] Reset link:", resetUrl);
    }
  }

  return res.json({ message: GENERIC_FORGOT_MESSAGE });
});

router.post("/reset-password", async (req, res) => {
  const { token: rawToken, newPassword } = req.body as {
    token?: string;
    newPassword?: string;
  };

  if (!rawToken || typeof rawToken !== "string" || !newPassword || typeof newPassword !== "string") {
    return res.status(400).json({ message: "token and newPassword are required." });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters." });
  }

  const tokenHash = hashPasswordResetToken(rawToken.trim());

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired reset link." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return res.json({ message: "Password updated." });
});

export default router;


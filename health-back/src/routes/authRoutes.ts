import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client";
import { AuthUser } from "../middleware/auth";

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

export default router;


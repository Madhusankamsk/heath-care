import jwt from "jsonwebtoken";
import { AuthUser } from "./middleware/auth";

describe("Auth JWT payload", () => {
  const secret = "test-secret";

  it("creates and verifies a compatible token", () => {
    const payload: AuthUser = {
      sub: "user-id",
      email: "user@example.com",
      role: "Admin",
    };

    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    const decoded = jwt.verify(token, secret) as AuthUser;

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });
});


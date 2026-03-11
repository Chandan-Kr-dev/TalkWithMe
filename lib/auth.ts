import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in environment variables");
  return secret;
}

export function generateToken(id: string) {
  return jwt.sign({ id }, getSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret()) as { id: string };
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}

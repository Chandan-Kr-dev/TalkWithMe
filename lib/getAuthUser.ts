import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  await connectDB();
  const user = await User.findById(decoded.id).select("-password");
  return user;
}

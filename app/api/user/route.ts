import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/getAuthUser";

// GET /api/user?search=keyword
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      console.error("User search - auth failed. Token:", req.headers.get("authorization")?.slice(0, 20) + "...");
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("search") || "";

    await connectDB();

    const keyword = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find({
      ...keyword,
      _id: { $ne: user._id },
    }).select("-password");

    return NextResponse.json(users);
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT /api/user - Update profile
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { name, about, avatar } = await req.json();

    await connectDB();

    const user = await User.findById(authUser._id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (name) user.name = name;
    if (about !== undefined) user.about = about;
    if (avatar) user.avatar = avatar;

    await user.save();

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      about: user.about,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

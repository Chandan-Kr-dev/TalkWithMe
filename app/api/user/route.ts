import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getAuthUser } from "@/lib/getAuthUser";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/user?search=keyword
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      console.error("User search - auth failed. Token:", req.headers.get("authorization")?.slice(0, 20) + "...");
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const rawQuery =
      req.nextUrl.searchParams.get("username") ||
      req.nextUrl.searchParams.get("search") ||
      "";
    const usernameQuery = rawQuery.trim().toLowerCase();

    await connectDB();

    if (!usernameQuery) {
      return NextResponse.json([]);
    }

    const usernameRegex = new RegExp(`^${escapeRegex(usernameQuery)}`, "i");
    const users = await User.find({
      _id: { $ne: user._id },
      username: usernameRegex,
    })
      .select("-password")
      .sort({ username: 1 })
      .limit(10);

    const results = users.map((targetUser) => {
      const targetId = targetUser._id.toString();
      const incoming = (user.incomingRequests || []).some((id) => id.toString() === targetId);
      const outgoing = (user.outgoingRequests || []).some((id) => id.toString() === targetId);
      const isFriend = (user.friends || []).some((id) => id.toString() === targetId);

      const relationshipStatus = isFriend
        ? "friends"
        : incoming
        ? "incoming"
        : outgoing
        ? "outgoing"
        : "none";

      return {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        avatar: targetUser.avatar,
        about: targetUser.about,
        relationshipStatus,
      };
    });

    return NextResponse.json(results);
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
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      about: user.about,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

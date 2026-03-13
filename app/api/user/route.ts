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

    const usernameQuery = req.nextUrl.searchParams.get("username")?.trim().toLowerCase() || "";

    await connectDB();

    if (!usernameQuery) {
      return NextResponse.json([]);
    }

    const targetUser = await User.findOne({ username: usernameQuery }).select("-password");
    if (!targetUser || targetUser._id.toString() === user._id.toString()) {
      return NextResponse.json([]);
    }

    const relationshipStatus = (() => {
      const targetId = targetUser._id.toString();
      const incoming = (user.incomingRequests || []).some((id) => id.toString() === targetId);
      const outgoing = (user.outgoingRequests || []).some((id) => id.toString() === targetId);
      const isFriend = (user.friends || []).some((id) => id.toString() === targetId);
      if (isFriend) return "friends";
      if (incoming) return "incoming";
      if (outgoing) return "outgoing";
      return "none";
    })();

    return NextResponse.json([
      {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        avatar: targetUser.avatar,
        about: targetUser.about,
        relationshipStatus,
      },
    ]);
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

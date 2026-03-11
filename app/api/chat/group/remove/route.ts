import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import { getAuthUser } from "@/lib/getAuthUser";

// PUT /api/chat/group/remove - Remove user from group
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { chatId, userId } = await req.json();

    await connectDB();

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    // Only admin can remove, or user can leave themselves
    if (
      chat.groupAdmin.toString() !== user._id.toString() &&
      userId !== user._id.toString()
    ) {
      return NextResponse.json({ message: "Only admin can remove users" }, { status: 403 });
    }

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Remove from group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

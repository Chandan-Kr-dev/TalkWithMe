import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import { getAuthUser } from "@/lib/getAuthUser";

// PUT /api/chat/group/add - Add user to group
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

    const adminIds = (chat.groupAdmins && chat.groupAdmins.length > 0
      ? chat.groupAdmins
      : [chat.groupAdmin]
    ).map((id: { toString: () => string }) => id.toString());

    if (!adminIds.includes(user._id.toString())) {
      return NextResponse.json({ message: "Only admin can add users" }, { status: 403 });
    }

    if (chat.users.some((u: { toString: () => string }) => u.toString() === userId)) {
      return NextResponse.json({ message: "User already in group" }, { status: 400 });
    }

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("groupAdmins", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Add to group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

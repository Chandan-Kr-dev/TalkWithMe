import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import { getAuthUser } from "@/lib/getAuthUser";

// PUT /api/message/read - Mark messages as read
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { chatId } = await req.json();
    if (!chatId) {
      return NextResponse.json({ message: "chatId required" }, { status: 400 });
    }

    await connectDB();

    // Find all unread messages in this chat that the user hasn't read yet
    const unreadMessages = await Message.find({
      chat: chatId,
      sender: { $ne: user._id },
      readBy: { $ne: user._id },
    });

    if (unreadMessages.length === 0) {
      return NextResponse.json({ messageIds: [], status: "read" });
    }

    const messageIds = unreadMessages.map((m) => m._id);

    // Add user to readBy and update status
    await Message.updateMany(
      { _id: { $in: messageIds } },
      {
        $addToSet: { readBy: user._id },
        $set: { status: "read" },
      }
    );

    // Also update delivered messages from this sender to "delivered" if not already
    await Message.updateMany(
      {
        chat: chatId,
        sender: user._id,
        status: "sent",
      },
      { $set: { status: "delivered" } }
    );

    return NextResponse.json({
      messageIds: messageIds.map((id) => id.toString()),
      status: "read",
    });
  } catch (error) {
    console.error("Read messages error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

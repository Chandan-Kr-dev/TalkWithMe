import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import User from "@/models/User";
import { getAuthUser } from "@/lib/getAuthUser";

// GET /api/message?chatId=xxx - Get all messages for a chat
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const chatId = req.nextUrl.searchParams.get("chatId");
    if (!chatId) {
      return NextResponse.json({ message: "chatId required" }, { status: 400 });
    }

    await connectDB();

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name avatar email")
      .populate("chat");

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/message - Send a new message
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { content, chatId } = await req.json();
    if (!content || !chatId) {
      return NextResponse.json({ message: "content and chatId are required" }, { status: 400 });
    }

    await connectDB();

    let message = await Message.create({
      sender: user._id,
      content,
      chat: chatId,
      readBy: [user._id],
    });

    await message.populate("sender", "name avatar email");
    await message.populate("chat");
    const populatedMessage = await User.populate(message, {
      path: "chat.users",
      select: "name avatar email",
    });

    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: populatedMessage._id });

    return NextResponse.json(populatedMessage, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

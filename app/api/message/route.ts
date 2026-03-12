import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import User from "@/models/User";
import { getAuthUser } from "@/lib/getAuthUser";
import { encrypt, decrypt } from "@/lib/encryption";

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

    // Decrypt message content before sending to client
    const decryptedMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      msgObj.content = decrypt(msgObj.content);
      // Compute status from readBy for legacy messages without status
      if (!msgObj.status) {
        const otherReaders = (msgObj.readBy || []).filter(
          (id: { toString: () => string }) => id.toString() !== msgObj.sender._id.toString()
        );
        msgObj.status = otherReaders.length > 0 ? "read" : "sent";
      }
      return msgObj;
    });

    return NextResponse.json(decryptedMessages);
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

    const { content, chatId, fileUrl, fileType, fileName } = await req.json();
    if ((!content && !fileUrl) || !chatId) {
      return NextResponse.json({ message: "content or file, and chatId are required" }, { status: 400 });
    }

    await connectDB();

    // Use a default content for file-only messages, then encrypt
    const messageContent = content || (fileType === "image" ? "📷 Photo" : fileType === "video" ? "🎥 Video" : "📎 Document");
    const encryptedContent = encrypt(messageContent);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageData: any = {
      sender: user._id,
      content: encryptedContent,
      chat: chatId,
      readBy: [user._id],
    };

    if (fileUrl) {
      messageData.fileUrl = fileUrl;
      messageData.fileType = fileType;
      messageData.fileName = fileName;
    }

    let message = await Message.create(messageData);

    await message.populate("sender", "name avatar email");
    await message.populate("chat");
    const populatedMessage = await User.populate(message, {
      path: "chat.users",
      select: "name avatar email",
    });

    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: populatedMessage._id });

    // Return decrypted content to the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseMessage = populatedMessage.toObject() as any;
    responseMessage.content = decrypt(responseMessage.content);

    return NextResponse.json(responseMessage, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

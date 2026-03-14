import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import User from "@/models/User";
import { getAuthUser } from "@/lib/getAuthUser";
import { encrypt, decrypt } from "@/lib/encryption";
import PushSubscription from "@/models/PushSubscription";
import webPush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:example@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

async function sendPushNotifications(recipientIds: string[], payload: Record<string, unknown>) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const subscriptions = await PushSubscription.find({ user: { $in: recipientIds } });
  if (!subscriptions.length) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime ? sub.expirationTime.getTime() : undefined,
            keys: sub.keys as { auth: string; p256dh: string },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Web push send error", err);
        }
      }
    })
  );
}

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

    const chat = await Chat.findById(chatId).select("users isGroupChat");
    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const authUserId = user._id.toString();
    const isParticipant = chat.users.some((id) => id.toString() === authUserId);
    if (!isParticipant) {
      return NextResponse.json({ message: "You are not part of this chat" }, { status: 403 });
    }

    if (!chat.isGroupChat) {
      const otherUserId = chat.users.find((id) => id.toString() !== authUserId)?.toString();
      if (!otherUserId) {
        return NextResponse.json({ message: "Chat participants missing" }, { status: 400 });
      }

      const otherUser = await User.findById(otherUserId).select("friends");
      const currentFriends = new Set<string>((user.friends || []).map((id) => id.toString()));
      const otherIsFriend = currentFriends.has(otherUserId);
      const reciprocalFriend = (otherUser?.friends || []).some((id) => id.toString() === authUserId);

      if (!otherIsFriend || !reciprocalFriend) {
        return NextResponse.json(
          { message: "Friend request pending. Wait for acceptance before messaging." },
          { status: 403 }
        );
      }
    }

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

    const message = await Message.create(messageData);

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

    const recipientIds = chat.users
      .map((id) => id.toString())
      .filter((id) => id !== authUserId);

    const preview = messageContent.length > 80 ? `${messageContent.slice(0, 77)}...` : messageContent;

    void sendPushNotifications(recipientIds, {
      title: `New message from ${user.name}`,
      body: preview,
      url: `/chat?chatId=${chatId}`,
      tag: chatId,
    });

    return NextResponse.json(responseMessage, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE /api/message?messageId=xxx - Delete a message sent by the authenticated user
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const messageId = req.nextUrl.searchParams.get("messageId");
    if (!messageId) {
      return NextResponse.json({ message: "messageId required" }, { status: 400 });
    }

    await connectDB();

    const message = await Message.findById(messageId).select("sender chat");
    if (!message) {
      return NextResponse.json({ message: "Message not found" }, { status: 404 });
    }

    if (message.sender.toString() !== user._id.toString()) {
      return NextResponse.json({ message: "You can only delete your own messages" }, { status: 403 });
    }

    const chatId = message.chat.toString();

    await Message.findByIdAndDelete(messageId);

    const chat = await Chat.findById(chatId).select("latestMessage");
    if (chat && chat.latestMessage?.toString() === messageId) {
      const replacementMessage = await Message.findOne({ chat: chatId })
        .sort({ createdAt: -1 })
        .select("_id");
      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: replacementMessage?._id ?? null,
      });
    }

    return NextResponse.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

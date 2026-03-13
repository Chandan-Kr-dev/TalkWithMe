import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import User from "@/models/User";
import "@/models/Message";
import { getAuthUser } from "@/lib/getAuthUser";
import { decrypt } from "@/lib/encryption";

// GET /api/chat - Fetch all chats for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const authUserId = user._id.toString();
    const friendIdSet = new Set<string>((user.friends || []).map((id) => id.toString()));

    await connectDB();

    const chats = await Chat.find({ users: { $elemMatch: { $eq: user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "name avatar email" },
      })
      .sort({ updatedAt: -1 });

    // Decrypt latestMessage content for each chat
    const decryptedChats = chats.map((chat) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatObj = chat.toObject() as any;
      if (chatObj.latestMessage) {
        if (chatObj.latestMessage.content) {
          chatObj.latestMessage.content = decrypt(chatObj.latestMessage.content);
        }
        // Compute status from readBy if not already set
        if (!chatObj.latestMessage.status) {
          const senderId = chatObj.latestMessage.sender?._id?.toString();
          const otherReaders = (chatObj.latestMessage.readBy || []).filter(
            (id: { toString: () => string }) => id.toString() !== senderId
          );
          chatObj.latestMessage.status = otherReaders.length > 0 ? "read" : "sent";
        }
      }
      if (chatObj.isGroupChat) {
        chatObj.canMessage = true;
      } else {
        const otherUser = chatObj.users?.find(
          (u: { _id: { toString: () => string } }) => u._id.toString() !== authUserId
        );
        chatObj.canMessage = otherUser ? friendIdSet.has(otherUser._id.toString()) : false;
      }
      return chatObj;
    });

    return NextResponse.json(decryptedChats);
  } catch (error) {
    console.error("Fetch chats error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/chat - Create or access a one-on-one chat
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const authUserId = user._id.toString();
    const friendIdSet = new Set<string>((user.friends || []).map((id) => id.toString()));

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ message: "userId param required" }, { status: 400 });
    }

    await connectDB();

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [user._id, userId] },
    })
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "name avatar email" },
      });

    if (existingChat) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatObj = existingChat.toObject() as any;
      if (chatObj.latestMessage) {
        if (chatObj.latestMessage.content) {
          chatObj.latestMessage.content = decrypt(chatObj.latestMessage.content);
        }
        if (!chatObj.latestMessage.status) {
          const senderId = chatObj.latestMessage.sender?._id?.toString();
          const otherReaders = (chatObj.latestMessage.readBy || []).filter(
            (id: { toString: () => string }) => id.toString() !== senderId
          );
          chatObj.latestMessage.status = otherReaders.length > 0 ? "read" : "sent";
        }
      }
      if (chatObj.isGroupChat) {
        chatObj.canMessage = true;
      } else {
        const otherUser = chatObj.users?.find(
          (u: { _id: { toString: () => string } }) => u._id.toString() !== authUserId
        );
        chatObj.canMessage = otherUser ? friendIdSet.has(otherUser._id.toString()) : false;
      }
      return NextResponse.json(chatObj);
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const otherUserId = otherUser._id.toString();
    const otherHasFriend = (otherUser.friends || []).some((id) => id.toString() === authUserId);
    if (!friendIdSet.has(otherUserId) || !otherHasFriend) {
      return NextResponse.json(
        { message: "Send a friend request and wait for it to be accepted before starting a chat" },
        { status: 403 }
      );
    }

    // Create new chat
    const chatData = {
      chatName: otherUser?.name || "Chat",
      isGroupChat: false,
      users: [user._id, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate("users", "-password");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatObj = fullChat?.toObject() as any;
    if (chatObj) {
      chatObj.canMessage = true;
    }

    return NextResponse.json(chatObj, { status: 201 });
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

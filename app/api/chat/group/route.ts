import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import { getAuthUser } from "@/lib/getAuthUser";

// POST /api/chat/group - Create a group chat
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { name, users: userIds } = await req.json();

    if (!name || !userIds || userIds.length < 2) {
      return NextResponse.json(
        { message: "Please provide group name and at least 2 users" },
        { status: 400 }
      );
    }

    // Add current user to the group
    const allUsers = [...userIds, user._id.toString()];

    await connectDB();

    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: allUsers,
      groupAdmin: user._id,
      groupAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return NextResponse.json(fullGroupChat, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT /api/chat/group - Update group metadata (name, avatar, admin)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { chatId, chatName, groupAvatar, newAdminId } = await req.json();

    if (!chatId) {
      return NextResponse.json({ message: "chatId is required" }, { status: 400 });
    }

    await connectDB();

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const isAdmin = chat.groupAdmin?.toString() === user._id.toString();

    if (!isAdmin) {
      return NextResponse.json({ message: "Only admin can update the group" }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (chatName) updatePayload.chatName = chatName;
    if (groupAvatar) updatePayload.groupAvatar = groupAvatar;

    if (newAdminId) {
      const isMember = chat.users.some((u: { toString: () => string }) => u.toString() === newAdminId);
      if (!isMember) {
        return NextResponse.json({ message: "New admin must be a group member" }, { status: 400 });
      }
      updatePayload.groupAdmin = newAdminId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "No changes provided" }, { status: 400 });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, updatePayload, {
      new: true,
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Rename group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

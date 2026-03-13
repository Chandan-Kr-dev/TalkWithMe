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
      groupAdmins: [user._id],
      groupAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("groupAdmins", "-password");

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

    const { chatId, chatName, groupAvatar, newAdminId, addAdminId, removeAdminId, adminIds } = await req.json();

    if (!chatId) {
      return NextResponse.json({ message: "chatId is required" }, { status: 400 });
    }

    await connectDB();

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const adminList = (chat.groupAdmins && chat.groupAdmins.length > 0
      ? chat.groupAdmins
      : [chat.groupAdmin]
    ).map((id: { toString: () => string }) => id.toString());

    const isAdmin = adminList.includes(user._id.toString());

    if (!isAdmin) {
      return NextResponse.json({ message: "Only admin can update the group" }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (chatName) updatePayload.chatName = chatName;
    if (groupAvatar) updatePayload.groupAvatar = groupAvatar;

    // Full replace of admins if provided
    if (Array.isArray(adminIds)) {
      const validIds = adminIds.filter((id: string) => chat.users.some((u) => u.toString() === id));
      if (validIds.length === 0) {
        return NextResponse.json({ message: "At least one admin required" }, { status: 400 });
      }
      updatePayload.groupAdmins = validIds;
      updatePayload.groupAdmin = validIds[0];
    }

    // Backward compatibility: single new admin setter
    if (newAdminId && !updatePayload.groupAdmins) {
      const isMember = chat.users.some((u: { toString: () => string }) => u.toString() === newAdminId);
      if (!isMember) {
        return NextResponse.json({ message: "New admin must be a group member" }, { status: 400 });
      }
      const nextAdmins = Array.from(new Set([...adminList, newAdminId]));
      updatePayload.groupAdmins = nextAdmins;
      updatePayload.groupAdmin = nextAdmins[0];
    }

    // Incremental add/remove admins
    if (addAdminId) {
      const isMember = chat.users.some((u: { toString: () => string }) => u.toString() === addAdminId);
      if (!isMember) {
        return NextResponse.json({ message: "User must be a group member" }, { status: 400 });
      }
      const nextAdmins = Array.from(new Set([...adminList, addAdminId]));
      updatePayload.groupAdmins = nextAdmins;
      updatePayload.groupAdmin = nextAdmins[0];
    }

    if (removeAdminId) {
      const nextAdmins = adminList.filter((id) => id !== removeAdminId);
      if (nextAdmins.length === 0) {
        return NextResponse.json({ message: "At least one admin required" }, { status: 400 });
      }
      updatePayload.groupAdmins = nextAdmins;
      updatePayload.groupAdmin = nextAdmins[0];
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "No changes provided" }, { status: 400 });
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, updatePayload, {
      new: true,
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("groupAdmins", "-password");

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Rename group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

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

// PUT /api/chat/group - Rename group / Update group
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { chatId, chatName } = await req.json();

    await connectDB();

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Rename group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
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

    const adminIds = (chat.groupAdmins && chat.groupAdmins.length > 0
      ? chat.groupAdmins
      : [chat.groupAdmin]
    ).map((id: { toString: () => string }) => id.toString());

    // Only admin can remove others; anyone can remove self
    if (!adminIds.includes(user._id.toString()) && userId !== user._id.toString()) {
      return NextResponse.json({ message: "Only admin can remove users" }, { status: 403 });
    }

    // Remove user and adjust admin list if needed
    const updatedUsers = chat.users.filter((u: { toString: () => string }) => u.toString() !== userId);
    let updatedAdmins = adminIds.filter((id) => id !== userId);

    if (updatedAdmins.length === 0 && updatedUsers.length > 0) {
      // Promote first remaining member to keep at least one admin
      updatedAdmins = [updatedUsers[0].toString()];
    }

    chat.users = updatedUsers as unknown as typeof chat.users;
    const updatedAdminObjectIds = updatedAdmins.map((id) => new Types.ObjectId(id));
    chat.groupAdmins = updatedAdminObjectIds as unknown as typeof chat.groupAdmins;
    // Keep legacy field in sync
    chat.groupAdmin = updatedAdminObjectIds.length > 0 ? updatedAdminObjectIds[0] : chat.groupAdmin;
    await chat.save();

    const updated = await Chat.findById(chatId)
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("groupAdmins", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Remove from group error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

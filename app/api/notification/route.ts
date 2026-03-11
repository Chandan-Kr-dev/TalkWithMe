import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { getAuthUser } from "@/lib/getAuthUser";

// GET /api/notification - Get all notifications for user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    await connectDB();

    const notifications = await Notification.find({ user: user._id, isRead: false })
      .populate("message")
      .populate({
        path: "chat",
        populate: { path: "users", select: "name avatar email" },
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT /api/notification - Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { chatId } = await req.json();

    await connectDB();

    await Notification.updateMany(
      { user: user._id, chat: chatId },
      { isRead: true }
    );

    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Mark notifications error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import PushSubscription from "@/models/PushSubscription";

// POST /api/push/subscribe - Save or update a push subscription for the user
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ message: "Invalid subscription" }, { status: 400 });
    }

    await connectDB();

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: user._id,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ message: "Subscription saved" });
  } catch (error) {
    console.error("Save push subscription error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe - Remove a push subscription by endpoint
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ message: "endpoint required" }, { status: 400 });
    }

    await connectDB();

    await PushSubscription.deleteOne({ endpoint, user: user._id });

    return NextResponse.json({ message: "Subscription removed" });
  } catch (error) {
    console.error("Delete push subscription error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

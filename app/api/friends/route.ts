import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import User, { IUser } from "@/models/User";

const BASE_PROJECTION = "name username email avatar about";

type FriendResponse = {
  friends: IUser[];
  incomingRequests: IUser[];
  outgoingRequests: IUser[];
};

async function hydrateRelationships(userId: mongoose.Types.ObjectId): Promise<FriendResponse> {
  const user = await User.findById(userId)
    .populate("friends", BASE_PROJECTION)
    .populate("incomingRequests", BASE_PROJECTION)
    .populate("outgoingRequests", BASE_PROJECTION);

  return {
    friends: ((user?.friends ?? []) as unknown as IUser[]),
    incomingRequests: ((user?.incomingRequests ?? []) as unknown as IUser[]),
    outgoingRequests: ((user?.outgoingRequests ?? []) as unknown as IUser[]),
  };
}

function invalidObjectId(id: string) {
  return !mongoose.Types.ObjectId.isValid(id);
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    await connectDB();
    const data = await hydrateRelationships(authUser._id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch friends error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { username: rawUsername } = await req.json();
    if (!rawUsername) {
      return NextResponse.json({ message: "Username is required" }, { status: 400 });
    }

    const username = rawUsername.trim().toLowerCase();

    await connectDB();

    const [requester, targetUser] = await Promise.all([
      User.findById(authUser._id),
      User.findOne({ username }),
    ]);

    if (!requester) {
      return NextResponse.json({ message: "Requester not found" }, { status: 404 });
    }

    if (!targetUser) {
      return NextResponse.json({ message: "No user found with that username" }, { status: 404 });
    }

    if (targetUser._id.toString() === requester._id.toString()) {
      return NextResponse.json({ message: "You cannot send a request to yourself" }, { status: 400 });
    }

    const alreadyFriends = requester.friends.some((id) => id.toString() === targetUser._id.toString());
    if (alreadyFriends) {
      return NextResponse.json({ message: "You are already friends" }, { status: 400 });
    }

    const outgoingExists = requester.outgoingRequests.some((id) => id.toString() === targetUser._id.toString());
    if (outgoingExists) {
      return NextResponse.json({ message: "Friend request already sent" }, { status: 409 });
    }

    const incomingExists = requester.incomingRequests.some((id) => id.toString() === targetUser._id.toString());
    if (incomingExists) {
      return NextResponse.json({ message: "This user has already requested you" }, { status: 409 });
    }

    requester.outgoingRequests.push(targetUser._id);
    targetUser.incomingRequests.push(requester._id);

    await Promise.all([requester.save(), targetUser.save()]);

    const data = await hydrateRelationships(requester._id);
    return NextResponse.json({ message: "Friend request sent", ...data }, { status: 201 });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { requesterId, action } = await req.json();
    if (!requesterId || !action) {
      return NextResponse.json({ message: "requesterId and action are required" }, { status: 400 });
    }

    if (invalidObjectId(requesterId)) {
      return NextResponse.json({ message: "Invalid requesterId" }, { status: 400 });
    }

    const normalizedAction = action as "accept" | "decline" | "cancel";

    await connectDB();

    const [currentUser, requesterUser] = await Promise.all([
      User.findById(authUser._id),
      User.findById(requesterId),
    ]);

    if (!currentUser || !requesterUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const requesterObjectId = requesterUser._id.toString();
    const hasIncoming = currentUser.incomingRequests.some((id) => id.toString() === requesterObjectId);
    const hasOutgoing = currentUser.outgoingRequests.some((id) => id.toString() === requesterObjectId);

    if (normalizedAction === "accept") {
      if (!hasIncoming) {
        return NextResponse.json({ message: "No incoming request from this user" }, { status: 400 });
      }
      currentUser.incomingRequests = currentUser.incomingRequests.filter(
        (id) => id.toString() !== requesterObjectId
      );
      requesterUser.outgoingRequests = requesterUser.outgoingRequests.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );

      if (!currentUser.friends.some((id) => id.toString() === requesterObjectId)) {
        currentUser.friends.push(requesterUser._id);
      }
      if (!requesterUser.friends.some((id) => id.toString() === currentUser._id.toString())) {
        requesterUser.friends.push(currentUser._id);
      }
    } else if (normalizedAction === "decline") {
      if (!hasIncoming) {
        return NextResponse.json({ message: "No incoming request from this user" }, { status: 400 });
      }
      currentUser.incomingRequests = currentUser.incomingRequests.filter(
        (id) => id.toString() !== requesterObjectId
      );
      requesterUser.outgoingRequests = requesterUser.outgoingRequests.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
    } else if (normalizedAction === "cancel") {
      if (!hasOutgoing) {
        return NextResponse.json({ message: "No outgoing request to this user" }, { status: 400 });
      }
      currentUser.outgoingRequests = currentUser.outgoingRequests.filter(
        (id) => id.toString() !== requesterObjectId
      );
      requesterUser.incomingRequests = requesterUser.incomingRequests.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    await Promise.all([currentUser.save(), requesterUser.save()]);

    const data = await hydrateRelationships(currentUser._id);
    const actionMessage =
      normalizedAction === "accept"
        ? "Friend request accepted"
        : normalizedAction === "decline"
        ? "Friend request declined"
        : "Friend request cancelled";

    return NextResponse.json({ message: actionMessage, ...data });
  } catch (error) {
    console.error("Respond friend request error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

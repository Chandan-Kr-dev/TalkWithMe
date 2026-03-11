import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, avatar } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Please fill all fields" }, { status: 400 });
    }

    await connectDB();

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const user = await User.create({
      name,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    const token = generateToken(user._id.toString());

    return NextResponse.json(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        about: user.about,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

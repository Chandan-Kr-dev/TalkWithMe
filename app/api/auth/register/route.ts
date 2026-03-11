import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { sendVerificationOTP } from "@/lib/mailer";

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

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
      // If existing user hasn't verified, allow re-sending the OTP
      if (!userExists.isVerified) {
        const otp = generateOTP();
        userExists.verificationToken = otp;
        userExists.verificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await userExists.save();

        await sendVerificationOTP(email, userExists.name, otp);

        return NextResponse.json(
          { message: "A new OTP has been sent to your email.", email },
          { status: 200 }
        );
      }
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Generate 6-digit OTP (10 min expiry)
    const otp = generateOTP();

    const user = await User.create({
      name,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      verificationToken: otp,
      verificationTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send OTP email
    await sendVerificationOTP(email, name, otp);

    return NextResponse.json(
      {
        message: "Account created! Enter the OTP sent to your email.",
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

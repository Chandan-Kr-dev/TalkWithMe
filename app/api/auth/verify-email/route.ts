import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

// POST /api/auth/verify-email { email, otp }
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email,
      verificationToken: otp,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired OTP. Please try again." },
        { status: 400 }
      );
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    return NextResponse.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

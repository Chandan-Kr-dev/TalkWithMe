import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { sendPasswordResetOTP } from "@/lib/mailer";

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();

    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "No account found with that email" },
        { status: 404 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { message: "This email is not verified. Please sign up again." },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP (10 min expiry)
    const otp = randomInt(100000, 999999).toString();

    // Use updateOne to avoid triggering pre-save password re-hash
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: otp,
          resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
        },
      }
    );

    await sendPasswordResetOTP(email, user.name, otp);

    return NextResponse.json({
      message: "Reset code sent to your email!",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, otp: rawOtp, newPassword } = await req.json();

    if (!rawEmail || !rawOtp || !newPassword) {
      return NextResponse.json(
        { message: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase().trim();
    const otp = rawOtp.toString().trim();

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email,
      resetToken: otp,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      // Check if user exists at all to give a better error
      const exists = await User.findOne({ email }).select("resetToken resetTokenExpiry");
      if (!exists) {
        return NextResponse.json(
          { message: "No account found with that email" },
          { status: 404 }
        );
      }
      if (!exists.resetToken) {
        return NextResponse.json(
          { message: "No reset code found. Please request a new one." },
          { status: 400 }
        );
      }
      if (exists.resetTokenExpiry && exists.resetTokenExpiry < new Date()) {
        return NextResponse.json(
          { message: "Reset code has expired. Please request a new one." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: "Invalid reset code. Please check and try again." },
        { status: 400 }
      );
    }

    // Hash password manually and use updateOne to avoid pre-save hook issues
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      }
    );

    return NextResponse.json({ message: "Password reset successfully! You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

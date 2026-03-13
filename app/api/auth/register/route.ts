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
    const { name, username: rawUsername, email: rawEmail, password, avatar } = await req.json();

    if (!name || !rawEmail || !password || !rawUsername) {
      return NextResponse.json({ message: "Please fill all fields" }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const username = rawUsername.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { message: "Username must be 3-30 characters and include only letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    await connectDB();

    const [userExists, usernameTaken] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ]);

    const usernameConflict =
      !!usernameTaken && (!userExists || usernameTaken._id.toString() !== userExists._id.toString());

    if (userExists) {
      if (usernameConflict) {
        return NextResponse.json({ message: "Username is already taken" }, { status: 400 });
      }
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

    if (usernameConflict) {
      return NextResponse.json({ message: "Username is already taken" }, { status: 400 });
    }

    // Generate 6-digit OTP (10 min expiry)
    const otp = generateOTP();

    const user = await User.create({
      name,
      username,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
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

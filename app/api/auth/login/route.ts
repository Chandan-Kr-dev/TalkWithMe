import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import connectDB from "@/lib/db";
import User, { IUser } from "@/models/User";
import { generateToken } from "@/lib/auth";
import { sendVerificationOTP } from "@/lib/mailer";

async function ensureUsername(user: IUser) {
  if (user.username) return;

  const sanitize = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30);

  const emailLocalPart = user.email?.split("@")[0] || "";
  let base = sanitize(emailLocalPart || user.name || "user");
  if (!base) {
    base = `user${user._id.toString().slice(-4)}`;
  }

  let candidate = base;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await User.exists({ username: candidate });
    if (!exists) break;
    suffix += 1;
    const suffixStr = suffix.toString();
    const trimmedBase = base.slice(0, Math.max(0, 30 - suffixStr.length));
    candidate = `${trimmedBase}${suffixStr}`;
  }

  user.username = candidate;
}

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, password } = await req.json();

    if (!rawEmail || !password) {
      return NextResponse.json({ message: "Please fill all fields" }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    await ensureUsername(user);

    if (!user.isVerified) {
      // Send a fresh OTP so user can verify right now
      const otp = randomInt(100000, 999999).toString();
      user.verificationToken = otp;
      user.verificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendVerificationOTP(user.email, user.name, otp);

      return NextResponse.json(
        {
          message: "Your email is not verified. We've sent a new verification code.",
          needsVerification: true,
          email: user.email,
          name: user.name,
          username: user.username,
        },
        { status: 403 }
      );
    }

    // Update online status
    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id.toString());

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      about: user.about,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

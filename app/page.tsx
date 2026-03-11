"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import toast, { Toaster } from "react-hot-toast";
import { FiEye, FiEyeOff, FiMessageCircle, FiCamera, FiX, FiShield } from "react-icons/fi";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState(["" , "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const router = useRouter();
  const setUser = useChatStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        // Upload avatar if selected
        let avatarUrl: string | undefined;
        if (avatarFile) {
          const formData = new FormData();
          formData.append("avatar", avatarFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok) {
            avatarUrl = uploadData.url;
          } else {
            toast.error(uploadData.message || "Avatar upload failed");
          }
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, avatar: avatarUrl }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Show OTP verification screen
        setVerifyEmail(data.email || email);
        setShowOtpScreen(true);
        toast.success(data.message);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          // If email not verified, show OTP screen
          if (res.status === 403 && data.needsVerification) {
            setVerifyEmail(data.email || email);
            setShowOtpScreen(true);
            toast.success(data.message);
            return;
          }
          throw new Error(data.message);
        }

        setUser(data);
        toast.success("Logged in successfully!");
        router.push("/chat");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setEmail("guest@example.com");
    setPassword("123456");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <FiMessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TalkWithMe</h1>
          <p className="text-white/60 mt-2">Connect with friends in real-time</p>
        </div>

        {/* Auth Card */}
        {showOtpScreen ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <FiShield size={36} className="text-purple-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Enter verification code</h2>
            <p className="text-white/60 text-sm mb-1">
              We&apos;ve sent a 6-digit code to
            </p>
            <p className="text-purple-300 font-semibold text-sm mb-6">{verifyEmail}</p>

            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/, "");
                    const newOtp = [...otp];
                    newOtp[i] = val;
                    setOtp(newOtp);
                    if (val && i < 5) otpRefs.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (pasted.length === 6) {
                      const newOtp = pasted.split("");
                      setOtp(newOtp);
                      otpRefs.current[5]?.focus();
                    }
                  }}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                />
              ))}
            </div>

            <p className="text-white/40 text-xs mb-6">Code expires in 10 minutes</p>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  const code = otp.join("");
                  if (code.length !== 6) {
                    toast.error("Please enter the complete 6-digit code");
                    return;
                  }
                  setVerifying(true);
                  try {
                    const res = await fetch("/api/auth/verify-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: verifyEmail, otp: code }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      toast.success("Email verified! You can now log in.");
                      setShowOtpScreen(false);
                      setIsLogin(true);
                      setOtp(["", "", "", "", "", ""]);
                    } else {
                      toast.error(data.message);
                    }
                  } catch {
                    toast.error("Verification failed. Try again.");
                  } finally {
                    setVerifying(false);
                  }
                }}
                disabled={verifying}
                className="w-full py-3 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify Email"}
              </button>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await fetch("/api/auth/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, email, password }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      toast.success("New OTP sent!");
                      setOtp(["", "", "", "", "", ""]);
                      otpRefs.current[0]?.focus();
                    } else {
                      toast.error(data.message);
                    }
                  } catch {
                    toast.error("Failed to resend OTP");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Resend OTP"}
              </button>
              <button
                onClick={() => {
                  setShowOtpScreen(false);
                  setOtp(["", "", "", "", "", ""]);
                }}
                className="text-white/50 text-sm hover:text-white/80 transition-colors"
              >
                ← Back to Sign Up
              </button>
            </div>
          </div>
        ) : (
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Tab Switcher */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                isLogin ? "bg-white text-purple-900 shadow-lg" : "text-white/70 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                !isLogin ? "bg-white text-purple-900 shadow-lg" : "text-white/70 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Avatar Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center">
                        <FiCamera size={24} className="text-white/50" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <FiCamera size={20} className="text-white" />
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                      >
                        <FiX size={12} className="text-white" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-2">Upload avatar (optional)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all pr-12"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? (
                "Login"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {isLogin && (
            <button
              onClick={handleGuestLogin}
              className="w-full mt-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all duration-300"
            >
              Get Guest User Credentials
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

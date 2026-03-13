import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  about: string;
  isOnline: boolean;
  isVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  lastSeen: Date;
  friends: mongoose.Types.ObjectId[];
  incomingRequests: mongoose.Types.ObjectId[];
  outgoingRequests: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: {
      type: String,
      default: "",
    },
    about: { type: String, default: "Hey there! I'm using TalkWithMe" },
    isOnline: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    lastSeen: { type: Date, default: Date.now },
    friends: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    incomingRequests: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    outgoingRequests: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;

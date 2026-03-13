import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  chatName: string;
  isGroupChat: boolean;
  users: mongoose.Types.ObjectId[];
  latestMessage: mongoose.Types.ObjectId;
  groupAdmin: mongoose.Types.ObjectId;
  groupAvatar: string;
  deletedFor: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    latestMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    groupAdmin: { type: Schema.Types.ObjectId, ref: "User" },
    groupAvatar: { type: String, default: "" },
    deletedFor: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>("Chat", chatSchema);
export default Chat;

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  status: "sent" | "delivered" | "read";
  fileUrl?: string;
  fileType?: "image" | "video" | "document";
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, required: true },
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    fileUrl: { type: String },
    fileType: { type: String, enum: ["image", "video", "document"] },
    fileName: { type: String },
  },
  { timestamps: true }
);

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);
export default Message;

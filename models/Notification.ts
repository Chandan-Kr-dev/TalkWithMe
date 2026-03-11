import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  message: mongoose.Types.ObjectId;
  chat: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;

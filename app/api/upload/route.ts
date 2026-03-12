import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
];

function getFileCategory(mimeType: string): "image" | "video" | "document" | null {
  if (IMAGE_TYPES.includes(mimeType)) return "image";
  if (VIDEO_TYPES.includes(mimeType)) return "video";
  if (DOC_TYPES.includes(mimeType)) return "document";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Support both "avatar" (profile pic) and "file" (chat attachment) field names
    const file = (formData.get("file") || formData.get("avatar")) as File | null;
    const uploadType = formData.get("type") as string | null; // "avatar" or "chat"

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const isAvatar = uploadType === "avatar" || formData.has("avatar");

    // Validate file type
    if (isAvatar) {
      if (!IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { message: "Only JPEG, PNG, WebP, and GIF images are allowed" },
          { status: 400 }
        );
      }
    } else {
      const category = getFileCategory(file.type);
      if (!category) {
        return NextResponse.json(
          { message: "File type not supported. Allowed: images, videos, PDF, Word, Excel, PowerPoint, text, ZIP" },
          { status: 400 }
        );
      }
    }

    // Validate file size: 5MB for avatars, 25MB for chat files
    const maxSize = isAvatar ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: `File size must be less than ${isAvatar ? "5MB" : "25MB"}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileCategory = getFileCategory(file.type);

    // Determine Cloudinary resource type
    const resourceType = fileCategory === "video" ? "video" as const : fileCategory === "document" ? "raw" as const : "image" as const;

    // Build upload options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadOptions: any = {
      folder: isAvatar ? "talkwithme/avatars" : "talkwithme/chat-files",
      resource_type: resourceType,
    };

    if (isAvatar) {
      uploadOptions.transformation = [
        { width: 300, height: 300, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ];
    } else if (fileCategory === "image") {
      uploadOptions.transformation = [{ quality: "auto", fetch_format: "auto" }];
    }

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          uploadOptions,
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json(
      {
        url: result.secure_url,
        fileType: fileCategory,
        fileName: file.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Upload failed" }, { status: 500 });
  }
}

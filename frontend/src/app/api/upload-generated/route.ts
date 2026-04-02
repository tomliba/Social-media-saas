import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "content-library",
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${publicBase}/${key}`;
}

function uploadToLocal(buffer: Buffer, filename: string): string {
  const uploadsDir = join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = join(uploadsDir, filename);
  writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image, filename } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = image.includes(",") ? image.split(",")[1] : image;
    const buffer = Buffer.from(base64, "base64");

    // Detect content type from data URL prefix or default to png
    let contentType = "image/png";
    const match = image.match(/^data:(image\/\w+);base64,/);
    if (match) contentType = match[1];

    const ext = contentType === "image/jpeg" ? ".jpg" : contentType === "image/webp" ? ".webp" : ".png";
    const safeName = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, "_") : randomUUID();
    const key = `generated/${session.user.id}/${safeName}${ext}`;

    let url: string;

    if (isR2Configured()) {
      url = await uploadToR2(buffer, key, contentType);
    } else {
      const localName = `${safeName}-${randomUUID().slice(0, 8)}${ext}`;
      url = uploadToLocal(buffer, localName);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("upload-generated error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

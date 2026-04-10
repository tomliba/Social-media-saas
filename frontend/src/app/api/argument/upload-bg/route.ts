export const runtime = "edge";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return Response.json({ error: "Backend not configured" }, { status: 503 });
  }

  const headers: Record<string, string> = {};
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  // Stream the request body directly to Flask without buffering
  const res = await fetch(`${flaskUrl}/vg/argument/upload-bg`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": req.headers.get("content-type") || "",
    },
    body: req.body,
    // @ts-expect-error - duplex is needed for streaming
    duplex: "half",
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

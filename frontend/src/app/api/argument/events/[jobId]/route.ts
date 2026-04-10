import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300; // 5 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return new Response(JSON.stringify({ error: "Flask backend not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { jobId } = await params;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/vg/argument/events/${jobId}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min fetch timeout
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    return new Response(errText, { status: res.status });
  }

  // Pipe Flask SSE through with keep-alive heartbeats so the connection
  // doesn't get killed by Next.js / reverse proxies / browsers.
  const flaskBody = res.body;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let done = false;

      // Send a SSE comment every 15s to keep the connection alive
      heartbeat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            // controller closed
          }
        }
      }, 15_000);

      const cleanup = () => {
        done = true;
        if (heartbeat) clearInterval(heartbeat);
      };

      try {
        const reader = flaskBody.getReader();
        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          controller.enqueue(value);
        }
        cleanup();
        controller.close();
      } catch {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

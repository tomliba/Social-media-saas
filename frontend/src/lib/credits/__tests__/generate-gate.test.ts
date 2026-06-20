import { describe, it, expect, beforeEach, vi } from "vitest";

// ── In-memory Prisma (credit fns run for real against it), extended for the
//    generate-gate path: contentItem.findUnique/create + a jobId-prefix count. ──
const store = vi.hoisted(() => ({
  users: new Map<string, { id: string; creditBalance: number; plan: string; subscriptionStatus?: string | null }>(),
  txs: [] as Array<{ id: string; userId: string; delta: number; balanceAfter: number; type: string; reason: string | null; jobId: string | null; externalEventId: string | null; createdAt: Date }>,
  items: [] as Array<{ id: string; userId: string; jobId: string; status: string; title: string; format: string; templateId: string | null; createdAt: Date }>,
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    $queryRaw: async (_s: TemplateStringsArray, userId: string) => {
      const u = store.users.get(userId);
      return u ? [{ creditBalance: u.creditBalance }] : [];
    },
    creditTransaction: {
      findUnique: async ({ where }: any) => {
        if (where.jobId_type) return store.txs.find((t) => t.jobId === where.jobId_type.jobId && t.type === where.jobId_type.type) ?? null;
        if ("externalEventId" in where) return store.txs.find((t) => t.externalEventId === where.externalEventId) ?? null;
        return null;
      },
      findFirst: async ({ where }: any) => store.txs.find((t) => t.jobId === where.jobId && t.delta < 0) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `tx_${store.txs.length + 1}`, reason: null, jobId: null, externalEventId: null, createdAt: new Date(), ...data };
        store.txs.push(row);
        return row;
      },
      count: async ({ where }: any) =>
        store.txs.filter((t) => {
          if (where?.jobId?.startsWith) return (t.jobId ?? "").startsWith(where.jobId.startsWith);
          if (where?.userId) return t.userId === where.userId;
          return true;
        }).length,
    },
    user: {
      update: async ({ where, data }: any) => { const u = store.users.get(where.id); if (u) Object.assign(u, data); return u ? { ...u } : null; },
      findUnique: async ({ where }: any) => { const u = store.users.get(where.id); return u ? { ...u } : null; },
      findUniqueOrThrow: async ({ where }: any) => { const u = store.users.get(where.id); if (!u) throw new Error("User not found"); return { ...u }; },
    },
    contentItem: {
      findUnique: async ({ where }: any) => store.items.find((i) => i.jobId === where.jobId) ?? null,
      create: async ({ data }: any) => { const row = { id: `item_${store.items.length + 1}`, createdAt: new Date(), ...data }; store.items.push(row); return row; },
    },
  };
  return { prisma: { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { POST as generateSceneImages } from "@/app/api/generate-scene-images/route";
import { chargeVideo } from "@/app/actions/charge-render";
import { chargeStoryGenerate, chargeAnimationSurcharge, chargeSceneRegen, SCENE_REGEN_FREE_CAP, SCENE_REGEN_COST } from "@/lib/credits/generate-gate";
import { videoCost } from "@/lib/credits/config";

const mockedAuth = vi.mocked(auth);

function seedUser(id: string, balance: number, plan = "pro") {
  store.users.set(id, { id, creditBalance: balance, plan, subscriptionStatus: plan === "free" ? null : "active" });
}
const balanceOf = (id: string) => store.users.get(id)!.creditBalance;
const asSession = (id: string) => ({ user: { id } }) as unknown as Awaited<ReturnType<typeof auth>>;
const req = (body: unknown) => ({ json: async () => body }) as unknown as Parameters<typeof generateSceneImages>[0];
const flaskOk = () => vi.fn(async () => new Response(JSON.stringify({ image_urls: [] }), { status: 200 }));

beforeEach(() => {
  store.users.clear(); store.txs.length = 0; store.items.length = 0;
  vi.unstubAllGlobals();
  mockedAuth.mockReset();
  mockedAuth.mockResolvedValue(asSession("u1"));
  process.env.FLASK_API_URL = "http://flask.test";
  delete process.env.FLASK_API_KEY;
});

const BASE_30 = videoCost("ai_story", 30); // static base for a 30s AI Story

describe("generate-scene-images charge gate (the leak fix)", () => {
  it("does NOT call the Flux provider when the user can't afford the base — no free generation", async () => {
    seedUser("u1", BASE_30 - 1);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));

    expect(res.status).toBe(402);
    expect(fetchSpy).not.toHaveBeenCalled();   // the paid provider is never reached
    expect(balanceOf("u1")).toBe(BASE_30 - 1); // nothing charged
  });

  it("charges the base BEFORE the Flux call (server-side, so a tab-close can't skip it)", async () => {
    seedUser("u1", 100);
    let balanceWhenFlaskCalled = -1;
    vi.stubGlobal("fetch", vi.fn(async () => {
      balanceWhenFlaskCalled = balanceOf("u1"); // snapshot at the moment the provider is hit
      return new Response(JSON.stringify({ image_urls: [] }), { status: 200 });
    }));

    const res = await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));

    expect(res.status).toBe(200);
    expect(balanceWhenFlaskCalled).toBe(100 - BASE_30); // already debited before the provider ran
    expect(balanceOf("u1")).toBe(100 - BASE_30);
    // the debit is committed in the route itself — there is no client step to skip
    expect(store.txs.filter((t) => t.jobId === "vg1" && t.delta < 0)).toHaveLength(1);
  });

  it("anchors a 'preparing' ContentItem at the charge so reconcile can refund an abandoned job", async () => {
    seedUser("u1", 100);
    vi.stubGlobal("fetch", flaskOk());
    await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));
    expect(store.items.find((i) => i.jobId === "vg1")?.status).toBe("preparing");
  });
});

describe("no double charge across Generate → Preview/Export", () => {
  it("Preview/Export re-charge on the same vg_job_id is an idempotent no-op", async () => {
    seedUser("u1", 100);
    vi.stubGlobal("fetch", flaskOk());

    await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));
    const afterGenerate = balanceOf("u1");
    expect(afterGenerate).toBe(100 - BASE_30);

    // Preview/Export does exactly this: chargeVideo on the same vg_job_id.
    const preview = await chargeVideo({ jobId: "vg1", format: "ai_story", durationSeconds: 30 });
    expect(preview.ok).toBe(true);

    expect(balanceOf("u1")).toBe(afterGenerate); // not charged again
    expect(store.txs.filter((t) => t.jobId === "vg1" && t.delta < 0)).toHaveLength(1); // one debit total
  });

  it("a retried generate-scene-images call does not double-charge", async () => {
    seedUser("u1", 100);
    vi.stubGlobal("fetch", flaskOk());
    await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));
    await generateSceneImages(req({ vg_job_id: "vg1", style: "ai-story", duration: 30, scenes: [{}] }));
    expect(balanceOf("u1")).toBe(100 - BASE_30);
    expect(store.txs.filter((t) => t.jobId === "vg1" && t.delta < 0)).toHaveLength(1);
  });
});

describe("scene-image regen cap (3 free, then charge)", () => {
  it("allows SCENE_REGEN_FREE_CAP free regens then charges per regen", async () => {
    seedUser("u1", 100);
    for (let i = 0; i < SCENE_REGEN_FREE_CAP; i++) {
      const r = await chargeSceneRegen({ userId: "u1", vgJobId: "vg1" });
      expect(r).toMatchObject({ ok: true, charged: false, cost: 0 });
    }
    expect(balanceOf("u1")).toBe(100); // first 3 free

    const paid = await chargeSceneRegen({ userId: "u1", vgJobId: "vg1" });
    expect(paid).toMatchObject({ ok: true, charged: true, cost: SCENE_REGEN_COST });
    expect(balanceOf("u1")).toBe(100 - SCENE_REGEN_COST);
  });
});

describe("animation surcharge", () => {
  it("base + surcharge equals the full animated cost, and is Pro-gated", async () => {
    seedUser("u1", 1000, "pro");
    await chargeStoryGenerate({ userId: "u1", vgJobId: "vg1", style: "ai-story", durationSeconds: 30 });
    expect(balanceOf("u1")).toBe(1000 - BASE_30);

    const sur = await chargeAnimationSurcharge({ userId: "u1", vgJobId: "vg1", style: "ai-story", durationSeconds: 30 });
    expect(sur.ok).toBe(true);
    expect(balanceOf("u1")).toBe(1000 - videoCost("animated_story", 30)); // base + surcharge == animated

    seedUser("u2", 1000, "free");
    const blocked = await chargeAnimationSurcharge({ userId: "u2", vgJobId: "vg2", style: "ai-story", durationSeconds: 30 });
    expect(blocked).toMatchObject({ ok: false, error: "plan_not_allowed" });
  });
});

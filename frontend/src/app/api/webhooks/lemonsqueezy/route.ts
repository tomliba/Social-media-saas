import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";
import {
  PLAN_MONTHLY_CREDITS,
  planForSubscriptionVariant,
  topUpPackForVariant,
  type PlanName,
} from "@/lib/credits/config";

// Lemon Squeezy posts raw JSON and signs it with HMAC-SHA256 (hex) in the
// `X-Signature` header. We must read the RAW body to verify the signature.
export const dynamic = "force-dynamic";

interface LSCustomData {
  user_id?: string;
}

interface LSPayload {
  meta?: { event_name?: string; custom_data?: LSCustomData };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
}

async function findUser(customerId: unknown, customData?: LSCustomData) {
  if (customData?.user_id) {
    const u = await prisma.user.findUnique({ where: { id: customData.user_id } });
    if (u) return u;
  }
  if (customerId !== undefined && customerId !== null) {
    return prisma.user.findFirst({
      where: { lemonSqueezyCustomerId: String(customerId) },
    });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (
    !verifyLemonSqueezySignature(
      rawBody,
      signature,
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LSPayload;
  try {
    payload = JSON.parse(rawBody) as LSPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  const customData = payload.meta?.custom_data;
  const data = payload.data;
  const attrs = (data?.attributes ?? {}) as Record<string, unknown>;
  // Unique per delivery resource; prefix with event name to avoid id collisions
  // across resource types (subscription vs order vs invoice).
  const externalEventId = `${eventName}:${data?.id ?? "unknown"}`;

  if (!eventName) {
    return NextResponse.json({ error: "Missing event_name" }, { status: 400 });
  }

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) break; // unknown user — ack so LS stops retrying

        const variantId = attrs.variant_id != null ? String(attrs.variant_id) : "";
        const plan: PlanName = planForSubscriptionVariant(variantId) ?? "free";
        const renewsAt = attrs.renews_at ? new Date(String(attrs.renews_at)) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            subscriptionStatus: attrs.status ? String(attrs.status) : null,
            lemonSqueezySubscriptionId: data?.id ?? user.lemonSqueezySubscriptionId,
            lemonSqueezyCustomerId:
              attrs.customer_id != null
                ? String(attrs.customer_id)
                : user.lemonSqueezyCustomerId,
            currentPeriodEnd: renewsAt,
          },
        });
        // NOTE: no credit grant here — grants happen on payment_success only.
        break;
      }

      case "subscription_payment_success": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) break;

        // Grant the user's current plan allotment. The plan is set by the
        // subscription_created/updated event. Fires on first + recurring
        // payments — the single source of credit grants (prevents double-grant).
        const plan = (user.plan as PlanName) ?? "free";
        const amount = PLAN_MONTHLY_CREDITS[plan] ?? 0;
        if (amount > 0) {
          await grantCredits({
            userId: user.id,
            amount,
            type: "subscription_grant",
            externalEventId,
            reason: `${plan} monthly credits`,
          });
        }
        break;
      }

      case "order_created": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) break;

        // Only credit packs grant here; subscription orders are handled above.
        const variantId =
          attrs.first_order_item != null &&
          typeof attrs.first_order_item === "object"
            ? String(
                (attrs.first_order_item as Record<string, unknown>).variant_id ?? ""
              )
            : attrs.variant_id != null
              ? String(attrs.variant_id)
              : "";
        const pack = topUpPackForVariant(variantId);
        if (pack) {
          await grantCredits({
            userId: user.id,
            amount: pack.credits,
            type: "topup",
            externalEventId,
            reason: pack.label,
          });
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) break;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: "free",
            subscriptionStatus: attrs.status ? String(attrs.status) : eventName,
          },
        });
        // Leave existing balance untouched.
        break;
      }

      default:
        // Unhandled event — acknowledge so LS doesn't retry.
        break;
    }
  } catch (err) {
    console.error("Lemon Squeezy webhook handler error:", err);
    // 500 so LS retries — our grants are idempotent on externalEventId.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

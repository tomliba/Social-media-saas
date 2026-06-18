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
import type { Prisma } from "@prisma/client";

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

/** Best-effort append to the webhook log; never let logging break the ack. */
async function logWebhookEvent(row: {
  eventName: string;
  resourceId: string | null;
  userId: string | null;
  rawPayload: Prisma.InputJsonValue;
  signatureValid: boolean;
  handled: boolean;
  grantedCreditTxId: string | null;
  error: string | null;
}) {
  try {
    await prisma.webhookEvent.create({ data: row });
  } catch (err) {
    console.error("Failed to write WebhookEvent log row:", err);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  const signatureValid = verifyLemonSqueezySignature(
    rawBody,
    signature,
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  );

  // Try to parse for logging purposes regardless of signature/handling outcome.
  let payload: LSPayload | null = null;
  try {
    payload = JSON.parse(rawBody) as LSPayload;
  } catch {
    payload = null;
  }

  const eventName = payload?.meta?.event_name;
  const customData = payload?.meta?.custom_data;
  const data = payload?.data;
  const attrs = (data?.attributes ?? {}) as Record<string, unknown>;
  const resourceId = data?.id ?? null;
  // Unique per delivery resource; prefix with event name to avoid id collisions
  // across resource types (subscription vs order vs invoice).
  const externalEventId = `${eventName}:${data?.id ?? "unknown"}`;

  // ── Bad signature: reject without logging. The webhook URL is public, so
  // logging unsigned hits would just let anyone spam the table with useless,
  // payload-less rows. Only signature-verified events are recorded below.
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!payload) {
    await logWebhookEvent({
      eventName: "(unparseable)",
      resourceId: null,
      userId: null,
      rawPayload: {},
      signatureValid: true,
      handled: false,
      grantedCreditTxId: null,
      error: "invalid JSON",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!eventName) {
    await logWebhookEvent({
      eventName: "(missing)",
      resourceId,
      userId: null,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
      signatureValid: true,
      handled: false,
      grantedCreditTxId: null,
      error: "missing event_name",
    });
    return NextResponse.json({ error: "Missing event_name" }, { status: 400 });
  }

  // Outcome captured for the log row. The existing grant/update logic is
  // unchanged — we only record what happened around it.
  let handled = false;
  let handlerError: string | null = null;
  let grantedCreditTxId: string | null = null;
  let resolvedUserId: string | null = null;

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break; // unknown user — ack so LS stops retrying
        }
        resolvedUserId = user.id;

        const variantId = attrs.variant_id != null ? String(attrs.variant_id) : "";
        const plan: PlanName = planForSubscriptionVariant(variantId) ?? "free";
        const renewsAt = attrs.renews_at ? new Date(String(attrs.renews_at)) : null;
        // LS subscription objects carry a customer portal URL under attributes.urls.
        const urls = (attrs.urls ?? {}) as Record<string, unknown>;
        const portalUrl = urls.customer_portal ? String(urls.customer_portal) : null;

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
            // Keep the previous URL if this payload doesn't include one.
            customerPortalUrl: portalUrl ?? user.customerPortalUrl,
          },
        });
        // NOTE: no credit grant here — grants happen on payment_success only.
        handled = true;
        break;
      }

      case "subscription_payment_success": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;

        // Grant the user's current plan allotment. The plan is set by the
        // subscription_created/updated event. Fires on first + recurring
        // payments — the single source of credit grants (prevents double-grant).
        const plan = (user.plan as PlanName) ?? "free";
        const amount = PLAN_MONTHLY_CREDITS[plan] ?? 0;
        if (amount > 0) {
          const result = await grantCredits({
            userId: user.id,
            amount,
            type: "subscription_grant",
            externalEventId,
            reason: `${plan} monthly credits`,
          });
          grantedCreditTxId = result.transaction.id;
        }
        // Backstop: capture the portal URL if the invoice payload includes one
        // and we don't have it yet (normally set by subscription_created/updated).
        const invoiceUrls = (attrs.urls ?? {}) as Record<string, unknown>;
        if (invoiceUrls.customer_portal && !user.customerPortalUrl) {
          await prisma.user.update({
            where: { id: user.id },
            data: { customerPortalUrl: String(invoiceUrls.customer_portal) },
          });
        }
        handled = true;
        break;
      }

      case "order_created": {
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;

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
          const result = await grantCredits({
            userId: user.id,
            amount: pack.credits,
            type: "topup",
            externalEventId,
            reason: pack.label,
          });
          grantedCreditTxId = result.transaction.id;
        }
        // No pack match → a subscription order; grant happens on payment_success.
        handled = true;
        break;
      }

      case "subscription_cancelled": {
        // Cancellation is scheduled: the user keeps their paid plan and features
        // until the period actually ends (subscription_expired). Only mark status
        // and record the access-until date so the account page can show it.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        const endsAt = attrs.ends_at ?? attrs.renews_at;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: "cancelled",
            currentPeriodEnd: endsAt ? new Date(String(endsAt)) : user.currentPeriodEnd,
          },
        });
        handled = true;
        break;
      }

      case "subscription_expired": {
        // The real end of access — now drop to free.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "free", subscriptionStatus: "expired" },
        });
        handled = true;
        break;
      }

      case "subscription_paused": {
        // Paused: keep the plan record so resuming restores access, but suspend
        // entitlement via status (effectivePlan treats "paused" as not entitled).
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "paused" },
        });
        handled = true;
        break;
      }

      case "subscription_payment_failed": {
        // Dunning: keep access (still entitled) but flag past_due so the account
        // page reflects it. If dunning ultimately fails, subscription_expired
        // (handled above) drops the user to free.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "past_due" },
        });
        handled = true;
        break;
      }

      default:
        // Unhandled event — acknowledge so LS doesn't retry. handled stays false.
        break;
    }
  } catch (err) {
    console.error("Lemon Squeezy webhook handler error:", err);
    handlerError = err instanceof Error ? err.message : String(err);
  }

  await logWebhookEvent({
    eventName,
    resourceId,
    userId: resolvedUserId,
    rawPayload: payload as unknown as Prisma.InputJsonValue,
    signatureValid: true,
    handled,
    grantedCreditTxId,
    error: handlerError,
  });

  if (handlerError && handlerError !== "user not found") {
    // A genuine processing failure — 500 so LS retries (grants are idempotent
    // on externalEventId). "user not found" is not retryable, so we ack it 200.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

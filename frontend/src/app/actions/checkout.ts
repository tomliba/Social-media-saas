"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { PlanName } from "@/lib/credits/config";

// Lemon Squeezy subscription variant IDs by plan (mirror of
// LS_SUBSCRIPTION_VARIANTS). Free has no checkout — it routes to /signup.
const VARIANT_BY_PLAN: Partial<Record<PlanName, string>> = {
  creator: "1771372", // $24.99/mo
  pro: "1771393", // $59.99/mo
};

// Public store subdomain (<slug>.lemonsqueezy.com). Override per environment;
// "doctorcurses" is the current store slug.
const LS_STORE = process.env.LEMONSQUEEZY_STORE ?? "doctorcurses";

/**
 * Start a Lemon Squeezy hosted checkout for a paid plan.
 *
 * Used as a <form action={...}> on the pricing cards. Paid checkout is gated
 * behind login: unauthenticated users are sent to /login first. The user id is
 * passed as checkout custom data so it arrives in the webhook's
 * meta.custom_data.user_id — that's what findUser() reads to attach the
 * subscription (and its credit grant) to the right account.
 */
export async function startSubscriptionCheckout(formData: FormData) {
  const plan = String(formData.get("plan") || "") as PlanName;
  const variantId = VARIANT_BY_PLAN[plan];
  if (!variantId) {
    throw new Error(`startSubscriptionCheckout: no checkout variant for plan "${plan}"`);
  }

  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/login?callbackUrl=/pricing");
  }

  const params = new URLSearchParams();
  if (user.email) params.set("checkout[email]", user.email);
  params.set("checkout[custom][user_id]", user.id);
  params.set("checkout[custom][plan]", plan);

  redirect(`https://${LS_STORE}.lemonsqueezy.com/checkout/buy/${variantId}?${params.toString()}`);
}

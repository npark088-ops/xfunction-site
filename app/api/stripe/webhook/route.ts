import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { captureServerEvent } from "../../../../lib/posthog-server";

// No signed-in user hits this route — Stripe calls it directly — so it
// uses the plain anon-key client and the SECURITY DEFINER RPCs from
// supabase/migrations/0003_stripe_webhook.sql instead of the normal
// cookie-based server client.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    console.error("Stripe webhook hit but STRIPE_WEBHOOK_SECRET isn't set.");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (userId && customerId) {
      const { error } = await supabase.rpc("set_pro_on_checkout", {
        p_user_id: userId,
        p_customer_id: customerId,
        p_subscription_id: subscriptionId ?? null,
      });
      if (error) console.error("set_pro_on_checkout failed:", error);
      else captureServerEvent(userId, "pro_upgraded");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

    if (customerId) {
      const { error } = await supabase.rpc("set_pro_on_cancellation", {
        p_customer_id: customerId,
      });
      if (error) console.error("set_pro_on_cancellation failed:", error);
    }
  }

  return Response.json({ received: true });
}

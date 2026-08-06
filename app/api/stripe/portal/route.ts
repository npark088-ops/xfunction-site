import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

// Opens Stripe's hosted billing portal, where a Pro user can update
// their card, view invoices, or cancel — Stripe handles all of that
// UI itself, so this route only needs to look up the caller's
// stripe_customer_id (set by the webhook on checkout, see
// supabase/migrations/0003_stripe_webhook.sql) and start a session.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: "Payments aren't set up yet — Stripe env vars are missing from the server." },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: "No billing account found for this user yet." }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal session creation failed:", error);
    return Response.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}

import Stripe from "stripe";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return Response.json(
      { error: "Payments aren't set up yet — Stripe env vars are missing from the server." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // Lets the webhook (which has no user session of its own) know
      // which xFunction account just paid — see app/api/stripe/webhook.
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${origin}/settings?upgraded=1`,
      cancel_url: `${origin}/settings?upgrade_canceled=1`,
    });

    if (!session.url) {
      return Response.json({ error: "Failed to start checkout" }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return Response.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}

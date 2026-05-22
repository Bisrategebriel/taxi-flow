// FR-PA-02..05, NFR-SE-07
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const { tripId } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trip } = await supabase
    .from("trips")
    .select("id, fare_amount, status, user_id")
    .eq("id", tripId)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["completed", "payment_pending"].includes(trip.status)) {
    return NextResponse.json({ error: "Trip cannot be paid" }, { status: 400 });
  }

  if (trip.status === "completed") {
    await supabase
      .from("trips")
      .update({ status: "payment_pending" })
      .eq("id", tripId);
  }

  const total = Number(trip.fare_amount ?? 0);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      // TODO: switch to 'etb' once Ethiopian Birr is enabled on the Stripe account
      currency: "usd",
      metadata: { tripId, userId: user.id },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[payment-intent]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

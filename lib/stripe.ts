// FR-PA-01, NFR-SE-07
import Stripe from "stripe";

// Fall back to a non-empty placeholder so the constructor doesn't throw when
// STRIPE_SECRET_KEY is absent at build time (e.g. Vercel preview builds).
// The build and runtime are separate processes, so the real key from the
// environment is always used when route handlers actually execute.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "not_configured", {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

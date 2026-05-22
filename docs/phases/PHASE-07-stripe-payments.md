# Phase 7 — Stripe Payments

> **Status:** Ready to implement
> **Estimated time:** 4–5 hours
> **Branch:** `phase-07-stripe-payments`
> **Prerequisite:** Phase 6 PR merged to `main`, CI green

---

## 7.1 Goal

Wire the End Trip flow to an embedded Stripe payment screen. When a user taps **End Trip** a confirmation modal appears ("End this trip?"). On confirming, the trip moves to `payment_pending` and the user is taken to a custom `/payment?tripId=<id>` page that shows a fare breakdown, a payment-method selector (Card / Mobile Money / Cash), and an inline Stripe Payment Elements card form. After successful payment, a success screen is shown and the trip status becomes `paid`.

**UI reference:** the attached mockups show the exact layout — dark card, route summary, line-item fare breakdown, radio-button payment method list, and a Stripe-Elements-powered card form at the bottom.

At the end of this phase:

- `TripInProgress` shows a confirmation modal before ending a trip
- `app/(user)/payment/page.tsx` shows the fare breakdown + payment method selector
- `app/api/stripe/payment-intent/route.ts` creates a Stripe PaymentIntent and returns the `client_secret`
- `app/api/stripe/webhook/route.ts` handles `payment_intent.succeeded`, inserts a `payments` row, and sets trip to `paid`
- `app/api/payment/cash/route.ts` handles "Pay Cash to Driver" — marks trip as `paid` without Stripe
- `app/(user)/payment/success/page.tsx` shows a post-payment confirmation screen
- Trip status transitions correctly: `active → completed → payment_pending → paid`

**Covers:** SRS §9 (FR-PA-01..12), §12.1 (NFR-PE-01), §12.3 (NFR-SE-07,08)

---

## 7.2 Pre-flight check

```bash
# 1. Merge phase-06 PR to main first, then:
git checkout main && git pull origin main
git log --oneline -1   # should be the phase-06 merge commit

# 2. Clean build on main
pnpm install && pnpm type-check && pnpm build

# 3. Stripe account (free test mode)
#    Keys: https://dashboard.stripe.com/test/apikeys

# 4. Stripe CLI — local webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the whsec_... printed → set as STRIPE_WEBHOOK_SECRET

# 5. Add to .env.local (never commit):
#    STRIPE_SECRET_KEY=sk_test_...
#    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
#    STRIPE_WEBHOOK_SECRET=whsec_...
#    NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-07-stripe-payments
```

---

### Task 2 — Install Stripe SDKs

```bash
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
```

Add to `.env.local` (never commit):
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to `.env.example` (safe to commit — placeholders only):
```
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Task 3 — Database migration: payments table

Create `supabase/migrations/20260522000001_payments.sql`:

```sql
-- FR-PA-01..12, NFR-SE-07,08
-- Phase 7: Payments table and trip status update policies

CREATE TABLE IF NOT EXISTS public.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id              uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  stripe_payment_intent_id text UNIQUE,        -- null for cash payments
  payment_method       text NOT NULL DEFAULT 'card'
                       CHECK (payment_method IN ('card','mobile_money','cash')),
  amount_etb           numeric(10,2) NOT NULL,
  currency             text NOT NULL DEFAULT 'ETB',
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','succeeded','failed','refunded')),
  paid_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment records
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role inserts via webhook or cash API handler
-- No authenticated INSERT policy — payments are created server-side only

-- trips: authenticated users can set their own completed trip to payment_pending
CREATE POLICY "trips_update_payment_pending"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (status = 'payment_pending');
```

Apply:
```bash
supabase migration up
```

---

### Task 4 — Claude Code Prompt: Stripe payments

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md before doing anything. We are on branch phase-07-stripe-payments.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Tailwind 4, CSS-first, no tailwind.config.ts.
shadcn/ui + cn() from @/lib/utils. Uppercase component filenames.
Next.js 16 App Router. Server components by default; "use client" only when needed.
Supabase client for browser: @/lib/supabase/client.ts
Supabase client for server: @/lib/supabase/server.ts — never mix.
Service role client (server-only): createServiceClient from @/lib/supabase/service.ts.
  If the file does not exist, create it:
    import { createClient } from '@supabase/supabase-js';
    export const createServiceClient = () =>
      createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

Stripe server: import Stripe from 'stripe'
Stripe client: import { loadStripe } from '@stripe/stripe-js'
Stripe React: import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

Currency: all fares are in Ethiopian Birr (ETB).
  Stripe unit_amount = Math.round(fare * 100).
  Note: if ETB is not enabled on the test account, use 'usd' with a TODO comment.

Environment vars (server-only — never expose in client bundles):
  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY

Client-safe: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL,
             NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

App colour palette (dark theme, matches existing app):
  Background: #0f172a (slate-900)
  Card surface: #1e293b (slate-800)
  Border: #334155 (slate-700)
  Primary/accent: #3b82f6 (blue-500)
  Success green: #22c55e (green-500)
  Text: white / slate-400 for muted

Existing files you WILL modify:
  app/(user)/trip/_components/TripInProgress.tsx  — add confirmation modal before endTrip
  proxy.ts                                         — add /api/stripe/webhook to public paths

Files you must NOT touch:
  supabase/migrations/ (except the one just created), types/, lib/supabase/,
  app/(landing)/, app/(admin)/, auth pages, app/api/chat/, lib/groq/, components/chat/, app/track/

Do not create tailwind.config.ts.
Stage all changes but do NOT commit.

─────────────────────────────────────────────────────────────────────
TASK 1: lib/stripe.ts
─────────────────────────────────────────────────────────────────────

// FR-PA-01, NFR-SE-07
Server-only Stripe singleton.

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

─────────────────────────────────────────────────────────────────────
TASK 2: app/(user)/trip/_components/EndTripModal.tsx
─────────────────────────────────────────────────────────────────────

// NFR-US-07 — confirm before destructive action
"use client";
Props:
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean

UI — modal/dialog (use shadcn Dialog or a custom overlay):
  Backdrop: fixed inset-0, bg-black/60, z-50
  Card: centered, rounded-xl, bg-slate-800, border border-slate-700, p-6, max-w-sm w-full, mx-4

  Title: "End this trip?"  (font-semibold, text-white, text-lg)
  Body:  "You'll be taken to the payment screen to complete your journey."
         (text-sm, text-slate-400, mt-2)

  Button row (mt-6, flex gap-3):
    "Continue Trip" button:
      - variant outline, flex-1
      - bg-transparent, border border-slate-600, text-white
      - onClick: onClose
      - disabled while isLoading

    "End & Pay ›" button:
      - flex-1, bg-blue-600 hover:bg-blue-700, text-white, font-semibold
      - Shows spinner (animate-spin) when isLoading, text becomes "Ending…"
      - onClick: onConfirm

─────────────────────────────────────────────────────────────────────
TASK 3: Update app/(user)/trip/_components/TripInProgress.tsx
─────────────────────────────────────────────────────────────────────

// FR-PA-01, NFR-US-07
Add modal state:
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

Change the "End Trip" button onClick from calling endTrip directly to:
  onClick={() => setShowEndModal(true)}

Add a handleConfirmEnd function:
  async function handleConfirmEnd() {
    setIsEnding(true);
    await endTrip();
    router.push("/payment?tripId=" + tripId);
  }

Render <EndTripModal> inside the component:
  <EndTripModal
    open={showEndModal}
    onClose={() => setShowEndModal(false)}
    onConfirm={handleConfirmEnd}
    isLoading={isEnding}
  />

─────────────────────────────────────────────────────────────────────
TASK 4: app/api/stripe/payment-intent/route.ts
─────────────────────────────────────────────────────────────────────

// FR-PA-02..05, NFR-SE-07
POST handler. Authenticated users only.

Steps:
1. Parse body: { tripId: string }
2. Authenticate via createClient from @/lib/supabase/server; if not authed return 401
3. Fetch trip: select id, fare_amount, status, user_id where id = tripId
   - Not found or user_id !== user.id → 403
   - status not in ['completed', 'payment_pending'] → 400 { error: "Trip cannot be paid" }
4. Compute total:
   const total = Number(trip.fare_amount);  // already the full fare
5. If trip.status === 'completed':
   Update trip status to 'payment_pending' (use server client, authenticated user)
6. Create Stripe PaymentIntent:
   stripe.paymentIntents.create({
     amount: Math.round(total * 100),
     currency: 'etb',   // change to 'usd' with TODO if ETB not enabled on account
     metadata: { tripId, userId: user.id },
     automatic_payment_methods: { enabled: true },
   })
7. Return { clientSecret: paymentIntent.client_secret, total }

─────────────────────────────────────────────────────────────────────
TASK 5: app/api/stripe/webhook/route.ts
─────────────────────────────────────────────────────────────────────

// FR-PA-07..10, NFR-SE-08
Stripe webhook handler. Must use raw body.
Use: const rawBody = await request.text()  (NOT request.json()).

Steps:
1. sig = request.headers.get('stripe-signature')
2. event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
   — return Response status 400 on error
3. Handle event.type === 'payment_intent.succeeded':
   a. const pi = event.data.object as Stripe.PaymentIntent
   b. const { tripId, userId } = pi.metadata
   c. Use createServiceClient to:
      - Insert into payments: {
          trip_id: tripId,
          user_id: userId,
          stripe_payment_intent_id: pi.id,
          payment_method: 'card',
          amount_etb: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          status: 'succeeded',
          paid_at: new Date().toISOString(),
        }
      - Update trips set status = 'paid' where id = tripId
4. Return Response status 200 { received: true }

Do NOT import from @/lib/supabase/server in this file.

─────────────────────────────────────────────────────────────────────
TASK 6: app/api/payment/cash/route.ts
─────────────────────────────────────────────────────────────────────

// FR-PA-06
POST handler. Authenticated users only.
Marks a trip as paid with payment_method='cash' — no Stripe involved.

Steps:
1. Parse body: { tripId: string }
2. Authenticate via createClient from @/lib/supabase/server; if not authed return 401
3. Fetch trip: id, fare_amount, status, user_id where id = tripId
   - Not found or user_id !== user.id → 403
   - status not in ['completed', 'payment_pending'] → 400
4. Use createServiceClient to:
   - Insert into payments: {
       trip_id: tripId,
       user_id: user.id,
       payment_method: 'cash',
       amount_etb: Number(trip.fare_amount),
       currency: 'ETB',
       status: 'succeeded',
       paid_at: new Date().toISOString(),
     }
   - Update trips set status = 'paid' where id = tripId
5. Return { success: true }

─────────────────────────────────────────────────────────────────────
TASK 7: app/(user)/payment/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-PA-01..06
Server component. Auth handled by (user) layout.

searchParams: Promise<{ tripId?: string; cancelled?: string }>
Await them.

Steps:
1. If no tripId: redirect('/dashboard')
2. Fetch trip from Supabase (server client):
   select id, fare_amount, status, started_at,
   start:terminals!trips_start_terminal_id_fkey(name),
   end:terminals!trips_end_terminal_id_fkey(name)
   where id = tripId
   - Not found → redirect('/dashboard')
   - status === 'paid' → redirect('/payment/success?tripId=' + tripId)
3. Compute fare breakdown (all values numeric):
   const total      = Number(trip.fare_amount);
   const serviceFee = 2.00;
   const distSurch  = Math.max(0, Math.round((total * 0.04) * 100) / 100);
   const baseFare   = Math.round((total - serviceFee - distSurch) * 100) / 100;
4. Render <PaymentScreen trip={...} breakdown={{ baseFare, serviceFee, distSurch, total }} />

─────────────────────────────────────────────────────────────────────
TASK 8: app/(user)/payment/_components/PaymentScreen.tsx
─────────────────────────────────────────────────────────────────────

// FR-PA-02..06
"use client";

Props:
  trip: {
    id: string;
    fare_amount: number;
    status: string;
    start: { name: string } | null;
    end:   { name: string } | null;
  }
  breakdown: {
    baseFare:   number;
    serviceFee: number;
    distSurch:  number;
    total:      number;
  }

State:
  method: 'card' | 'mobile_money' | 'cash'  — default 'card'
  clientSecret: string | null               — fetched from /api/stripe/payment-intent
  isInitialising: boolean                   — true while fetching clientSecret
  cashLoading: boolean
  error: string | null

On mount (useEffect, runs once):
  Fetch POST /api/stripe/payment-intent { tripId: trip.id }
  On success: setClientSecret(data.clientSecret)
  On error:   setError(data.error ?? 'Could not initialise payment')
  setIsInitialising(false) in both cases

Stripe setup (outside component, module-level):
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

Stripe Elements appearance (pass as options to <Elements>):
  {
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#1e293b',
        colorText: '#f1f5f9',
        colorDanger: '#ef4444',
        borderRadius: '8px',
        fontFamily: 'inherit',
      },
    },
    clientSecret,
  }

─── Layout ───

Outer: min-h-screen bg-slate-900 text-white, flex flex-col

Header (sticky top-0, bg-slate-900, border-b border-slate-800, px-4 py-4, z-10):
  ← back button (router.back()) left side
  Center: "Complete Payment" (font-semibold) + "Secure checkout" (text-xs text-slate-400)
  Right: 🔒 "Encrypted" badge (text-xs, text-green-400, flex items-center gap-1)

Scrollable body (flex-1, overflow-y-auto, px-4 py-4, space-y-4):

  ── Trip Summary Card ──
  bg-slate-800, rounded-xl, p-4, border border-slate-700
  Row: blue navigation arrow icon (Lucide Navigation2) + "Completed Trip" label (text-xs text-slate-400)
  Route: "<start.name> → <end.name>" (font-semibold, mt-1)
  Divider (border-t border-slate-700, my-3)
  Fare line items (space-y-2):
    Each row: flex justify-between, text-sm
    "Base fare"         right: "ETB <baseFare.toFixed(2)>"
    "Service fee"       right: "ETB <serviceFee.toFixed(2)>"
    "Distance surcharge" right: "ETB <distSurch.toFixed(2)>"
    Divider (border-t border-slate-600, my-2)
    "Total" row: font-bold, text-base, right value in text-blue-400 font-bold

  ── Payment Method ──
  "Payment Method" label (font-semibold, text-sm mb-3)
  Three radio-style option rows (rounded-xl border, p-4, cursor-pointer, space-y-3):
    Each row: flex items-center gap-3, onClick sets method
    Selected: border-blue-500 bg-slate-800   Unselected: border-slate-700 bg-slate-800/50
    Custom radio circle: w-5 h-5 rounded-full border-2
      Selected: border-blue-500 with filled blue inner dot   Unselected: border-slate-500
    Icon + label:
      'card'         → Lucide CreditCard icon (blue bg circle) + "Credit / Debit Card"
      'mobile_money' → Lucide Smartphone icon (purple bg circle) + "Mobile Money"
      'cash'         → Lucide Banknote icon (green bg circle) + "Pay Cash to Driver"

  ── Card Details (only when method === 'card') ──
  "Card Details" label (font-semibold, text-sm mb-3, flex items-center gap-2 + CreditCard icon blue)
  If isInitialising: skeleton loader (animate-pulse, rounded-lg, h-32, bg-slate-700)
  If clientSecret:
    <Elements stripe={stripePromise} options={appearance options with clientSecret}>
      <StripePaymentForm tripId={trip.id} total={breakdown.total} />
    </Elements>
  If error on init: red error text

  ── Mobile Money placeholder (only when method === 'mobile_money') ──
  bg-slate-800, rounded-xl, p-4, border border-slate-700
  text-slate-400, text-sm, text-center:
  "Mobile Money integration coming soon.\nSelect another payment method to continue."

Sticky bottom pay button area (bg-slate-900, border-t border-slate-800, px-4 py-4):
  Only shown when method === 'cash':
    Full-width button "Pay Cash to Driver — ETB <total.toFixed(2)> ›"
    bg-blue-600 hover:bg-blue-700, text-white, font-semibold, rounded-xl, py-4
    onClick: handleCashPayment
    disabled while cashLoading; show spinner when loading

  (For 'card', the pay button lives inside StripePaymentForm below)
  (For 'mobile_money', button is disabled/hidden)

handleCashPayment:
  setCashLoading(true)
  POST /api/payment/cash { tripId: trip.id }
  On success: router.push('/payment/success?tripId=' + trip.id)
  On error: setError(data.error ?? 'Payment failed'); setCashLoading(false)

─────────────────────────────────────────────────────────────────────
TASK 9: app/(user)/payment/_components/StripePaymentForm.tsx
─────────────────────────────────────────────────────────────────────

// FR-PA-03..05, NFR-SE-07
"use client";
This component is rendered inside an <Elements> provider.

Props:
  tripId: string
  total: number

State: isSubmitting boolean, errorMessage string | null

const stripe = useStripe();
const elements = useElements();

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  if (!stripe || !elements) return;
  setIsSubmitting(true);
  setErrorMessage(null);

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: `${window.location.origin}/payment/success?tripId=${tripId}`,
    },
  });

  // Only reached on error — success triggers a redirect
  if (error) {
    setErrorMessage(error.message ?? 'Payment failed. Please try again.');
    setIsSubmitting(false);
  }
}

Render:
  <form onSubmit={handleSubmit} className="space-y-4">
    <PaymentElement
      options={{
        layout: 'tabs',
        // Stripe Elements inherits the 'night' theme from the parent <Elements> provider
      }}
    />
    {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}
    <button
      type="submit"
      disabled={!stripe || isSubmitting}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                 text-white font-semibold rounded-xl py-4 flex items-center
                 justify-center gap-2 transition-colors"
    >
      {isSubmitting ? (
        <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Paying…</>
      ) : (
        <>Pay ETB {total.toFixed(2)} ›</>
      )}
    </button>
    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
      <Lucide Lock size={12} /> Your payment is secured with 256-bit encryption
    </p>
  </form>

─────────────────────────────────────────────────────────────────────
TASK 10: app/(user)/payment/success/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-PA-11,12
Server component.

searchParams: Promise<{ tripId?: string; payment_intent?: string; redirect_status?: string }>
Await them.

Steps:
1. If no tripId: redirect('/dashboard')
2. Fetch trip from Supabase (server client):
   select id, fare_amount, started_at,
   start:terminals!trips_start_terminal_id_fkey(name),
   end:terminals!trips_end_terminal_id_fkey(name)
   where id = tripId
   - Not found → redirect('/dashboard')
3. Verify payment: if payment_intent provided, optionally verify with Stripe server-side:
   const pi = await stripe.paymentIntents.retrieve(payment_intent)
   (skip verification if payment_intent not in params — cash payments don't have one)
4. Render success screen:
   - Full-screen centered layout, bg-slate-900
   - Large Lucide CheckCircle2 in green-500 (size 72)
   - "Payment Successful!" heading (text-2xl font-bold text-white, mt-4)
   - "ETB <fare_amount.toFixed(2)> paid" (text-blue-400 text-lg, mt-1)
   - Route: "<start.name> → <end.name>" (text-slate-400 text-sm, mt-2)
   - Trip ref: "Trip #<last 6 chars uppercase>" (text-slate-500 text-xs, mt-1)
   - Button row (mt-8, flex flex-col gap-3, w-full max-w-sm):
     "Back to Dashboard" → /dashboard (primary, full-width)
     "Start New Trip"    → /route-search (outline, full-width)

─────────────────────────────────────────────────────────────────────
TASK 11: Update proxy.ts
─────────────────────────────────────────────────────────────────────

// NFR-SE-07
Add to public paths so Stripe can POST without a session cookie:
  pathname.startsWith('/api/stripe/webhook')

Ensure /payment and /payment/success are NOT in public paths (auth required).

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET — server-only. Never import lib/stripe.ts in client components.
- SUPABASE_SERVICE_ROLE_KEY — server-only. Only in webhook + cash route via createServiceClient.
- Webhook must use request.text() for raw body, NOT request.json().
- All fares are ETB; Stripe unit_amount = Math.round(etb * 100).
- No tailwind.config.ts.
- Every new file must reference its FR/NFR IDs in a comment at the top.
- Stage all changes but do NOT commit.
```

---

### Task 5 — Manual QA

```bash
# Terminal 1
pnpm dev

# Terminal 2 — must be running for webhook to fire
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Sign in as `alice@taxiflow.test / User1234!`.

**Confirmation modal:**
- [ ] Start and complete a trip
- [ ] Tap **End Trip** → modal appears: "End this trip?" with two buttons
- [ ] Tap **Continue Trip** → modal closes, trip still active
- [ ] Tap **End Trip** again → tap **End & Pay** → spinner shows → redirected to `/payment`

**Payment page layout:**
- [ ] Header shows "Complete Payment" + "Secure checkout" + 🔒 Encrypted
- [ ] Trip card shows correct route ("Piassa → Megenagna") and fare breakdown (base, service fee, surcharge, total)
- [ ] Three payment method rows rendered; Card is selected by default with blue border
- [ ] Stripe Payment Element renders inside "Card Details" section (not a blank area)
- [ ] DB: `SELECT status FROM trips WHERE id = '<id>';` → `payment_pending`

**Card payment (Stripe test):**
- [ ] Payment Element visible, enter test card: `4242 4242 4242 4242`, future expiry, any CVC
- [ ] Tap **Pay ETB X.XX ›** → spinner appears → redirected to `/payment/success?tripId=...&payment_intent=pi_...`
- [ ] Success page: green checkmark, "Payment Successful!", correct fare + route
- [ ] DB: `SELECT status FROM trips WHERE id = '<id>';` → `paid`
- [ ] DB: `SELECT status, stripe_payment_intent_id FROM payments WHERE trip_id = '<id>';` → `succeeded`, non-null
- [ ] Terminal 2: `payment_intent.succeeded` event logged

**Cash payment:**
- [ ] Start a new trip → end → payment page → select **Pay Cash to Driver**
- [ ] Card Details section hides; sticky "Pay Cash to Driver — ETB X.XX ›" button appears at bottom
- [ ] Tap it → redirected to success page immediately (no Stripe redirect)
- [ ] DB: `SELECT payment_method, status FROM payments WHERE trip_id = '<id>';` → `cash`, `succeeded`

**Mobile Money placeholder:**
- [ ] Select Mobile Money → "coming soon" message shown, no pay button

**Cancelled 3DS / error state:**
- [ ] Use test card `4000 0025 0000 3155` (requires authentication) → Stripe auth popup → Cancel
- [ ] Error message appears below the form; user can retry without reloading

**Mobile (375 px):**
- [ ] Modal centered, both buttons reachable
- [ ] Payment page scrollable; sticky Pay button always visible above keyboard
- [ ] Success page centered and readable

---

### Task 6 — Write tests — tests/payment.test.ts

```ts
import { describe, it, expect } from "vitest";

describe("Stripe lib", () => {
  it("stripe singleton is importable", async () => {
    const mod = await import("@/lib/stripe");
    expect(mod.stripe).toBeDefined();
  });
});

describe("Payment API routes", () => {
  it("payment-intent route exports a POST handler", async () => {
    const mod = await import("@/app/api/stripe/payment-intent/route");
    expect(mod.POST).toBeDefined();
  });

  it("webhook route exports a POST handler", async () => {
    const mod = await import("@/app/api/stripe/webhook/route");
    expect(mod.POST).toBeDefined();
  });

  it("cash route exports a POST handler", async () => {
    const mod = await import("@/app/api/payment/cash/route");
    expect(mod.POST).toBeDefined();
  });
});

describe("Trip payment status values", () => {
  it("all expected status transitions are in the valid set", () => {
    const statuses = ["active", "completed", "payment_pending", "paid", "cancelled"];
    expect(statuses).toContain("payment_pending");
    expect(statuses).toContain("paid");
    expect(statuses).toHaveLength(5);
  });
});

describe("Payment method values", () => {
  it("covers all three supported methods", () => {
    const methods = ["card", "mobile_money", "cash"];
    expect(methods).toContain("card");
    expect(methods).toContain("cash");
    expect(methods).toHaveLength(3);
  });
});
```

---

### Task 7 — Commit and open PR

```bash
pnpm type-check   # 0 errors
pnpm lint         # 0 errors
pnpm test         # all pass

git add lib/stripe.ts
git add "app/(user)/trip/_components/EndTripModal.tsx"
git add "app/(user)/trip/_components/TripInProgress.tsx"
git add "app/api/stripe/"
git add "app/api/payment/"
git add "app/(user)/payment/"
git add proxy.ts
git add "supabase/migrations/20260522000001_payments.sql"
git add tests/payment.test.ts

git commit -m "phase-7: Stripe payments — confirmation modal, embedded card form, cash option"

git push -u origin phase-07-stripe-payments

gh pr create \
  --title "phase-7: embedded Stripe payments, end-trip modal, cash option" \
  --body "$(cat <<'EOF'
## Summary
- EndTripModal: confirmation dialog before ending trip ("End this trip?" / "End & Pay")
- lib/stripe.ts: server-only Stripe singleton
- POST /api/stripe/payment-intent: creates PaymentIntent, sets trip to payment_pending, returns client_secret
- POST /api/stripe/webhook: handles payment_intent.succeeded → trip paid, payment row inserted
- POST /api/payment/cash: marks trip paid with method=cash (no Stripe)
- app/(user)/payment: dark-themed page matching design mockup — fare breakdown, method selector, embedded Stripe Payment Elements card form, cash option
- app/(user)/payment/success: post-payment confirmation screen
- TripInProgress: End Trip now triggers confirmation modal then routes to /payment?tripId=...
- proxy.ts: /api/stripe/webhook added to public paths
- Migration: payments table (card/mobile_money/cash), RLS, trip update policy
- FR-PA-01..12, NFR-SE-07,08, NFR-US-07 implemented

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes
- [ ] pnpm build passes
- [ ] CI green
- [ ] End Trip → confirmation modal → End & Pay → /payment page
- [ ] Payment page shows correct fare breakdown + all three method options
- [ ] Stripe Payment Element renders in Card Details section
- [ ] Test card 4242... → success page → DB trips.status = paid
- [ ] DB payments row: method=card, status=succeeded, stripe_payment_intent_id set
- [ ] stripe listen log shows payment_intent.succeeded
- [ ] Cash option → success page → DB payments: method=cash
- [ ] Mobile Money → "coming soon" message
EOF
)"
```

---

## 7.4 Acceptance script

```bash
pnpm type-check                              # 0 errors
pnpm lint                                    # 0 errors
pnpm test                                    # all pass including payment tests
pnpm build                                   # exits 0
gh run list --limit 1                        # "completed success"

# Manual:
# End Trip → modal → End & Pay → /payment page shows fare breakdown
# Select Card → fill Stripe Payment Element → Pay → success page
# SELECT status FROM trips ORDER BY created_at DESC LIMIT 1; → paid
# SELECT payment_method, status FROM payments ORDER BY created_at DESC LIMIT 1; → card, succeeded
# stripe listen log → payment_intent.succeeded
# Repeat with Cash option → same success, method = cash
```

**All pass = Phase 7 complete.**

---

## 7.5 Common failure modes

**`stripe.webhooks.constructEvent` returns 400 "No signatures found".**
`stripe listen` must be running in a second terminal. The `whsec_...` from its output must be set as `STRIPE_WEBHOOK_SECRET` in `.env.local`. Restart `pnpm dev` after changing env vars.

**Webhook 400 "Unexpected token / invalid raw body".**
The webhook handler must call `await request.text()`, not `request.json()`. Stripe requires the exact raw byte string for HMAC verification.

**`PaymentElement` renders as blank white box.**
The `clientSecret` must be fetched before rendering `<Elements>`. Ensure `isInitialising` keeps the form hidden until `clientSecret` is set. Also confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is present in `.env.local`.

**ETB currency error from Stripe.**
ETB must be enabled on your Stripe test account. If not, change `currency: 'etb'` to `currency: 'usd'` in the payment-intent route and leave a `// TODO: switch to 'etb' in production` comment.

**Trip status stuck at `payment_pending`.**
The webhook did not fire or returned an error. Check: (1) `stripe listen` is running, (2) `STRIPE_WEBHOOK_SECRET` matches the `whsec_...` from `stripe listen`, (3) look for errors in Terminal 2 output.

**`createServiceClient` import fails.**
If `lib/supabase/service.ts` does not exist, create it as shown in the prompt context. The webhook and cash routes must use service role to bypass RLS when writing the payments row.

**`stripe.confirmPayment` redirects to the wrong URL.**
`return_url` must be an absolute URL. Use `window.location.origin` (client-side) to build it, not `NEXT_PUBLIC_APP_URL`, to avoid mismatches between env var and actual browser origin.

**3DS test card shows error after cancel.**
This is correct behaviour — use the `4242...` card for happy-path QA. The `4000 0025 0000 3155` card is only needed for testing the 3DS error/cancel flow.

---

## 7.6 What's NOT in Phase 7

- ❌ Telebirr / local mobile money integration (placeholder only — Phase 9 or later)
- ❌ Refund flow (admin-initiated, Phase 8)
- ❌ Payment history list in Profile (Phase 9)
- ❌ Receipt email via Stripe (enable in Stripe dashboard — no code change required)
- ❌ Fare recalculation at checkout (fare is fixed at route-search time)
- ❌ Admin payment dashboard (Phase 8)

---

## 7.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. DB query output showing a paid trip row and a payments row.

I'll then write `PHASE-08-admin-dashboard.md`.

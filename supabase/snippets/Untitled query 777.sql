SELECT
  t.id                                    AS trip_id,
  'TFR' || LPAD((('x' || RIGHT(REPLACE(t.id::text,'-',''), 4))::bit(16)::int % 10000)::text, 4, '0')
                                          AS trip_ref,
  t.status                                AS trip_status,
  t.fare_amount,
  t.started_at,
  p.payment_method,
  p.amount                                AS paid_amount,
  p.stripe_payment_intent_id,
  p.paid_at
FROM trips t
LEFT JOIN payments p ON p.trip_id = t.id
WHERE t.status = 'paid'
ORDER BY t.ended_at DESC
LIMIT 10;

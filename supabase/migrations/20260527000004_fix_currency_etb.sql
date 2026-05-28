-- Fix currency columns: change default from 'USD' to 'ETB' and update existing rows

ALTER TABLE public.fares    ALTER COLUMN currency SET DEFAULT 'ETB';
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'ETB';

UPDATE public.fares    SET currency = 'ETB' WHERE currency = 'USD';
UPDATE public.payments SET currency = 'ETB' WHERE currency = 'USD';

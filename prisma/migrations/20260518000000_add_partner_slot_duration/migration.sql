-- Additive migration: voegt slotDurationMinutes toe aan Partner
-- Bestaande partners krijgen automatisch 60 minuten via DEFAULT 60
-- Bestaande slots, bookings en Mollie-betalingen worden NIET aangeraakt.
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60;

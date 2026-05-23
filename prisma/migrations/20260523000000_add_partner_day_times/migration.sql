-- AddColumn: Partner.dayStartTime
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "dayStartTime" TEXT NOT NULL DEFAULT '09:00';

-- AddColumn: Partner.dayEndTime
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "dayEndTime" TEXT NOT NULL DEFAULT '21:00';

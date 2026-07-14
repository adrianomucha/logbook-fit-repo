-- A PENDING check-in the client never answered is closed out as EXPIRED after
-- two full weekly cadences, so it stops blocking the schedule forever.
ALTER TYPE "CheckInStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

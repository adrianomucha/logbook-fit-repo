-- Enable Row Level Security on every table. The app accesses Postgres solely
-- through Prisma as the table owner (which bypasses RLS), so with no policies
-- defined this simply closes Supabase's auto-generated PostgREST surface to
-- the anon/authenticated roles. Safe to re-run: ENABLE is idempotent.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coach_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coach_client_relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "weeks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "set_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exercise_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

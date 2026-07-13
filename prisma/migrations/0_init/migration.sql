-- Baseline: the schema as it stood before 20260227_db_hardening. The schema
-- was originally managed with `prisma db push`; migrations started later and
-- assume these tables already exist, so a fresh database could never run
-- `prisma migrate deploy`. This baseline closes that gap — the existing chain
-- (day reordering, tracking types, hardening, RLS, ...) replays on top of it
-- and lands exactly on the current schema.prisma (verified with migrate diff).
-- On the production database this migration is marked as applied via
-- `prisma migrate resolve` and never executes.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COACH', 'CLIENT');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'CLIENT_RESPONDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EffortRating" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'GLUTES', 'CORE', 'CARDIO', 'FULL_BODY', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activePlanId" TEXT,
    "planStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_client_relationships" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_client_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_invites" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL DEFAULT 'OTHER',
    "defaultSets" INTEGER DEFAULT 3,
    "defaultReps" INTEGER DEFAULT 10,
    "defaultWeight" DOUBLE PRECISION,
    "defaultRest" INTEGER,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '💪',
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "workoutsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "days" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" INTEGER NOT NULL DEFAULT 10,
    "weight" DOUBLE PRECISION,
    "restSeconds" INTEGER,
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_completions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionPct" DOUBLE PRECISION,
    "exercisesDone" INTEGER,
    "exercisesTotal" INTEGER,
    "durationSec" INTEGER,
    "effortRating" "EffortRating",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_completions" (
    "id" TEXT NOT NULL,
    "workoutCompletionId" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "actualWeight" DOUBLE PRECISION,
    "actualReps" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "set_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_flags" (
    "id" TEXT NOT NULL,
    "workoutCompletionId" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "note" VARCHAR(200),
    "chatMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "effortRating" "EffortRating",
    "painBlockers" VARCHAR(500),
    "clientFeeling" VARCHAR(500),
    "clientRespondedAt" TIMESTAMP(3),
    "coachFeedback" TEXT,
    "planAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "coachRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "workoutReferenceId" TEXT,
    "exerciseReferenceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "coach_profiles_userId_key" ON "coach_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");

-- CreateIndex
CREATE INDEX "client_profiles_activePlanId_idx" ON "client_profiles"("activePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_client_relationships_clientId_key" ON "coach_client_relationships"("clientId");

-- CreateIndex
CREATE INDEX "coach_client_relationships_coachId_idx" ON "coach_client_relationships"("coachId");

-- CreateIndex
CREATE INDEX "coach_client_relationships_clientId_idx" ON "coach_client_relationships"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_client_relationships_coachId_clientId_key" ON "coach_client_relationships"("coachId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "client_invites_token_key" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_token_idx" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_coachId_idx" ON "client_invites"("coachId");

-- CreateIndex
CREATE INDEX "exercises_coachId_idx" ON "exercises"("coachId");

-- CreateIndex
CREATE INDEX "exercises_coachId_category_idx" ON "exercises"("coachId", "category");

-- CreateIndex
CREATE INDEX "plans_coachId_idx" ON "plans"("coachId");

-- CreateIndex
CREATE INDEX "weeks_planId_idx" ON "weeks"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_planId_weekNumber_key" ON "weeks"("planId", "weekNumber");

-- CreateIndex
CREATE INDEX "days_weekId_idx" ON "days"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "days_weekId_dayNumber_key" ON "days"("weekId", "dayNumber");

-- CreateIndex
CREATE INDEX "workout_exercises_dayId_idx" ON "workout_exercises"("dayId");

-- CreateIndex
CREATE INDEX "workout_exercises_exerciseId_idx" ON "workout_exercises"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_exercises_dayId_orderIndex_key" ON "workout_exercises"("dayId", "orderIndex");

-- CreateIndex
CREATE INDEX "workout_completions_clientId_status_idx" ON "workout_completions"("clientId", "status");

-- CreateIndex
CREATE INDEX "workout_completions_clientId_completedAt_idx" ON "workout_completions"("clientId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workout_completions_clientId_planId_dayId_key" ON "workout_completions"("clientId", "planId", "dayId");

-- CreateIndex
CREATE INDEX "set_completions_workoutCompletionId_idx" ON "set_completions"("workoutCompletionId");

-- CreateIndex
CREATE UNIQUE INDEX "set_completions_workoutCompletionId_workoutExerciseId_setNu_key" ON "set_completions"("workoutCompletionId", "workoutExerciseId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_flags_workoutCompletionId_workoutExerciseId_key" ON "exercise_flags"("workoutCompletionId", "workoutExerciseId");

-- CreateIndex
CREATE INDEX "check_ins_coachId_idx" ON "check_ins"("coachId");

-- CreateIndex
CREATE INDEX "check_ins_clientId_idx" ON "check_ins"("clientId");

-- CreateIndex
CREATE INDEX "check_ins_clientId_status_idx" ON "check_ins"("clientId", "status");

-- CreateIndex
CREATE INDEX "check_ins_coachId_status_idx" ON "check_ins"("coachId", "status");

-- CreateIndex
CREATE INDEX "check_ins_clientId_completedAt_idx" ON "check_ins"("clientId", "completedAt");

-- CreateIndex
CREATE INDEX "messages_senderId_recipientId_createdAt_idx" ON "messages"("senderId", "recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_senderId_createdAt_idx" ON "messages"("recipientId", "senderId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_readAt_idx" ON "messages"("recipientId", "readAt");

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_activePlanId_fkey" FOREIGN KEY ("activePlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_client_relationships" ADD CONSTRAINT "coach_client_relationships_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_client_relationships" ADD CONSTRAINT "coach_client_relationships_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invites" ADD CONSTRAINT "client_invites_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "days" ADD CONSTRAINT "days_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_completions" ADD CONSTRAINT "set_completions_workoutCompletionId_fkey" FOREIGN KEY ("workoutCompletionId") REFERENCES "workout_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_completions" ADD CONSTRAINT "set_completions_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_flags" ADD CONSTRAINT "exercise_flags_workoutCompletionId_fkey" FOREIGN KEY ("workoutCompletionId") REFERENCES "workout_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_flags" ADD CONSTRAINT "exercise_flags_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_flags" ADD CONSTRAINT "exercise_flags_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_workoutReferenceId_fkey" FOREIGN KEY ("workoutReferenceId") REFERENCES "workout_completions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_exerciseReferenceId_fkey" FOREIGN KEY ("exerciseReferenceId") REFERENCES "workout_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;


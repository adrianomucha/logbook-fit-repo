-- Template/instance split: assigning a plan now clones it per client, so
-- editing a template stops mutating live client plans. null = template;
-- set = a client's copy pointing at the root template it was cloned from.
ALTER TABLE "plans" ADD COLUMN "sourceTemplateId" TEXT;
CREATE INDEX "plans_sourceTemplateId_idx" ON "plans"("sourceTemplateId");

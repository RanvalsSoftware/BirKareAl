-- A validated, immutable snapshot of scene/filter/composition choices for a queued job.
ALTER TABLE "Generation" ADD COLUMN "recipe" JSONB;

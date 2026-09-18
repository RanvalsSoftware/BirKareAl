-- Additive studio workflows. Existing projects and generations keep their
-- original modes; PostgreSQL enum values are never renamed or removed.
ALTER TYPE "ProjectMode" ADD VALUE IF NOT EXISTS 'PRODUCT_STUDIO';
ALTER TYPE "ProjectMode" ADD VALUE IF NOT EXISTS 'VIRTUAL_TRY_ON';
ALTER TYPE "ProjectMode" ADD VALUE IF NOT EXISTS 'NAIL_PREVIEW';

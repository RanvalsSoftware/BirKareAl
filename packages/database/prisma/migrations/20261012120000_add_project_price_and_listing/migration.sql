-- Optional seller price (major units, two decimals) and the latest generated listing copy.
ALTER TABLE "Project" ADD COLUMN "priceAmount" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN "priceCurrency" TEXT;
ALTER TABLE "Project" ADD COLUMN "listing" JSONB;

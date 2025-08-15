-- prisma/migrations/0001_init/migration.sql

-- Customer
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prisma setzt @updatedAt per Anwendung; wir ergänzen aber einen DB-Trigger,
-- damit updatedAt auch bei direkten SQL-Updates korrekt hochzählt:

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_current_timestamp_3') THEN
    CREATE OR REPLACE FUNCTION set_current_timestamp_3()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."updatedAt" = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'Customer_updatedAt'
  ) THEN
    CREATE TRIGGER "Customer_updatedAt"
    BEFORE UPDATE ON "Customer"
    FOR EACH ROW
    EXECUTE PROCEDURE set_current_timestamp_3();
  END IF;
END;
$$;

-- Product
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sku" TEXT UNIQUE,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'Product_updatedAt'
  ) THEN
    CREATE TRIGGER "Product_updatedAt"
    BEFORE UPDATE ON "Product"
    FOR EACH ROW
    EXECUTE PROCEDURE set_current_timestamp_3();
  END IF;
END;
$$;

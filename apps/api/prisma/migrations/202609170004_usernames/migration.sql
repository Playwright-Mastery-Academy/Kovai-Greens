ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = lower("email");
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
ALTER TABLE "User" ADD CONSTRAINT "username_canonical" CHECK ("username" = lower(trim("username")) AND length("username") BETWEEN 1 AND 100);

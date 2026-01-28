-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "house_id" TEXT;

-- AlterTable
ALTER TABLE "organization_member" ADD COLUMN     "house_id" TEXT;

-- CreateTable
CREATE TABLE "house" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "house_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "house" ADD CONSTRAINT "house_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "house"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "house"("id") ON DELETE SET NULL ON UPDATE CASCADE;

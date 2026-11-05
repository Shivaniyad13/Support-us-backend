import { BeneficiaryType, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before seeding beneficiaries.");
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const beneficiaries: Array<{
  slug: string;
  name: string;
  type: BeneficiaryType;
  description: string;
  sortOrder: number;
}> = [
  {
    slug: "mission-bharat",
    name: "Mission Bharat",
    type: "PROGRAM",
    description: "Support Mission Bharat and its work to improve health and well-being across India.",
    sortOrder: 0,
  },
  {
    slug: "cancer-mukt-bharat-abhiyan",
    name: "Cancer Mukt Bharat Abhiyan",
    type: "ORGANIZATION",
    description: "Support cancer awareness, early detection, and care through Cancer Mukt Bharat Abhiyan.",
    sortOrder: 1,
  },
  {
    slug: "khushi-centre-rehabilitation-research",
    name: "Khushi Centre for Rehabilitation and Research",
    type: "ORGANIZATION",
    description: "Support rehabilitation services and research at Khushi Centre.",
    sortOrder: 2,
  },
];

async function main() {
  for (const beneficiary of beneficiaries) {
    await prisma.beneficiary.upsert({
      where: { slug: beneficiary.slug },
      update: {
        name: beneficiary.name,
        type: beneficiary.type,
        description: beneficiary.description,
        sortOrder: beneficiary.sortOrder,
        isActive: true,
      },
      create: beneficiary,
    });
  }
  await prisma.beneficiary.updateMany({
    where: { slug: { notIn: beneficiaries.map(({ slug }) => slug) } },
    data: { isActive: false },
  });
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed Support Us beneficiaries:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.transactionType.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "PIX" },
  });
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Aggiorna tutti i servizi per avere priceType "hourly"
  const result = await prisma.service.updateMany({
    data: {
      priceType: "hourly",
    },
  });

  console.log(`✅ Aggiornati ${result.count} servizi a priceType: "hourly"`);

  // Verifica
  const services = await prisma.service.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      priceType: true,
    },
  });

  console.log("\n📋 Servizi aggiornati:");
  services.forEach((s) => {
    console.log(`  - ${s.title}: €${s.price}/${s.priceType}`);
  });
}

main()
  .catch((e) => {
    console.error("Errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

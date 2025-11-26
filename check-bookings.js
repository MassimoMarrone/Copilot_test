const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const bookings = await prisma.booking.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  console.log("=== ULTIME PRENOTAZIONI ===");
  bookings.forEach((b) => {
    console.log({
      id: b.id.substring(0, 20) + "...",
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      squareMetersRange: b.squareMetersRange,
    });
  });

  await prisma.$disconnect();
}

check().catch(console.error);


import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Connected successfully.");

    console.log("Fetching users...");
    const users = await prisma.user.findMany({ take: 1 });
    console.log("Users found:", users.length);

    console.log("Fetching services...");
    const services = await prisma.service.findMany({ take: 1 });
    console.log("Services found:", services.length);

  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUser() {
  const email = "max.marrone99@gmail.com";
  console.log(`Checking user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      bookingsAsClient: true,
      bookingsAsProvider: true,
      reviewsGiven: true,
      reviewsReceived: true,
      sentMessages: true,
      notifications: true,
      services: true,
    },
  });

  if (user) {
    console.log("User FOUND:");
    console.log(`ID: ${user.id}`);
    console.log(`Type: ${user.userType}`);
    console.log(`Is Verified: ${user.isVerified}`);
    console.log(`Google ID: ${user.googleId}`);
    console.log("--- Relations ---");
    console.log(`Bookings (Client): ${user.bookingsAsClient.length}`);
    console.log(`Bookings (Provider): ${user.bookingsAsProvider.length}`);
    console.log(`Reviews (Given): ${user.reviewsGiven.length}`);
    console.log(`Reviews (Received): ${user.reviewsReceived.length}`);
    console.log(`Messages Sent: ${user.sentMessages.length}`);
    console.log(`Notifications: ${user.notifications.length}`);
    console.log(`Services: ${user.services.length}`);
  } else {
    console.log("User NOT FOUND in the database.");
  }
}

checkUser()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

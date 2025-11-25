import { PrismaClient } from "@prisma/client";
import { userService } from "../src/services/userService";
import { authService } from "../src/services/authService";

const prisma = new PrismaClient();

async function main() {
  const email = "test-delete-complex-" + Date.now() + "@example.com";
  const providerEmail = "test-provider-" + Date.now() + "@example.com";
  const password = "password123";

  console.log(`1. Creating client ${email}...`);
  await authService.register({ email, password, acceptedTerms: true });
  const client = await prisma.user.findUnique({ where: { email } });
  if (!client) throw new Error("Client creation failed");

  console.log(`2. Creating provider ${providerEmail}...`);
  await authService.register({
    email: providerEmail,
    password,
    acceptedTerms: true,
  });
  const provider = await prisma.user.findUnique({
    where: { email: providerEmail },
  });
  if (!provider) throw new Error("Provider creation failed");

  // Make provider
  await prisma.user.update({
    where: { id: provider.id },
    data: { isProvider: true, acceptedProviderTerms: true },
  });

  console.log("3. Creating service...");
  const service = await prisma.service.create({
    data: {
      providerId: provider.id,
      providerEmail: provider.email,
      title: "Test Service",
      description: "Test Description",
      price: 10,
      category: "Cleaning",
    },
  });

  console.log("4. Creating booking...");
  const booking = await prisma.booking.create({
    data: {
      id: "booking-" + Date.now(),
      serviceId: service.id,
      clientId: client.id,
      clientEmail: client.email,
      providerId: provider.id,
      providerEmail: provider.email,
      serviceTitle: service.title,
      amount: service.price,
      date: new Date(),
      status: "pending",
      paymentStatus: "pending",
    },
  });

  console.log("5. Creating chat messages...");
  await prisma.chatMessage.create({
    data: {
      bookingId: booking.id,
      senderId: client.id,
      senderEmail: client.email,
      senderType: "client",
      message: "Hello from client",
    },
  });
  await prisma.chatMessage.create({
    data: {
      bookingId: booking.id,
      senderId: provider.id,
      senderEmail: provider.email,
      senderType: "provider",
      message: "Hello from provider",
    },
  });

  console.log("6. Creating review...");
  await prisma.review.create({
    data: {
      bookingId: booking.id,
      serviceId: service.id,
      providerId: provider.id,
      clientId: client.id,
      rating: 5,
      comment: "Great service",
    },
  });

  console.log("7. Creating notification...");
  await prisma.notification.create({
    data: {
      userId: client.id,
      title: "Test Notification",
      message: "Test Message",
      type: "info",
    },
  });

  console.log("8. Deleting CLIENT account...");
  await userService.deleteAccount(client.id);
  console.log("Client delete function completed.");

  const deletedClient = await prisma.user.findUnique({ where: { email } });
  if (deletedClient) {
    console.error("FAIL: Client still exists in DB!", deletedClient);
  } else {
    console.log("SUCCESS: Client was deleted from DB.");
  }

  // Clean up provider
  console.log("9. Deleting PROVIDER account...");
  await userService.deleteAccount(provider.id);
  const deletedProvider = await prisma.user.findUnique({
    where: { email: providerEmail },
  });
  if (deletedProvider) {
    console.error("FAIL: Provider still exists in DB!", deletedProvider);
  } else {
    console.log("SUCCESS: Provider was deleted from DB.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


const { PrismaClient } = require('../../node_modules/.prisma/client/index.js');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const dataDir = path.join(__dirname, '../../data');

async function main() {
  console.log('🌱 Starting seeding (JS mode)...');

  // 1. Users
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    console.log(`Processing ${users.length} users...`);
    
    for (const user of users) {
      const existing = await prisma.user.findUnique({ where: { id: user.id } });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            password: user.password,
            userType: user.userType || (user.isProvider ? 'provider' : 'client'),
            isClient: user.isClient ?? true,
            isProvider: user.isProvider ?? false,
            isAdmin: user.isAdmin ?? false,
            isBlocked: user.isBlocked ?? false,
            acceptedTerms: user.acceptedTerms ?? false,
            acceptedProviderTerms: user.acceptedProviderTerms ?? false,
            stripeAccountId: user.stripeAccountId,
            googleId: user.googleId,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
          },
        });
      }
    }
    console.log('✅ Users seeded');
  }

  // 2. Services
  const servicesPath = path.join(dataDir, 'services.json');
  if (fs.existsSync(servicesPath)) {
    const services = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
    console.log(`Processing ${services.length} services...`);

    for (const service of services) {
      const existing = await prisma.service.findUnique({ where: { id: service.id } });
      if (!existing) {
        const provider = await prisma.user.findUnique({ where: { id: service.providerId } });
        if (provider) {
          await prisma.service.create({
            data: {
              id: service.id,
              providerId: service.providerId,
              providerEmail: service.providerEmail,
              title: service.title,
              description: service.description,
              category: service.category,
              price: service.price,
              productsUsed: service.productsUsed ? JSON.stringify(service.productsUsed) : null,
              address: service.address,
              latitude: service.latitude,
              longitude: service.longitude,
              imageUrl: service.imageUrl,
              createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
              averageRating: service.averageRating ?? 0,
              reviewCount: service.reviewCount ?? 0,
              availability: service.availability ? JSON.stringify(service.availability) : null,
            },
          });
        }
      }
    }
    console.log('✅ Services seeded');
  }

  // 3. Bookings
  const bookingsPath = path.join(dataDir, 'bookings.json');
  if (fs.existsSync(bookingsPath)) {
    const bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
    console.log(`Processing ${bookings.length} bookings...`);

    for (const booking of bookings) {
      const existing = await prisma.booking.findUnique({ where: { id: booking.id } });
      if (!existing) {
        const client = await prisma.user.findUnique({ where: { id: booking.clientId } });
        const provider = await prisma.user.findUnique({ where: { id: booking.providerId } });
        const service = await prisma.service.findUnique({ where: { id: booking.serviceId } });

        if (client && provider && service) {
          await prisma.booking.create({
            data: {
              id: booking.id,
              serviceId: booking.serviceId,
              clientId: booking.clientId,
              clientEmail: booking.clientEmail,
              providerId: booking.providerId,
              providerEmail: booking.providerEmail,
              serviceTitle: booking.serviceTitle,
              amount: booking.amount,
              date: booking.date,
              status: booking.status,
              paymentStatus: booking.paymentStatus,
              paymentIntentId: booking.paymentIntentId,
              photoProof: booking.photoProof,
              createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
              completedAt: booking.completedAt ? new Date(booking.completedAt) : null,
              clientPhone: booking.clientPhone,
              preferredTime: booking.preferredTime,
              notes: booking.notes,
              address: booking.address,
            },
          });
        }
      }
    }
    console.log('✅ Bookings seeded');
  }

  // 4. Chat Messages
  const chatPath = path.join(dataDir, 'chatMessages.json');
  if (fs.existsSync(chatPath)) {
    const messages = JSON.parse(fs.readFileSync(chatPath, 'utf-8'));
    console.log(`Processing ${messages.length} chat messages...`);

    for (const msg of messages) {
      const existing = await prisma.chatMessage.findUnique({ where: { id: msg.id } });
      if (!existing) {
        const booking = await prisma.booking.findUnique({ where: { id: msg.bookingId } });
        const sender = await prisma.user.findUnique({ where: { id: msg.senderId } });

        if (booking && sender) {
          await prisma.chatMessage.create({
            data: {
              id: msg.id,
              bookingId: msg.bookingId,
              senderId: msg.senderId,
              senderEmail: msg.senderEmail,
              senderType: msg.senderType,
              message: msg.message,
              read: msg.read ?? false,
              createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
            },
          });
        }
      }
    }
    console.log('✅ Chat messages seeded');
  }

  // 5. Notifications
  const notifPath = path.join(dataDir, 'notifications.json');
  if (fs.existsSync(notifPath)) {
    const notifications = JSON.parse(fs.readFileSync(notifPath, 'utf-8'));
    console.log(`Processing ${notifications.length} notifications...`);

    for (const notif of notifications) {
      const existing = await prisma.notification.findUnique({ where: { id: notif.id } });
      if (!existing) {
        const user = await prisma.user.findUnique({ where: { id: notif.userId } });
        if (user) {
          await prisma.notification.create({
            data: {
              id: notif.id,
              userId: notif.userId,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              read: notif.read ?? false,
              createdAt: notif.createdAt ? new Date(notif.createdAt) : new Date(),
              link: notif.link,
            },
          });
        }
      }
    }
    console.log('✅ Notifications seeded');
  }

  console.log('🌱 Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

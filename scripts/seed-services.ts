import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  "Pulizia Casa",
  "Pulizia Uffici",
  "Pulizia Condominiale",
  "Pulizia Post-Ristrutturazione",
  "Pulizia Vetri",
  "Stiratura",
  "Lavanderia",
];

const titles = [
  "Pulizia Appartamento Completa",
  "Pulizia Profonda Casa",
  "Servizio Pulizie Express",
  "Pulizia Ufficio Professionale",
  "Sanificazione Ambienti",
  "Pulizia Vetrate e Finestre",
  "Pulizia Post Lavori",
  "Servizio Stiratura a Domicilio",
  "Pulizia Scale Condominiali",
  "Pulizia Garage e Cantine",
];

const descriptions = [
  "Servizio completo di pulizia per la tua casa, inclusi bagni, cucina e camere.",
  "Pulizia approfondita con prodotti ecologici certificati.",
  "Servizio rapido ed efficiente per chi ha poco tempo.",
  "Pulizie professionali per uffici e spazi commerciali.",
  "Sanificazione completa con prodotti antibatterici.",
  "Pulizia professionale di vetri, finestre e vetrate.",
  "Rimozione polvere e detriti post ristrutturazione.",
  "Ritiro, stiratura e consegna a domicilio.",
  "Pulizia regolare delle aree comuni condominiali.",
  "Sgombero e pulizia di garage, cantine e box.",
];

const cities = [
  { city: "Milano", lat: 45.4642, lng: 9.19 },
  { city: "Roma", lat: 41.9028, lng: 12.4964 },
  { city: "Napoli", lat: 40.8518, lng: 14.2681 },
  { city: "Torino", lat: 45.0703, lng: 7.6869 },
  { city: "Bologna", lat: 44.4949, lng: 11.3426 },
  { city: "Firenze", lat: 43.7696, lng: 11.2558 },
  { city: "Genova", lat: 44.4056, lng: 8.9463 },
  { city: "Palermo", lat: 38.1157, lng: 13.3615 },
  { city: "Verona", lat: 45.4384, lng: 10.9916 },
  { city: "Padova", lat: 45.4064, lng: 11.8768 },
];

const products = [
  ["Eco-friendly", "Anallergico"],
  ["Pet-friendly", "Eco-friendly"],
  ["Professionale", "Antibatterico"],
  ["Bio", "Naturale"],
  ["Eco-friendly"],
  ["Professionale"],
  [],
];

async function seedServices() {
  // Get a provider to attach services to
  const provider = await prisma.user.findFirst({
    where: { isProvider: true },
  });

  if (!provider) {
    console.log("No provider found. Creating a test provider...");
    const testProvider = await prisma.user.create({
      data: {
        id: "test-provider-seed",
        email: "provider-seed@test.com",
        password:
          "$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VQ6BoQVs.S2VGHe",
        userType: "provider",
        isClient: true,
        isProvider: true,
        isVerified: true,
        acceptedTerms: true,
        displayName: "Test Provider",
      },
    });
    console.log("Created test provider:", testProvider.email);
  }

  const providers = await prisma.user.findMany({
    where: { isProvider: true },
    take: 5,
  });

  if (providers.length === 0) {
    console.error("No providers available");
    return;
  }

  console.log(`Found ${providers.length} providers`);
  console.log("Creating 200 services...");

  for (let i = 0; i < 200; i++) {
    const provider = providers[i % providers.length];
    const city = cities[i % cities.length];
    const title = titles[i % titles.length];
    const description = descriptions[i % descriptions.length];
    const category = categories[i % categories.length];
    const productSet = products[i % products.length];

    // Add some variation
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const price = 25 + Math.floor(Math.random() * 175); // 25-200€

    await prisma.service.create({
      data: {
        providerId: provider.id,
        providerEmail: provider.email,
        title: `${title} #${i + 1}`,
        description: `${description} Servizio numero ${i + 1}.`,
        category,
        price,
        address: `Via Test ${i + 1}, ${city.city}`,
        latitude: city.lat + latOffset,
        longitude: city.lng + lngOffset,
        imageUrl: "/assets/cleaning.jpg",
        productsUsed: JSON.stringify(productSet),
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`Created ${i + 1}/200 services...`);
    }
  }

  console.log("✅ Done! Created 200 services.");
}

seedServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

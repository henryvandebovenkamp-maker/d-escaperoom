import { PrismaClient, Role, SlotStatus, BookingStatus, PaymentStatus, PaymentType, PaymentProvider, Province } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding D-EscapeRoom database...");

  // 1️⃣ Admin user
  const admin = await prisma.appUser.upsert({
    where: { email: "admin@d-escaperoom.local" },
    update: {},
    create: {
      email: "admin@d-escaperoom.local",
      name: "Platform Admin",
      role: Role.ADMIN,
    },
  });

  // 2️⃣ Partner (voorbeeld hondenschool)
  const partner = await prisma.partner.upsert({
    where: { slug: "woofexperience" },
    update: {},
    create: {
      name: "WoofExperience",
      slug: "woofexperience",
      email: "info@woofexperience.nl",
      province: Province.UTRECHT,
      phone: "030-1234567",
      feePercent: 20,
      heroImageUrl: "/images/header-foto.png",
      city: "Odijk",
      isActive: true,
    },
  });

  // 3️⃣ Koppel Partner aan een User met PARTNER-rol
  const partnerUser = await prisma.appUser.upsert({
    where: { email: "partner@woofexperience.nl" },
    update: {},
    create: {
      email: "partner@woofexperience.nl",
      name: "Angela van WoofExperience",
      role: Role.PARTNER,
      partnerId: partner.id,
    },
  });

  // 4️⃣ Tijdslot (vandaag + 1 uur)
  const start = new Date();
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const slot = await prisma.slot.create({
    data: {
      partnerId: partner.id,
      startTime: start,
      endTime: end,
      status: SlotStatus.PUBLISHED,
    },
  });

  // 5️⃣ Testklant
  // Find existing customer by email, or create a new one if not found
  let customer = await prisma.customer.findFirst({ where: { email: "klant@test.nl" } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: "klant@test.nl",
        name: "Test Klant",
        phone: "0612345678",
        locale: "nl",
      },
    });
  }

  // 6️⃣ Boeking
  const booking = await prisma.booking.create({
    data: {
      partnerId: partner.id,
      slotId: slot.id,
      customerId: customer.id,
      status: BookingStatus.CONFIRMED,
      totalAmountCents: 4995,
      depositAmountCents: 999,
      restAmountCents: 3996,
      playersCount: 2,
      dogName: "Buddy",
      dogTrackingLevel: "BEGINNER",
      confirmedAt: new Date(),
      depositPaidAt: new Date(),
    },
  });

  // 7️⃣ Payment (Mollie)
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: PaymentProvider.MOLLIE,
      type: PaymentType.DEPOSIT,
      status: PaymentStatus.PAID,
      method: "ideal",
      amountCents: 999,
      paidAt: new Date(),
    },
  });

  console.log("✅ Seed completed:", { admin, partner, partnerUser, slot, customer, booking });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

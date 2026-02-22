import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const farmerPassword = await bcrypt.hash("farmer123", 10);

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "farmer@test.com" },
    update: {},
    create: {
      email: "farmer@test.com",
      name: "Farmer User",
      password: farmerPassword,
      role: "FARMER",
    },
  });

  console.log("Seed completed (accounts only). Login: admin@test.com / admin123, farmer@test.com / farmer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

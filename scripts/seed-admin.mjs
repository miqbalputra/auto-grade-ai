import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const username = readArg("username") ?? process.env.ADMIN_USERNAME;
  const password = readArg("password") ?? process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("Gunakan: npm run seed:admin -- --username=admin --password=passwordAman123");
  }

  if (password.length < 8) {
    throw new Error("Password admin minimal 8 karakter.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash },
    update: { passwordHash }
  });

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {}
  });

  console.log(`Admin "${username}" siap digunakan.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

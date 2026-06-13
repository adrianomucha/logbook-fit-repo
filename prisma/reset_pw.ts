import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const email = "adrianomucha@gmail.com";
  const newPw = process.argv[2] || "demo1234";
  const hash = await bcrypt.hash(newPw, 10);
  const res = await prisma.user.updateMany({
    where: { email, deletedAt: null },
    data: { passwordHash: hash },
  });
  console.log(`Updated ${res.count} user(s) for ${email}. New password: ${newPw}`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

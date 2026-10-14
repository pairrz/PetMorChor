import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ARTICLE_CATEGORIES = [
  "สุขภาพและโรคที่พบบ่อย",
  "วัคซีนและการป้องกันพยาธิ",
  "อาหารและโภชนาการ",
  "การฝึกและพฤติกรรม",
  "การเลี้ยงลูกสัตว์",
  "อาบน้ำตัดขนและความสะอาด",
  "ปฐมพยาบาลเบื้องต้น",
  "การรับเลี้ยงและการดูแลหลังรับเลี้ยง",
  "อุปกรณ์และที่อยู่อาศัย",
  "ทำหมันและการวางแผนครอบครัว",
];

const PLACE_TYPES = [
  "โรงพยาบาล/คลินิกสัตว์",
  "ร้านอาบน้ำตัดขน",
  "ร้านอาหารและอุปกรณ์สัตว์เลี้ยง",
  "โรงแรมและฝากเลี้ยงสัตว์",
  "สถานที่ฝึกสัตว์",
  "คาเฟ่สัตว์เลี้ยง",
  "สวนสาธารณะและพื้นที่วิ่งเล่น",
  "ศูนย์พักพิงสัตว์",
];

async function seedAdmins() {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    console.warn("ADMIN_EMAILS ว่าง ข้ามการสร้างแอดมิน");
    return;
  }

  for (const email of emails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" }, 
      create: {
        email,
        name: email.split("@")[0],
        role: "ADMIN",
        oauthProvider: "google", 
      },
    });
    console.log(`admin: ${email}`);
  }
}

async function seedCategories() {
  for (const name of ARTICLE_CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`categories: ${ARTICLE_CATEGORIES.length}`);
}

async function seedPlaceTypes() {
  for (const name of PLACE_TYPES) {
    await prisma.placeType.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`place types: ${PLACE_TYPES.length}`);
}

async function main() {
  await seedAdmins();
  await seedCategories();
  await seedPlaceTypes();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
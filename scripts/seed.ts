import "../src/server/env";
import bcrypt from "bcryptjs";
import { connectDB, mongoose } from "../src/server/db";
import { User } from "../src/server/models";

async function main() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "admin@cambridge.uz")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const name = process.env.ADMIN_NAME || "Administrator";

  const existingAdmin = await User.findOne({ role: "admin" }).lean().exec();
  if (existingAdmin) {
    console.log(`✓ Admin allaqachon mavjud: ${existingAdmin.email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name,
    email,
    passwordHash,
    role: "admin",
    hue: "from-indigo-500 to-blue-400",
    headline: "Platforma administratori",
  });

  console.log("✓ Bootstrap admin yaratildi:");
  console.log(`  email:  ${admin.email}`);
  console.log(`  parol:  ${password}`);
  console.log("  (birinchi kirishdan keyin parolni o'zgartiring)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());

import "../src/server/env";
import bcrypt from "bcryptjs";
import { connectDB, mongoose } from "../src/server/db";
import { User } from "../src/server/models";

/**
 * Parolni qayta o'rnatish (parol unutilganda).
 *
 *   npm run db:reset-password -- <login> <yangi-parol>
 *   npm run db:reset-password -- --list          # foydalanuvchilar ro'yxati
 *
 * Misol:
 *   npm run db:reset-password -- admin@cambridge.uz yangiParol123
 */
async function main() {
  const [loginArg, passwordArg] = process.argv.slice(2);

  await connectDB();
  console.log(`Baza: ${mongoose.connection.name}`);

  if (!loginArg || loginArg === "--list") {
    const users = await User.find({}, { name: 1, email: 1, role: 1 })
      .sort({ role: 1 })
      .lean()
      .exec();
    console.log(`\nFoydalanuvchilar (${users.length}):`);
    for (const u of users) {
      console.log(`  [${u.role.padEnd(7)}] ${u.email}  —  ${u.name}`);
    }
    console.log(
      "\nParolni almashtirish:\n  npm run db:reset-password -- <login> <yangi-parol>",
    );
    return;
  }

  if (!passwordArg || passwordArg.length < 6) {
    console.error("Yangi parol kamida 6 belgi bo'lishi kerak.");
    process.exitCode = 1;
    return;
  }

  const email = loginArg.trim().toLowerCase();
  const user = await User.findOne({ email }).exec();
  if (!user) {
    console.error(`Bunday login topilmadi: "${email}" (ro'yxat uchun --list)`);
    process.exitCode = 1;
    return;
  }

  user.passwordHash = await bcrypt.hash(passwordArg, 10);
  await user.save();

  console.log(`\n✓ Parol yangilandi`);
  console.log(`  login: ${user.email}`);
  console.log(`  parol: ${passwordArg}`);
  console.log(`  rol:   ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());

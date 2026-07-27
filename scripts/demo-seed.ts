import "../src/server/env";
import bcrypt from "bcryptjs";
import { connectDB, mongoose } from "../src/server/db";
import { User, Group } from "../src/server/models";

// Demo akkauntlar — DTM modulini sinash uchun. Idempotent (qayta ishga tushsa
// takrorlamaydi).
async function ensureUser(
  email: string,
  name: string,
  role: "teacher" | "student",
  password: string,
  hue: string
) {
  let u = await User.findOne({ email }).exec();
  if (!u) {
    u = await User.create({
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      hue,
      headline: role === "teacher" ? "Demo o'qituvchi" : "Demo o'quvchi",
    });
    console.log(`✓ yaratildi: ${email} / ${password} (${role})`);
  } else {
    console.log(`• mavjud: ${email} (${role})`);
  }
  return u;
}

async function main() {
  await connectDB();

  const teacher = await ensureUser(
    "teacher",
    "Nodira O'qituvchi",
    "teacher",
    "teacher123",
    "from-emerald-500 to-teal-400"
  );
  const student = await ensureUser(
    "student",
    "Jasur O'quvchi",
    "student",
    "student123",
    "from-indigo-500 to-violet-400"
  );

  let group = await Group.findOne({
    name: "Demo guruh",
    teacherId: teacher._id,
  }).exec();
  if (!group) {
    group = await Group.create({
      name: "Demo guruh",
      subject: "Matematika",
      emoji: "🧮",
      description: "DTM modulini sinash uchun demo guruh",
      teacherId: teacher._id,
      studentIds: [student._id],
    });
    console.log("✓ 'Demo guruh' yaratildi (o'quvchi qo'shildi)");
  } else {
    if (!group.studentIds.some((s) => s.toString() === student._id.toString())) {
      group.studentIds.push(student._id);
      await group.save();
    }
    console.log("• 'Demo guruh' mavjud");
  }

  console.log("\n=== Demo login ma'lumotlari ===");
  console.log("O'qituvchi:  teacher / teacher123");
  console.log("O'quvchi:    student / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());

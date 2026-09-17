import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
const db = new PrismaClient();
async function main() {
  const v = z
    .object({
      username: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_.@-]+$/),
      password: z.string().min(12).max(128),
      name: z.string().min(1),
    })
    .parse({
      username: process.env.OWNER_USERNAME || "Aravind",
      password: process.env.OWNER_PASSWORD,
      name: process.env.OWNER_NAME || "Aravind",
    });
  if (await db.user.count())
    throw new Error(
      "Initial owner already exists. Bootstrap never resets credentials.",
    );
  const owner = await db.user.create({
    data: {
      username: v.username.toLowerCase(),
      name: v.name,
      passwordHash: await hash(v.password, 12),
      role: "OWNER",
    },
  });
  await db.auditLog.create({
    data: {
      actorId: owner.id,
      action: "BOOTSTRAPPED",
      entity: "users",
      entityId: owner.id,
      newValue: { role: "OWNER" },
    },
  });
  console.log(
    "Initial owner created. Remove OWNER_PASSWORD from deployment environment.",
  );
}
main().finally(() => db.$disconnect());

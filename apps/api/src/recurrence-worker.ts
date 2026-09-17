import { generateSchedules, db } from "./main";
async function run() {
  try {
    const result = await generateSchedules(
      new Date(Date.now() + 30 * 86400000),
      {
        id: "recurrence-worker",
        name: "Recurring order scheduler",
        role: "OWNER",
      },
    );
    console.log("Recurring-order generation completed:", result);
  } catch (e) {
    console.error("Recurring-order generation failed", e);
  }
}
async function main() {
  await run();
  const timer = setInterval(run, 3600000);
  process.on("SIGTERM", async () => {
    clearInterval(timer);
    await db.$disconnect();
    process.exit(0);
  });
}
main();

import { getPrisma } from "../src/prisma.js";
import { seed } from "./seed-data.js";
const prisma = getPrisma();
seed(prisma)
  .then(() => console.log("Lab 3 reference and sample data seeded successfully."))
  .catch(error => {
    const message = error instanceof Error && error.message.startsWith("SEED_CONFLICT:")
      ? error.message
      : "Reference data seed failed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

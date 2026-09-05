import { getPrisma } from "../src/prisma.js";
import { seed } from "./seed-data.js";
const prisma = getPrisma();
seed(prisma)
  .then(() => console.log("Lab 2 reference data seeded successfully."))
  .catch(() => { console.error("Reference data seed failed."); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

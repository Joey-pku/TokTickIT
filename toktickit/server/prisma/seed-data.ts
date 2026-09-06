import type { PrismaClient } from "@prisma/client";

export async function seed(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async tx => {
    for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
      await tx.category.upsert({ where: { name }, update: {}, create: { name } });
    }
    for (const name of ["Corporate Laptop", "Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Printer"]) {
      await tx.relatedSystem.upsert({ where: { name }, update: { isActive: true }, create: { name } });
    }
    const requesters = [
      { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Marketing", isActive: true },
      { name: "David Lee", email: "david.lee@example.com", department: "Engineering", isActive: true },
      { name: "Sarah Johnson", email: "sarah.johnson@example.com", department: "Human Resources", isActive: true },
      { name: "Michael Brown", email: "michael.brown@example.com", department: "Finance", isActive: true },
      { name: "Alex Taylor (Inactive)", email: "alex.taylor@example.com", department: "Former Staff", isActive: false },
    ];
    for (const requester of requesters) {
      await tx.developmentRequester.upsert({ where: { email: requester.email }, update: requester, create: requester });
    }
  });
}

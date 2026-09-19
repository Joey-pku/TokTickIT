import bcrypt from "bcrypt";
import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { allocateTicketNumber, reconcileTicketNumberCounters } from "../src/ticket-number.js";

const INITIAL_PASSWORD = "Initial123!";

type SeedUser = {
  seedKey: string;
  name: string;
  email: string;
  department: string | null;
  role: Role;
  isActive: boolean;
};

const users: SeedUser[] = [
  { seedKey: "seed:req:1", name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Marketing", role: "REQUESTER", isActive: true },
  { seedKey: "seed:req:2", name: "David Lee", email: "david.lee@example.com", department: "Engineering", role: "REQUESTER", isActive: true },
  { seedKey: "seed:req:3", name: "Sarah Johnson", email: "sarah.johnson@example.com", department: "Human Resources", role: "REQUESTER", isActive: true },
  { seedKey: "seed:req:4", name: "Michael Brown", email: "michael.brown@example.com", department: "Finance", role: "REQUESTER", isActive: true },
  { seedKey: "seed:req:5", name: "Alex Taylor", email: "alex.taylor@example.com", department: "Former Staff", role: "REQUESTER", isActive: false },
  { seedKey: "seed:staff:1", name: "Mike Brown", email: "staff.mike@toktickit.com", department: "IT", role: "IT_STAFF", isActive: true },
  { seedKey: "seed:staff:2", name: "Sarah Miller", email: "staff.sarah@toktickit.com", department: "IT", role: "IT_STAFF", isActive: true },
  { seedKey: "seed:staff:3", name: "David Chen", email: "staff.david@toktickit.com", department: "IT", role: "IT_STAFF", isActive: true },
  { seedKey: "seed:staff:4", name: "Kevin Patel", email: "staff.kevin@toktickit.com", department: "IT", role: "IT_STAFF", isActive: false },
  { seedKey: "seed:admin:1", name: "System Admin", email: "admin@toktickit.com", department: "IT", role: "ADMINISTRATOR", isActive: true },
];

const samples = [
  { seedKey: "seed:ticket:1", requesterKey: "seed:req:1", ownerKey: null, category: "Hardware", system: "Corporate Laptop", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", summary: "Laptop will not start", description: "The assigned laptop does not power on after charging overnight." },
  { seedKey: "seed:ticket:2", requesterKey: "seed:req:2", ownerKey: "seed:staff:1", category: "Network", system: "VPN", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", summary: "VPN connection is unstable", description: "The VPN disconnects repeatedly while working from outside campus." },
  { seedKey: "seed:ticket:3", requesterKey: "seed:req:3", ownerKey: "seed:staff:2", category: "Account and Access", system: "Email", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED", summary: "Shared mailbox access needed", description: "Access is required to the department shared mailbox for weekly reports." },
] as const;

function conflict(message: string): never {
  throw new Error(`SEED_CONFLICT: ${message}`);
}

export async function seed(prisma: PrismaClient): Promise<void> {
  // Hash before opening the transaction. It is used only for new accounts.
  const initialHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
  await prisma.$transaction(async tx => {
    const categories = new Map<string, number>();
    for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
      const existing = await tx.category.findUnique({ where: { name }, select: { id: true } });
      const row = existing ?? await tx.category.create({ data: { name }, select: { id: true } });
      categories.set(name, row.id);
    }

    const systems = new Map<string, number>();
    for (const name of ["Corporate Laptop", "Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Printer"]) {
      const existing = await tx.relatedSystem.findUnique({ where: { name }, select: { id: true } });
      const row = existing ?? await tx.relatedSystem.create({ data: { name }, select: { id: true } });
      systems.set(name, row.id);
    }

    const resolvedUsers = new Map<string, Awaited<ReturnType<typeof tx.user.findUniqueOrThrow>>>();
    for (const definition of users) {
      let row = await tx.user.findUnique({ where: { seedKey: definition.seedKey } });
      if (!row) {
        const occupied = await tx.user.findFirst({ where: { email: { equals: definition.email, mode: "insensitive" } } });
        if (occupied) {
          conflict(`canonical email for ${definition.seedKey} is occupied by an account without that seed key`);
        } else {
          row = await tx.user.create({ data: { ...definition, passwordHash: initialHash, mustChangePassword: true } as Prisma.UserCreateInput });
        }
      }
      resolvedUsers.set(definition.seedKey, row);
    }

    await reconcileTicketNumberCounters(tx);
    const resolvedTickets = new Map<string, Awaited<ReturnType<typeof tx.ticket.findUniqueOrThrow>>>();
    for (const definition of samples) {
      let ticket = await tx.ticket.findUnique({ where: { seedKey: definition.seedKey } });
      if (!ticket) {
        const requester = resolvedUsers.get(definition.requesterKey)!;
        if (requester.role !== "REQUESTER") conflict(`${definition.seedKey} requires an eligible requester`);
        const owner = definition.ownerKey ? resolvedUsers.get(definition.ownerKey) : null;
        if (owner && (!owner.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(owner.role))) {
          conflict(`${definition.seedKey} requires an active staff owner`);
        }
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT CURRENT_TIMESTAMP AS now`;
        ticket = await tx.ticket.create({ data: {
          seedKey: definition.seedKey,
          ticketNumber: await allocateTicketNumber(tx, clock.now),
          summary: definition.summary,
          description: definition.description,
          requestedPriority: definition.requestedPriority,
          itPriority: definition.itPriority,
          currentStatus: definition.currentStatus,
          requesterId: requester.id,
          ownerId: owner?.id ?? null,
          categoryId: categories.get(definition.category)!,
          relatedSystemId: systems.get(definition.system)!,
          createdAt: clock.now,
          updatedAt: clock.now,
        } });
      }
      resolvedTickets.set(definition.seedKey, ticket);
    }

    const comments = [
      { seedKey: "seed:comment:1-1", ticketKey: "seed:ticket:1", authorKey: "seed:req:1", content: "The charging indicator remains off with the supplied adapter." },
      { seedKey: "seed:comment:2-1", ticketKey: "seed:ticket:2", authorKey: "seed:staff:1", content: "We are reviewing the VPN client logs and gateway connection." },
      { seedKey: "seed:comment:3-1", ticketKey: "seed:ticket:3", authorKey: "seed:req:3", content: "Mailbox access is now working. Thank you." },
    ];
    for (const definition of comments) {
      if (await tx.comment.findUnique({ where: { seedKey: definition.seedKey }, select: { id: true } })) continue;
      const author = resolvedUsers.get(definition.authorKey)!;
      const ticket = resolvedTickets.get(definition.ticketKey)!;
      const authorized = author.isActive && (
        author.role === "IT_STAFF" || author.role === "ADMINISTRATOR" ||
        (author.role === "REQUESTER" && author.id === ticket.requesterId)
      );
      if (!authorized) conflict(`${definition.seedKey} requires an authorized public-comment author`);
      await tx.comment.create({ data: { seedKey: definition.seedKey, ticketId: ticket.id, authorId: author.id, content: definition.content } });
    }

    const notes = [
      { seedKey: "seed:note:2-1", ticketKey: "seed:ticket:2", authorKey: "seed:staff:1", content: "Gateway logs show intermittent tunnel renegotiation." },
      { seedKey: "seed:note:3-1", ticketKey: "seed:ticket:3", authorKey: "seed:staff:2", content: "Access group membership was synchronized successfully." },
    ];
    for (const definition of notes) {
      if (await tx.internalNote.findUnique({ where: { seedKey: definition.seedKey }, select: { id: true } })) continue;
      const author = resolvedUsers.get(definition.authorKey)!;
      if (!author.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(author.role)) {
        conflict(`${definition.seedKey} requires an active staff author`);
      }
      await tx.internalNote.create({ data: { seedKey: definition.seedKey, ticketId: resolvedTickets.get(definition.ticketKey)!.id, authorId: author.id, content: definition.content } });
    }
  });
}

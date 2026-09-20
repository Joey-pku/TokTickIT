import type { Prisma } from "@prisma/client";

// Serializes owner eligibility checks with administrator role/activation changes.
// The transaction-scoped PostgreSQL lock is released automatically on commit/rollback.
export async function lockUserEligibility(tx: Prisma.TransactionClient) {
  await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(130013)::text");
}

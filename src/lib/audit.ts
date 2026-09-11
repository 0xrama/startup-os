import { db } from "./db";
import { auditLogs } from "./schema";
import type { AuditMetadata } from "./schema";

export async function logAudit({
  userId,
  action,
  resourceType,
  resourceId,
  metadata,
  ipAddress,
}: {
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
}) {
  await db.insert(auditLogs).values({
    userId: userId ?? null,
    action,
    resourceType: resourceType ?? null,
    resourceId: resourceId ?? null,
    metadata: metadata ?? null,
    ipAddress: ipAddress ?? null,
  });
}

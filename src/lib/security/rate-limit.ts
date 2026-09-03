import { db } from "@/lib/db"
import { rateLimit } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; resetAt: Date }> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000)

  // Use toISOString() in sql template since pg timestamp comparison works safely with ISO strings.
  const [record] = await db.insert(rateLimit)
    .values({
      key,
      points: 1,
      expiresAt
    })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        points: sql`CASE WHEN ${rateLimit.expiresAt} < ${now.toISOString()} THEN 1 ELSE ${rateLimit.points} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimit.expiresAt} < ${now.toISOString()} THEN ${expiresAt.toISOString()} ELSE ${rateLimit.expiresAt} END`
      }
    })
    .returning()

  return {
    success: record.points <= limit,
    remaining: Math.max(0, limit - record.points),
    resetAt: record.expiresAt
  }
}

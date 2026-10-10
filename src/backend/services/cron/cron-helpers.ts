import { adminDb } from "../../config/supabase.admin";
import { logger } from "../../lib/logger";

export async function cleanupExpiredLocks(): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  try {
    const expiredLocks = await adminDb
      .collection("systemLocks")
      .where("expiresAt", "<", Date.now())
      .get();

    if (!expiredLocks.empty) {
      const batch = adminDb.batch();
      for (const doc of expiredLocks.docs) {
        batch.delete(doc.ref);
        deletedCount++;
      }
      await batch.commit();
      logger.info({ deletedCount }, "Deleted expired system locks in CRON");
    }
  } catch (e) {
    console.error("Error cleaning up expired system locks:", e);
  }
  return { deletedCount };
}

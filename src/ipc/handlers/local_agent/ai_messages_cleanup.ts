import log from "electron-log";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

const logger = log.scope("ai_messages_cleanup");

export const AI_MESSAGES_TTL_DAYS = 30;

export async function cleanupOldAiMessagesJson() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cutoffSeconds = nowSeconds - AI_MESSAGES_TTL_DAYS * 24 * 60 * 60;
  const cutoffDate = new Date(cutoffSeconds * 1000);

  try {
    await db
      .update(messages)
      .set({ aiMessagesJson: null })
      .where(lt(messages.createdAt, cutoffDate));
    logger.log("Cleaned up old ai_messages_json entries");
  } catch (error) {
    logger.warn("Failed to cleanup old ai_messages_json:", error);
  }
}

import { connectToDatabase } from "@/lib/db/connect";
import { Notification } from "@/lib/db/models";
import { serialize } from "@/lib/utils/serialize";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  dedupeKey?: string;
  meta?: Record<string, unknown>;
}

/**
 * Create an in-app notification. When a dedupeKey is supplied, duplicate
 * notifications for the same underlying event are suppressed (the unique index
 * enforces this at the database level too).
 */
export async function createNotification(input: CreateNotificationInput) {
  await connectToDatabase();
  try {
    const doc = await Notification.create({
      user: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      dedupeKey: input.dedupeKey,
      meta: input.meta,
    });
    return serialize(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return null; // duplicate suppressed
    }
    throw error;
  }
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { user: userId };
  if (options.unreadOnly) filter.isRead = false;

  const [items, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(options.limit ?? 30, 100))
      .lean(),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { items: serialize(items), unreadCount: unread };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { user: userId, isRead: false };
  if (ids?.length) filter._id = { $in: ids };
  const result = await Notification.updateMany(filter, { $set: { isRead: true } });
  return result.modifiedCount;
}

export async function countUnread(userId: string): Promise<number> {
  await connectToDatabase();
  return Notification.countDocuments({ user: userId, isRead: false });
}

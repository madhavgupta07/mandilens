import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { PriceAlert, MarketPrice } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { serialize } from "@/lib/utils/serialize";
import { createNotification } from "@/lib/services/notifications";
import { formatINR } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";
import type { AlertCreateInput } from "@/lib/validation/listing";

export async function createAlert(userId: string, input: AlertCreateInput) {
  await connectToDatabase();
  const alert = await PriceAlert.create({
    user: userId,
    commodity: input.commodityId,
    market: input.marketId && Types.ObjectId.isValid(input.marketId) ? input.marketId : undefined,
    district: input.district,
    metric: input.metric,
    comparator: input.comparator,
    threshold: input.threshold,
    unit: input.unit,
    isActive: true,
  });
  return serialize(alert.toObject());
}

export async function listAlerts(userId: string) {
  await connectToDatabase();
  const items = await PriceAlert.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("commodity", "name slug")
    .populate("market", "name district state")
    .lean();
  return items.map((item) => serialize<Record<string, unknown>>(item));
}

export async function setAlertActive(userId: string, alertId: string, isActive: boolean) {
  await connectToDatabase();
  const alert = await PriceAlert.findOneAndUpdate(
    { _id: alertId, user: userId },
    { $set: { isActive } },
    { new: true },
  );
  if (!alert) throw ApiError.notFound("Alert not found.");
  return serialize(alert.toObject());
}

export async function deleteAlert(userId: string, alertId: string) {
  await connectToDatabase();
  const result = await PriceAlert.deleteOne({ _id: alertId, user: userId });
  if (result.deletedCount === 0) throw ApiError.notFound("Alert not found.");
  return { deleted: true };
}

export interface AlertEvaluation {
  alertsChecked: number;
  triggered: number;
  notifications: string[];
}

function metricValue(
  doc: { modalPrice?: number; minPrice?: number; maxPrice?: number },
  metric: "modal" | "min" | "max",
): number | undefined {
  if (metric === "modal") return doc.modalPrice ?? doc.minPrice ?? doc.maxPrice;
  if (metric === "min") return doc.minPrice ?? doc.modalPrice;
  return doc.maxPrice ?? doc.modalPrice;
}

/**
 * Evaluate active alerts against the latest stored observations.
 *
 * Rules:
 *  - An alert only fires when a *new* observation arrives (deduplicated by the
 *    price record id), never repeatedly for the same data.
 *  - A missing observation never triggers an alert and is never read as
 *    "the market closed".
 */
export async function evaluateAlerts(options: { userId?: string } = {}): Promise<AlertEvaluation> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { isActive: true };
  if (options.userId) filter.user = options.userId;

  const alerts = await PriceAlert.find(filter).lean();
  const triggeredNotifications: string[] = [];
  let triggered = 0;

  for (const alert of alerts) {
    const baseFilter: Record<string, unknown> = { commodity: alert.commodity };
    if (alert.market) baseFilter.market = alert.market;
    if (alert.district) baseFilter["district"] = alert.district;

    // Prefer genuine reported data; fall back to demo data only if that is all
    // that exists, and label it as demo in the notification.
    let latest = await MarketPrice.findOne({ ...baseFilter, isDemo: false })
      .sort({ priceDate: -1 })
      .lean();
    let isDemoFallback = false;
    if (!latest) {
      latest = await MarketPrice.findOne({ ...baseFilter, isDemo: true })
        .sort({ priceDate: -1 })
        .lean();
      isDemoFallback = Boolean(latest);
    }

    await PriceAlert.updateOne(
      { _id: alert._id },
      { $set: { lastEvaluatedAt: new Date() } },
    ).catch(() => undefined);

    if (!latest) continue;

    const value = metricValue(latest, alert.metric);
    if (value === undefined || value === null) continue;

    const hit =
      alert.comparator === "above" ? value > alert.threshold : value < alert.threshold;

    await PriceAlert.updateOne(
      { _id: alert._id },
      {
        $set: {
          lastObservedPrice: value,
          lastObservedDate: latest.priceDate,
        },
      },
    ).catch(() => undefined);

    if (!hit) continue;

    const sameObservation =
      alert.lastTriggeredAt && alert.lastObservedDate &&
      new Date(alert.lastObservedDate).getTime() === new Date(latest.priceDate).getTime();
    if (sameObservation) continue;

    triggered += 1;
    const notification = await createNotification({
      userId: String(alert.user),
      type: "price_alert",
      title: `Price alert: ${alert.metric} price ${alert.comparator} ${formatINR(alert.threshold)}`,
      body: `The latest recorded ${alert.metric} price was ${formatINR(value)} per ${alert.unit} on ${formatDate(latest.priceDate)}${isDemoFallback ? " (demo data)" : ""}. Source: ${latest.provenance.dataSource}.`,
      link: `/commodities`,
      dedupeKey: `alert:${alert._id}:${String(latest._id)}`,
      meta: {
        alertId: String(alert._id),
        priceId: String(latest._id),
        value,
        priceDate: latest.priceDate,
        isDemo: latest.isDemo,
      },
    });

    await PriceAlert.updateOne(
      { _id: alert._id },
      { $set: { lastTriggeredAt: new Date() } },
    ).catch(() => undefined);

    if (notification) {
      triggeredNotifications.push(
        String((notification as Record<string, unknown>)._id ?? ""),
      );
    }
  }

  return { alertsChecked: alerts.length, triggered, notifications: triggeredNotifications };
}

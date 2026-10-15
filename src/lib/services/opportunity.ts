import { Decimal, d, roundMoney, roundQty } from "@/lib/utils/decimal";
import { convertQuantity } from "@/lib/utils/units";
import { getFreshness } from "@/lib/utils/dates";
import {
  DISCLAIMER,
  RECORD_TYPE_LABELS,
  type RecordType,
  type Unit,
} from "@/lib/domain/constants";

/**
 * The MandiLens Opportunity Engine.
 *
 * Every rupee is computed here with Decimal.js — deterministically and
 * independently of any language model. The AI layer may only *explain* the
 * numbers produced by these functions.
 */

export interface ExpenseInput {
  transportation?: number;
  loading?: number;
  unloading?: number;
  marketCharges?: number;
  /** Absolute commission in ₹. */
  commission?: number;
  /** Optional commission expressed as a percentage of gross sale value. */
  commissionPercent?: number;
  other?: number;
}

export interface ExpenseLine {
  key: keyof Omit<ExpenseInput, "commissionPercent">;
  label: string;
  amount: number;
  provided: boolean;
}

const EXPENSE_LABELS: Record<ExpenseLine["key"], string> = {
  transportation: "Transportation to market",
  loading: "Loading",
  unloading: "Unloading",
  marketCharges: "Market charges / cess",
  commission: "Commission / arhat",
  other: "Other selling expenses",
};

export interface CandidateInput {
  marketId: string;
  marketName: string;
  district?: string;
  state?: string;
  /** Price expressed per `priceUnit`. If omitted the candidate is unusable. */
  pricePerUnit?: number | null;
  priceUnit: Unit;
  expenses: ExpenseInput;
  priceSource: "recorded" | "user";
  priceDate?: Date | null;
  recordType: RecordType;
  dataSource?: string;
  dataSourceLabel?: string;
  fetchedAt?: Date | null;
  isDemo?: boolean;
  variety?: string;
  grade?: string;
  /** Free-text note shown alongside the candidate. */
  note?: string;
}

export interface OpportunityInput {
  quantity: number;
  quantityUnit: Unit;
  candidates: CandidateInput[];
}

export interface CandidateResult {
  marketId: string;
  marketName: string;
  district?: string;
  state?: string;
  pricePerUnit: number | null;
  priceUnit: Unit;
  priceSource: "recorded" | "user" | "missing";
  priceDate: string | null;
  recordType: RecordType;
  recordTypeLabel: string;
  dataSource?: string;
  dataSourceLabel?: string;
  isDemo: boolean;
  variety?: string;
  grade?: string;

  /** quantity converted into the candidate's price unit */
  quantityInPriceUnit: number;
  grossSaleValue: number;
  expenseLines: ExpenseLine[];
  totalExpenses: number;
  estimatedNetProceeds: number;
  netPerQuantityUnit: number;
  /** difference of net proceeds versus the best usable candidate (<= 0) */
  differenceFromBest: number | null;
  rank: number | null;
  isBest: boolean;
  usable: boolean;
  unusableReason?: string;
  freshness: {
    level: string;
    ageDays: number;
    label: string;
    description: string;
  } | null;
  warnings: string[];
  missingInformation: string[];
}

export interface OpportunityAssumptions {
  quantity: number;
  quantityUnit: Unit;
  assumptions: string[];
  warnings: string[];
  missingInformation: string[];
  alternatives: string[];
  disclaimer: string;
}

export interface OpportunityResult {
  candidates: CandidateResult[];
  usableCount: number;
  bestMarketId: string | null;
  bestMarketName: string | null;
  bestNetProceeds: number | null;
  /** second-best net proceeds, useful for explaining the ranking */
  runnerUp: { marketId: string; marketName: string; netProceeds: number } | null;
  input: OpportunityInput;
  assumptions: OpportunityAssumptions;
}

export function computeExpenseLines(
  expenses: ExpenseInput,
  grossSaleValue: number,
): ExpenseLine[] {
  let commission = expenses.commission;
  if (
    commission === undefined &&
    expenses.commissionPercent !== undefined &&
    expenses.commissionPercent !== null
  ) {
    commission = d(grossSaleValue)
      .times(expenses.commissionPercent)
      .dividedBy(100)
      .toNumber();
  }

  const values: Record<ExpenseLine["key"], number | undefined> = {
    transportation: expenses.transportation,
    loading: expenses.loading,
    unloading: expenses.unloading,
    marketCharges: expenses.marketCharges,
    commission,
    other: expenses.other,
  };

  return (Object.keys(EXPENSE_LABELS) as ExpenseLine["key"][]).map((key) => {
    const provided = values[key] !== undefined && values[key] !== null;
    const amount = provided ? d(values[key] as number).toNumber() : 0;
    return { key, label: EXPENSE_LABELS[key], amount: roundMoney(amount), provided };
  });
}

function sumExpenses(lines: ExpenseLine[]): number {
  return roundMoney(lines.reduce((acc, line) => acc.plus(line.amount), new Decimal(0)));
}

/**
 * Compute a single candidate's breakdown. Deterministic and side-effect free so
 * it can be unit-tested and reused by API routes, seeds and the AI tools.
 */
export function computeCandidate(
  candidate: CandidateInput,
  quantity: number,
  quantityUnit: Unit,
  now: Date = new Date(),
): CandidateResult {
  const warnings: string[] = [];
  const missingInformation: string[] = [];

  const base: CandidateResult = {
    marketId: candidate.marketId,
    marketName: candidate.marketName,
    district: candidate.district,
    state: candidate.state,
    pricePerUnit: null,
    priceUnit: candidate.priceUnit,
    priceSource: "missing",
    priceDate: null,
    recordType: candidate.recordType,
    recordTypeLabel: RECORD_TYPE_LABELS[candidate.recordType],
    dataSource: candidate.dataSource,
    dataSourceLabel: candidate.dataSourceLabel,
    isDemo: Boolean(candidate.isDemo),
    variety: candidate.variety,
    grade: candidate.grade,
    quantityInPriceUnit: 0,
    grossSaleValue: 0,
    expenseLines: [],
    totalExpenses: 0,
    estimatedNetProceeds: 0,
    netPerQuantityUnit: 0,
    differenceFromBest: null,
    rank: null,
    isBest: false,
    usable: false,
    freshness: null,
    warnings,
    missingInformation,
  };

  const price = candidate.pricePerUnit;
  if (price === undefined || price === null || !Number.isFinite(price) || price <= 0) {
    base.unusableReason =
      "No usable price is available for this market, so it cannot be compared.";
    missingInformation.push("A reported or user-supplied price for this market.");
    return base;
  }

  if (candidate.isDemo) {
    warnings.push("Demo data — illustrative only and not a real market price.");
  }
  if (candidate.priceSource === "user") {
    warnings.push(
      "Price entered by a user and not verified by an official market source.",
    );
  }

  let freshness = null as CandidateResult["freshness"];
  if (candidate.priceDate) {
    const info = getFreshness(candidate.priceDate, now);
    freshness = {
      level: info.level,
      ageDays: info.ageDays,
      label: info.label,
      description: info.description,
    };
    if (info.level === "aging" || info.level === "stale") {
      warnings.push(
        `The reported price is ${info.label.toLowerCase()} (${info.ageDays} days old); verify it before selling.`,
      );
    }
  } else {
    missingInformation.push("The date the price was observed.");
  }

  const quantityInPriceUnit = convertQuantity(quantity, quantityUnit, candidate.priceUnit);
  const gross = d(quantityInPriceUnit).times(price);
  const grossSaleValue = roundMoney(gross);

  const expenseLines = computeExpenseLines(candidate.expenses, grossSaleValue);
  const totalExpenses = sumExpenses(expenseLines);

  for (const line of expenseLines) {
    if (!line.provided && line.key !== "commission") {
      missingInformation.push(`${line.label} was not provided (counted as ₹0).`);
    }
  }

  const net = gross.minus(totalExpenses);
  const netPerQuantityUnit = d(quantity).isZero()
    ? new Decimal(0)
    : net.dividedBy(quantity);

  if (net.isNegative()) {
    warnings.push(
      "Estimated expenses are higher than the gross sale value for this option.",
    );
  }

  return {
    ...base,
    pricePerUnit: price,
    priceSource: candidate.priceSource,
    priceDate: candidate.priceDate ? candidate.priceDate.toISOString() : null,
    quantityInPriceUnit: roundQty(quantityInPriceUnit),
    grossSaleValue,
    expenseLines,
    totalExpenses,
    estimatedNetProceeds: roundMoney(net),
    netPerQuantityUnit: roundMoney(netPerQuantityUnit),
    usable: true,
    freshness,
  };
}

/**
 * Rank candidates by estimated net proceeds. Only usable candidates are ranked.
 * Ranking is purely arithmetic — a higher market price does not win if transport
 * and handling costs more than make up the difference.
 */
export function buildComparison(
  input: OpportunityInput,
  now: Date = new Date(),
): OpportunityResult {
  const quantity = d(input.quantity).toNumber();
  const computed = input.candidates.map((candidate) =>
    computeCandidate(candidate, quantity, input.quantityUnit, now),
  );

  const usable = computed.filter((c) => c.usable);
  usable.sort((a, b) => b.estimatedNetProceeds - a.estimatedNetProceeds);

  usable.forEach((candidate, index) => {
    candidate.rank = index + 1;
    candidate.differenceFromBest = roundMoney(
      d(candidate.estimatedNetProceeds).minus(usable[0].estimatedNetProceeds),
    );
    candidate.isBest = index === 0;
  });

  const best = usable[0] ?? null;
  const runner = usable[1] ?? null;

  const assumptions: string[] = [
    `Quantity handled: ${quantity} ${input.quantityUnit}.`,
    "Gross sale value = quantity × price per unit.",
    "Estimated net proceeds = gross sale value − total estimated expenses.",
    "Expenses are those you supplied; anything not supplied was counted as ₹0.",
  ];

  const warnings: string[] = [];
  const missingInformation: string[] = [];
  const alternatives: string[] = [];

  for (const candidate of computed) {
    missingInformation.push(...candidate.missingInformation.map((m) => `${candidate.marketName}: ${m}`));
  }

  const recordTypes = new Set(usable.map((c) => c.recordType));
  if (recordTypes.size > 1) {
    warnings.push(
      "The ranked options mix different kinds of price records (reported prices, user prices or offers). Confirm each source before comparing them directly.",
    );
  }

  const priceUnits = new Set(usable.map((c) => c.priceUnit));
  if (priceUnits.size > 1) {
    warnings.push(
      "Candidate prices were quoted in different units; all values have been converted to a common basis for comparison.",
    );
  }

  if (usable.length === 0) {
    missingInformation.push(
      "No market with a usable price was found. Import market prices or enter a price manually.",
    );
  }

  if (best && runner) {
    const gap = roundMoney(
      d(best.estimatedNetProceeds).minus(runner.estimatedNetProceeds),
    );
    const priceGap = roundMoney(d(best.pricePerUnit ?? 0).minus(runner.pricePerUnit ?? 0));
    if (gap > 0 && priceGap > 0) {
      alternatives.push(
        `${best.marketName} leads after expenses by ${gap} even though its quoted price is only ${priceGap} higher.`,
      );
    }
    if (gap === 0) {
      warnings.push(
        `The top two options are tied on estimated net proceeds (${best.marketName} and ${runner.marketName}).`,
      );
    }
  }

  if (best && best.freshness && (best.freshness.level === "aging" || best.freshness.level === "stale")) {
    alternatives.push(
      "Ask the winning market to confirm today's price before committing, because the stored price is not fresh.",
    );
  }

  return {
    candidates: computed,
    usableCount: usable.length,
    bestMarketId: best?.marketId ?? null,
    bestMarketName: best?.marketName ?? null,
    bestNetProceeds: best?.estimatedNetProceeds ?? null,
    runnerUp: runner
      ? {
          marketId: runner.marketId,
          marketName: runner.marketName,
          netProceeds: runner.estimatedNetProceeds,
        }
      : null,
    input: { ...input, quantity },
    assumptions: {
      quantity,
      quantityUnit: input.quantityUnit,
      assumptions,
      warnings,
      missingInformation,
      alternatives,
      disclaimer: DISCLAIMER,
    },
  };
}

export function recommendationSentence(result: OpportunityResult): string {
  if (!result.bestMarketName) {
    return "No market could be compared because no usable prices are available.";
  }
  return `Highest estimated net proceeds based on the available data: ${result.bestMarketName}.`;
}

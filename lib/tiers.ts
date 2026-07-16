// Single source of truth for service tiers, pricing, inclusions, and which
// Linkwright Signal metrics each tier unlocks. Used by the company registration
// flow and the reporting section so pricing/inclusions and Signal gating can
// never drift apart. Keep prices and post counts in step with the pricing page.

export type Tier = "foundation" | "growth" | "authority" | "market_leadership";

export type SignalKey = "follower_quality_index" | "warm_signal_rate" | "share_of_voice";

export interface TierDef {
  key: Tier;
  name: string;
  price: number;          // USD per month
  postsPerMonth: number;
  inclusions: string[];   // read-only summary shown on tier select
  signals: SignalKey[];   // Linkwright Signal metrics this tier unlocks
}

export const TIERS: TierDef[] = [
  {
    key: "foundation",
    name: "Foundation",
    price: 650,
    postsPerMonth: 4,
    inclusions: ["4 posts per month", "No Linkwright Signal metrics"],
    signals: [],
  },
  {
    key: "growth",
    name: "Growth",
    price: 1200,
    postsPerMonth: 8,
    inclusions: ["8 posts per month", "Follower Quality Index"],
    signals: ["follower_quality_index"],
  },
  {
    key: "authority",
    name: "Authority",
    price: 2000,
    postsPerMonth: 12,
    inclusions: ["12 posts per month", "Follower Quality Index", "Warm Signal Rate"],
    signals: ["follower_quality_index", "warm_signal_rate"],
  },
  {
    key: "market_leadership",
    name: "Market Leadership",
    price: 3500,
    postsPerMonth: 16,
    inclusions: [
      "16 posts per month",
      "Follower Quality Index",
      "Warm Signal Rate",
      "Share of Voice",
      "Full LinkedIn page management",
    ],
    signals: ["follower_quality_index", "warm_signal_rate", "share_of_voice"],
  },
];

const TIER_MAP = Object.fromEntries(TIERS.map(t => [t.key, t])) as Record<Tier, TierDef>;

// Resolve a tier definition, defaulting to Foundation for null/unknown tiers so
// a client with no tier set gets the ungated LinkedIn layer and no Signal.
export function tierDef(tier: string | null | undefined): TierDef {
  return TIER_MAP[tier as Tier] ?? TIERS[0];
}

export function tierName(tier: string | null | undefined): string {
  return tierDef(tier).name;
}

// A metric shown as a card: LinkedIn performance or Linkwright Signal.
export interface MetricDef {
  key: string;
  label: string;
  unit: "number" | "percent";
}

// LinkedIn performance metrics. Available to every tier, no gating.
export const LINKEDIN_METRICS: MetricDef[] = [
  { key: "impressions",     label: "Impressions",     unit: "number" },
  { key: "engagement_rate", label: "Engagement Rate", unit: "percent" },
  { key: "follower_growth", label: "Follower Growth", unit: "number" },
  { key: "reach",           label: "Reach",           unit: "number" },
  { key: "reactions",       label: "Reactions",       unit: "number" },
  { key: "comments",        label: "Comments",        unit: "number" },
  { key: "reposts",         label: "Reposts",         unit: "number" },
  { key: "profile_views",   label: "Profile Views",   unit: "number" },
];

// Linkwright Signal metrics. Tier-gated. `minTierName` is shown on locked cards.
export interface SignalMetricDef extends MetricDef {
  key: SignalKey;
  minTier: Tier;
  minTierName: string;
}
export const SIGNAL_METRICS: SignalMetricDef[] = [
  { key: "follower_quality_index", label: "Follower Quality Index", unit: "number",  minTier: "growth",            minTierName: "Growth" },
  { key: "warm_signal_rate",       label: "Warm Signal Rate",       unit: "percent", minTier: "authority",         minTierName: "Authority" },
  { key: "share_of_voice",         label: "Share of Voice",         unit: "percent", minTier: "market_leadership", minTierName: "Market Leadership" },
];

// Whether a client's tier unlocks a given Signal metric.
export function tierIncludesSignal(tier: string | null | undefined, key: SignalKey): boolean {
  return tierDef(tier).signals.includes(key);
}

export const ALL_METRIC_KEYS: string[] = [
  ...LINKEDIN_METRICS.map(m => m.key),
  ...SIGNAL_METRICS.map(m => m.key),
];

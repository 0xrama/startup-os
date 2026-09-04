export type FeatureFlagName =
  | "analytics"
  | "assistantRetrieval"
  | "marketingExperiment"
  | "requestMetrics";

const FEATURE_FLAG_ENV = {
  analytics: "NEXT_PUBLIC_FEATURE_ANALYTICS",
  assistantRetrieval: "FEATURE_ASSISTANT_RETRIEVAL",
  marketingExperiment: "NEXT_PUBLIC_FEATURE_MARKETING_EXPERIMENT",
  requestMetrics: "FEATURE_REQUEST_METRICS",
} as const satisfies Record<FeatureFlagName, string>;

function parseFlag(value: string | undefined, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getFeatureFlags() {
  return {
    analytics: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ANALYTICS),
    assistantRetrieval: parseFlag(
      process.env.FEATURE_ASSISTANT_RETRIEVAL,
      true
    ),
    marketingExperiment: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_MARKETING_EXPERIMENT
    ),
    requestMetrics: parseFlag(process.env.FEATURE_REQUEST_METRICS, true),
  } satisfies Record<FeatureFlagName, boolean>;
}

export function isFeatureFlagEnabled(name: FeatureFlagName) {
  return getFeatureFlags()[name];
}

export function getFeatureFlagEnvName(name: FeatureFlagName) {
  return FEATURE_FLAG_ENV[name];
}

export type FeatureFlagName = "assistantRetrieval" | "requestMetrics";

const FEATURE_FLAG_ENV = {
  assistantRetrieval: "FEATURE_ASSISTANT_RETRIEVAL",
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
    assistantRetrieval: parseFlag(
      process.env.FEATURE_ASSISTANT_RETRIEVAL,
      true
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

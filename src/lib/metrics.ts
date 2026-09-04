type MetricStore = Record<string, number>;

declare global {
  var __STARTUP_OS_METRICS__: MetricStore | undefined;
}

function getMetricStore() {
  if (!globalThis.__STARTUP_OS_METRICS__) {
    globalThis.__STARTUP_OS_METRICS__ = {};
  }

  return globalThis.__STARTUP_OS_METRICS__;
}

export function incrementMetric(name: string, value = 1) {
  const store = getMetricStore();
  store[name] = (store[name] ?? 0) + value;
  return store[name];
}

export function getMetricsSnapshot() {
  return { ...getMetricStore() };
}

export function renderMetrics() {
  return Object.entries(getMetricStore())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name} ${value}`)
    .join("\n");
}

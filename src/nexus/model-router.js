/**
 * Providers are injected by the application. This module never assumes that a
 * provider is configured, free, reachable, or capable until its adapter says so.
 */
export function selectProvider(task, providers = []) {
  if (!task || !Array.isArray(providers)) {
    return { ok: false, code: "INVALID_ROUTING_INPUT", provider: null };
  }

  const candidates = providers.filter(provider =>
    provider &&
    provider.enabled === true &&
    Array.isArray(provider.capabilities) &&
    provider.capabilities.includes(task.providerCapability) &&
    typeof provider.run === "function"
  );

  candidates.sort((a, b) =>
    (Number(a.priority) || 100) - (Number(b.priority) || 100)
  );

  if (!candidates.length) {
    return { ok: false, code: "NO_CAPABLE_PROVIDER", provider: null };
  }

  return { ok: true, code: "PROVIDER_SELECTED", provider: candidates[0] };
}

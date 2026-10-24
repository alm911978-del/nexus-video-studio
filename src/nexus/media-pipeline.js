/**
 * Media pipeline stubs — provider-neutral.
 * Real generation only happens when a validated media provider is injected.
 */
import { selectMediaProvider, validateMediaProvider } from "./media-provider-contract.js";
import { assertSafeHttpsAssetUrl } from "./security/url-policy.js";

export async function runMediaJob({ providers = [], capability, input = {}, signal } = {}) {
  const selection = selectMediaProvider(providers, capability);
  if (!selection.ok) {
    return {
      ok: false,
      status: selection.status,
      message: "لا يوجد مزود وسائط مفعّل لهذه القدرة.",
      capability
    };
  }

  const check = validateMediaProvider(selection.provider);
  if (!check.valid) {
    return {
      ok: false,
      status: "invalid-provider",
      message: check.errors.join(" "),
      capability
    };
  }

  if (signal?.aborted) {
    return { ok: false, status: "aborted", message: "أُلغيت المهمة." };
  }

  try {
    const result = await selection.provider.adapter({ capability, input, signal });
    // Validate URLs through the shared policy, including credentials and local/private hosts.
    if (!result || typeof result.assetUrl !== "string") {
      return {
        ok: false,
        status: "invalid-result",
        message: "النتيجة يجب أن تحتوي على رابط أصل صالح.",
        capability
      };
    }
    const urlCheck = assertSafeHttpsAssetUrl(result.assetUrl);
    if (!urlCheck.ok) {
      const unsafeReasons = new Set([
        "credentials-in-url", "control-chars", "private-or-local-host"
      ]);
      return {
        ok: false,
        status: unsafeReasons.has(urlCheck.reason) ? "unsafe-url" : "invalid-result",
        message: "رابط الأصل مرفوض وفق سياسة أمان الروابط.",
        reason: urlCheck.reason,
        capability
      };
    }
    return {
      ok: true,
      status: "succeeded",
      capability,
      providerId: selection.provider.id,
      assetUrl: urlCheck.url,
      metadata: result.metadata || {},
      verified: Boolean(result.verified)
    };
  } catch (err) {
    return {
      ok: false,
      status: "provider-error",
      message: "فشل مزود الوسائط في تنفيذ المهمة.",
      capability
    };
  }
}

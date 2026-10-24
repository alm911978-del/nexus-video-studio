/**
 * Media pipeline stubs — provider-neutral.
 * Real generation only happens when a validated media provider is injected.
 */
import { selectMediaProvider, validateMediaProvider } from "./media-provider-contract.js";

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
    // Honest contract: require an absolute HTTPS URL without credentials
    if (!result || typeof result.assetUrl !== "string" || !result.assetUrl.startsWith("https://")) {
      return {
        ok: false,
        status: "invalid-result",
        message: "النتيجة يجب أن تحتوي على رابط HTTPS مطلق للأصل.",
        capability
      };
    }
    if (/[\u0000-\u001F]|@|:\/\/[^/]*:/.test(result.assetUrl)) {
      return {
        ok: false,
        status: "unsafe-url",
        message: "رابط الأصل يحتوي على أحرف غير آمنة أو بيانات اعتماد.",
        capability
      };
    }
    return {
      ok: true,
      status: "succeeded",
      capability,
      providerId: selection.provider.id,
      assetUrl: result.assetUrl,
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

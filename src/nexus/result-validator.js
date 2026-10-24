/**
 * Validates that a provider result matches the expected output kind of a task.
 * Keeps the contract honest: empty or malformed results are rejected.
 */
export function validateTaskResult(raw, task) {
  const issues = [];
  if (raw == null) {
    return { ok: false, issues: ["النتيجة فارغة."], result: null };
  }

  let result = raw;
  if (typeof raw === "object" && raw !== null && "text" in raw) {
    result = raw.text;
  }

  if (typeof result !== "string") {
    issues.push("النتيجة يجب أن تكون نصًا.");
  } else if (!result.trim()) {
    issues.push("النتيجة فارغة بعد التنظيف.");
  } else if (result.length > 100000) {
    issues.push("النتيجة أطول من الحد المسموح.");
  }

  if (issues.length) {
    return { ok: false, issues, result: null };
  }

  return {
    ok: true,
    issues: [],
    result: {
      text: result.trim(),
      outputKind: task?.outputKind || "text",
      length: result.trim().length
    }
  };
}

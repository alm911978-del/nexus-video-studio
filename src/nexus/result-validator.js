export function validateTaskResult(result, task) {
  const issues = [];
  if (!task || typeof task.id !== "string") {
    return { ok: false, issues: ["تعريف المهمة غير صالح."], result: null };
  }
  if (typeof result !== "string" || !result.trim()) {
    issues.push("لم تُرجع الأداة نصًا صالحًا.");
  }
  if (typeof result === "string" && result.length > 50000) {
    issues.push("النتيجة تتجاوز الحد المسموح للعرض.");
  }
  return {
    ok: issues.length === 0,
    issues,
    result: issues.length ? null : result.trim(),
    taskId: task.id,
    outputKind: task.outputKind
  };
}

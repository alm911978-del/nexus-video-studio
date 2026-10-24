/**
 * Text-based continuity helper.
 * Explicitly NOT computer vision. Only compares textual notes.
 */
export function auditContinuity({ previousNotes = "", currentNotes = "", characterLock = null } = {}) {
  const issues = [];
  const prev = (previousNotes || "").toLowerCase();
  const curr = (currentNotes || "").toLowerCase();

  if (characterLock?.name) {
    const name = characterLock.name.toLowerCase();
    if (curr && !curr.includes(name) && !prev.includes(name)) {
      issues.push("اسم الشخصية غير مذكور في ملاحظات الاستمرارية الحالية.");
    }
  }

  if (prev && curr && prev === curr) {
    issues.push("الملاحظات الحالية مطابقة تمامًا للسابقة — قد تحتاج تحديثًا.");
  }

  return {
    ok: issues.length === 0,
    method: "text-only",
    disclaimer: "هذا تدقيق نصي فقط، وليس رؤية حاسوبية.",
    issues
  };
}

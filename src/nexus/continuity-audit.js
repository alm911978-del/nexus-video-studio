const FIELDS = ["face", "hair", "eyes", "marks", "wardrobe", "props", "voice"];

function normalize(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

/**
 * Compares explicitly supplied reference and scene descriptions.
 * This is a text-level checklist, not computer vision and not proof of visual similarity.
 */
export function auditSceneContinuity(reference = {}, scene = {}) {
  const checks = FIELDS.map(field => {
    const expected = normalize(reference[field]);
    const observed = normalize(scene[field]);
    if (!expected) return { field, status: "not-specified", expected: "", observed };
    if (!observed) return { field, status: "not-reviewed", expected, observed: "" };
    return {
      field,
      status: expected === observed ? "match" : "review",
      expected,
      observed
    };
  });
  const reviewed = checks.filter(item => item.status === "match" || item.status === "review");
  const matches = checks.filter(item => item.status === "match").length;
  return {
    schemaVersion: 1,
    checks,
    summary: {
      totalFields: FIELDS.length,
      specifiedFields: checks.filter(item => item.status !== "not-specified").length,
      reviewedFields: reviewed.length,
      matches,
      reviewRequired: checks.filter(item => item.status === "review").map(item => item.field),
      score: reviewed.length ? Math.round((matches / reviewed.length) * 100) : null,
      scoreMeaning: "Text-description agreement only; not a visual identity score."
    }
  };
}

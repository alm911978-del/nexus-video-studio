const MAX_CONTEXT_CHARS = 12000;

/**
 * Creates a bounded context object without inventing facts. The caller decides
 * which saved project fields are authoritative and passes them explicitly.
 */
export function buildProjectContext({ facts = [], preferences = [], notes = [] } = {}) {
  const cleanList = value => Array.isArray(value)
    ? value.filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean)
    : [];

  const context = {
    facts: cleanList(facts),
    preferences: cleanList(preferences),
    notes: cleanList(notes)
  };

  while (JSON.stringify(context).length > MAX_CONTEXT_CHARS) {
    if (context.notes.length) context.notes.pop();
    else if (context.preferences.length) context.preferences.pop();
    else if (context.facts.length) context.facts.pop();
    else break;
  }

  return context;
}

export function formatProjectContext(context = {}) {
  const safe = buildProjectContext(context);
  const sections = [
    ["حقائق مؤكدة", safe.facts],
    ["تفضيلات", safe.preferences],
    ["ملاحظات", safe.notes]
  ];
  return sections
    .filter(([, items]) => items.length)
    .map(([heading, items]) => heading + ":\n- " + items.join("\n- "))
    .join("\n\n");
}

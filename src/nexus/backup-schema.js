const LIMITS = Object.freeze({
  projects: 500,
  characters: 1000,
  scenes: 5000,
  activity: 200,
  id: 100,
  name: 240,
  summary: 6000,
  description: 12000,
  prompt: 20000,
  style: 120,
  ratio: 40
});

const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;
const ALLOWED_RATIOS = new Set(["9:16 عمودي", "16:9 أفقي", "1:1 مربع"]);
const PROMPT_TEXT_FIELDS = [
  "plName", "plFace", "plHairEyes", "plWardrobe", "plRules",
  "plAction", "plWorld", "plCamera", "plLanguage", "plOutput"
];
const PROMPT_TEMPLATES = new Set(["cinematic", "image", "dialogue"]);
const ACTIVITY_TYPES = new Set([
  "project-created", "project-deleted", "character-created", "character-deleted",
  "scene-created", "scene-edited", "scene-deleted", "prompt-generated", "prompt-copied",
  "backup-exported", "backup-imported", "activity-exported", "ai-text-generated"
]);

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function defaultIdFactory() {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return "n-" + random.replace(/-/g, "");
  return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
}

function createSafeId(candidate, usedIds, idFactory) {
  if (typeof candidate === "string" && SAFE_ID.test(candidate) && !usedIds.has(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  let replacement = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const generated = String(idFactory());
    if (SAFE_ID.test(generated) && !usedIds.has(generated)) {
      replacement = generated;
      break;
    }
  }
  if (!replacement) throw new Error("Could not allocate a unique safe record id.");
  usedIds.add(replacement);
  return replacement;
}

function readRecords(value, key, max, warnings) {
  if (!Array.isArray(value)) {
    warnings.push("تم تجاهل قسم غير صالح: " + key + ".");
    return [];
  }
  if (value.length > max) warnings.push("تم تقليص عدد سجلات " + key + " إلى " + max + ".");
  return value.slice(0, max).filter(record => {
    const valid = Boolean(record && typeof record === "object" && !Array.isArray(record));
    if (!valid) warnings.push("تم تجاهل سجل غير صالح في " + key + ".");
    return valid;
  });
}

/**
 * Validates and normalizes a NEXUS VIDEO local database or exported backup.
 * Unknown properties are deliberately dropped; all retained fields are bounded strings.
 */
export function normalizeDatabase(input, { idFactory = defaultIdFactory } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "ملف النسخة الاحتياطية يجب أن يحتوي على كائن JSON." };
  }

  const requiredCollections = ["projects", "characters", "scenes"];
  if (!requiredCollections.every(key => Array.isArray(input[key]))) {
    return { ok: false, error: "النسخة الاحتياطية لا تحتوي على أقسام المشاريع والشخصيات والمشاهد المطلوبة." };
  }

  if (input.schemaVersion !== undefined && (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1)) {
    return { ok: false, error: "رقم إصدار النسخة الاحتياطية غير صالح." };
  }
  if (Number.isInteger(input.schemaVersion) && input.schemaVersion > 1) {
    return { ok: false, error: "هذه النسخة الاحتياطية أحدث من إصدار NEXUS الحالي؛ حدّث الموقع قبل استيرادها." };
  }

  const warnings = [];
  const usedIds = new Set();
  const projectIdMap = new Map();
  const characterIdMap = new Map();

  const projects = readRecords(input.projects, "projects", LIMITS.projects, warnings).flatMap(record => {
    const name = cleanText(record.name, LIMITS.name);
    if (!name) {
      warnings.push("تم تجاهل مشروع بلا اسم.");
      return [];
    }
    const oldId = typeof record.id === "string" ? record.id : "";
    const id = createSafeId(oldId, usedIds, idFactory);
    if (oldId && SAFE_ID.test(oldId) && !projectIdMap.has(oldId)) projectIdMap.set(oldId, id);
    const suppliedRatio = cleanText(record.ratio, LIMITS.ratio);
    return [{
      id,
      name,
      summary: cleanText(record.summary, LIMITS.summary),
      style: cleanText(record.style, LIMITS.style),
      ratio: ALLOWED_RATIOS.has(suppliedRatio) ? suppliedRatio : "9:16 عمودي"
    }];
  });

  const characters = readRecords(input.characters, "characters", LIMITS.characters, warnings).flatMap(record => {
    const name = cleanText(record.name, LIMITS.name);
    if (!name) {
      warnings.push("تم تجاهل شخصية بلا اسم.");
      return [];
    }
    const oldId = typeof record.id === "string" ? record.id : "";
    const id = createSafeId(oldId, usedIds, idFactory);
    if (oldId && SAFE_ID.test(oldId) && !characterIdMap.has(oldId)) characterIdMap.set(oldId, id);
    return [{ id, name, desc: cleanText(record.desc, LIMITS.description) }];
  });

  const scenes = readRecords(input.scenes, "scenes", LIMITS.scenes, warnings).flatMap(record => {
    const name = cleanText(record.name, LIMITS.name);
    const prompt = cleanText(record.prompt, LIMITS.prompt);
    if (!name || !prompt) {
      warnings.push("تم تجاهل مشهد ينقصه الاسم أو الوصف.");
      return [];
    }
    const oldId = typeof record.id === "string" ? record.id : "";
    const id = createSafeId(oldId, usedIds, idFactory);
    const rawProjectId = typeof record.project === "string" ? record.project : "";
    const rawCharacterId = typeof record.character === "string" ? record.character : "";
    const project = projectIdMap.get(rawProjectId) || "";
    const character = characterIdMap.get(rawCharacterId) || "";
    if (rawProjectId && !project) warnings.push("تم فصل مشهد عن مشروع غير موجود.");
    if (rawCharacterId && !character) warnings.push("تم فصل مشهد عن شخصية غير موجودة.");
    return [{ id, name, prompt, project, character }];
  });

  const projectIds = new Set(projects.map(record => record.id));
  const characterIds = new Set(characters.map(record => record.id));
  const draftSource = input.promptLabDraft;
  const promptLabDraft = {};

  if (draftSource && typeof draftSource === "object" && !Array.isArray(draftSource)) {
    for (const field of PROMPT_TEXT_FIELDS) {
      if (typeof draftSource[field] === "string") {
        const clipped = draftSource[field].slice(0, 12000);
        if (clipped.length !== draftSource[field].length) warnings.push("تم تقليص طول مسودة مختبر البرومبتات.");
        promptLabDraft[field] = clipped;
      }
    }

    const template = draftSource.plTemplate;
    if (typeof template === "string") {
      promptLabDraft.plTemplate = PROMPT_TEMPLATES.has(template) ? template : "cinematic";
      if (!PROMPT_TEMPLATES.has(template)) warnings.push("تمت إعادة نوع قالب غير معروف إلى القالب السينمائي.");
    }

    const selectedProject = typeof draftSource.plSavedProject === "string" ? draftSource.plSavedProject : "";
    if (!selectedProject || projectIds.has(selectedProject)) {
      promptLabDraft.plSavedProject = selectedProject;
    } else {
      promptLabDraft.plSavedProject = "";
      warnings.push("تمت إزالة مشروع مختار من مسودة المختبر لأنه غير موجود.");
    }

    const selectedCharacter = typeof draftSource.plSavedCharacter === "string" ? draftSource.plSavedCharacter : "";
    if (!selectedCharacter || characterIds.has(selectedCharacter)) {
      promptLabDraft.plSavedCharacter = selectedCharacter;
    } else {
      promptLabDraft.plSavedCharacter = "";
      warnings.push("تمت إزالة شخصية مختارة من مسودة المختبر لأنها غير موجودة.");
    }
  }

  let rawActivity = [];
  if (input.activity !== undefined) {
    if (!Array.isArray(input.activity)) {
      warnings.push("تم تجاهل سجل نشاط غير صالح.");
    } else {
      if (input.activity.length > LIMITS.activity) warnings.push("تم الاحتفاظ بآخر " + LIMITS.activity + " عملية فقط.");
      rawActivity = input.activity.slice(-LIMITS.activity).filter(record => {
        const valid = Boolean(record && typeof record === "object" && !Array.isArray(record));
        if (!valid) warnings.push("تم تجاهل عملية نشاط غير صالحة.");
        return valid;
      });
    }
  }

  const activity = rawActivity.flatMap(record => {
    const type = cleanText(record.type, 80);
    const title = cleanText(record.title, 200);
    const detail = cleanText(record.detail, 800);
    const timestamp = typeof record.at === "string" ? Date.parse(record.at) : NaN;
    if (!ACTIVITY_TYPES.has(type) || !title || !Number.isFinite(timestamp)) {
      warnings.push("تم تجاهل عملية نشاط ينقصها النوع أو العنوان أو الوقت الصحيح.");
      return [];
    }
    const activityId = createSafeId(typeof record.id === "string" ? record.id : "", usedIds, idFactory);
    return [{ id: activityId, type, title, detail, at: new Date(timestamp).toISOString() }];
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return {
    ok: true,
    data: { projects, characters, scenes, promptLabDraft, activity },
    warnings: [...new Set(warnings)]
  };
}

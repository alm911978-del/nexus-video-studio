/**
 * NEXUS Reference Library — local-only rules, reference images, videos, attachments.
 * Strict size/count limits. No upload to any server. No generation claims.
 */

const MAX_RULES = 40;
const MAX_RULE_LEN = 2000;
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 450 * 1024; // ~450KB data URL budget per image after compress
const MAX_VIDEOS = 8;
const MAX_ATTACHMENTS = 20;
const MAX_NAME = 120;

function uid(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function cleanText(s, max) {
  if (typeof s !== "string") return "";
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim().slice(0, max);
}

export function emptyReferenceState() {
  return {
    rules: [],
    images: [],
    videos: [],
    attachments: [],
    updatedAt: null
  };
}

/** Normalize legacy/partial state from storage */
export function normalizeReferenceState(raw) {
  const base = emptyReferenceState();
  if (!raw || typeof raw !== "object") return base;
  base.rules = Array.isArray(raw.rules)
    ? raw.rules
        .filter(r => r && typeof r === "object")
        .slice(0, MAX_RULES)
        .map(r => ({
          id: cleanText(r.id || uid("rule"), 64),
          title: cleanText(r.title || "قاعدة", MAX_NAME),
          body: cleanText(r.body || "", MAX_RULE_LEN),
          priority: typeof r.priority === "number" ? r.priority : 100,
          locked: Boolean(r.locked)
        }))
    : [];
  base.images = Array.isArray(raw.images)
    ? raw.images
        .filter(i => i && typeof i.dataUrl === "string" && i.dataUrl.startsWith("data:image/"))
        .slice(0, MAX_IMAGES)
        .map(i => ({
          id: cleanText(i.id || uid("img"), 64),
          name: cleanText(i.name || "صورة", MAX_NAME),
          role: cleanText(i.role || "reference", 40),
          dataUrl: i.dataUrl.slice(0, MAX_IMAGE_BYTES * 2),
          width: i.width || null,
          height: i.height || null,
          addedAt: i.addedAt || null
        }))
    : [];
  base.videos = Array.isArray(raw.videos)
    ? raw.videos.slice(0, MAX_VIDEOS).map(v => ({
        id: cleanText(v.id || uid("vid"), 64),
        name: cleanText(v.name || "فيديو", MAX_NAME),
        role: cleanText(v.role || "reference", 40),
        mime: cleanText(v.mime || "", 80),
        size: typeof v.size === "number" ? v.size : 0,
        duration: typeof v.duration === "number" ? v.duration : null,
        note: cleanText(v.note || "", 500),
        // Binary not persisted — user re-selects if needed
        persisted: false,
        addedAt: v.addedAt || null
      }))
    : [];
  base.attachments = Array.isArray(raw.attachments)
    ? raw.attachments.slice(0, MAX_ATTACHMENTS).map(a => ({
        id: cleanText(a.id || uid("file"), 64),
        name: cleanText(a.name || "ملف", MAX_NAME),
        mime: cleanText(a.mime || "", 80),
        size: typeof a.size === "number" ? a.size : 0,
        note: cleanText(a.note || "", 500),
        addedAt: a.addedAt || null
      }))
    : [];
  base.updatedAt = raw.updatedAt || null;
  return base;
}

export function addRule(state, { title, body, priority = 100, locked = false }) {
  const next = normalizeReferenceState(state);
  if (next.rules.length >= MAX_RULES) {
    return { ok: false, code: "MAX_RULES", message: "بلغت الحد الأقصى للقواعد (" + MAX_RULES + ")." };
  }
  const rule = {
    id: uid("rule"),
    title: cleanText(title || "قاعدة", MAX_NAME),
    body: cleanText(body || "", MAX_RULE_LEN),
    priority: typeof priority === "number" ? priority : 100,
    locked: Boolean(locked)
  };
  if (!rule.body) return { ok: false, code: "EMPTY_RULE", message: "اكتب نص القاعدة." };
  next.rules.push(rule);
  next.updatedAt = new Date().toISOString();
  return { ok: true, state: next, rule };
}

export function removeRule(state, id) {
  const next = normalizeReferenceState(state);
  const rule = next.rules.find(r => r.id === id);
  if (rule && rule.locked) {
    return { ok: false, code: "LOCKED", message: "هذه القاعدة مقفلة ولا يمكن حذفها." };
  }
  next.rules = next.rules.filter(r => r.id !== id);
  next.updatedAt = new Date().toISOString();
  return { ok: true, state: next };
}

/**
 * Compress image File to a bounded data URL via canvas.
 */
export function fileToBoundedDataUrl(file, { maxEdge = 1280, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("NOT_IMAGE"));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("FILE_TOO_LARGE"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        // If still too big, reduce quality
        let q = quality;
        while (dataUrl.length > MAX_IMAGE_BYTES * 1.37 && q > 0.45) {
          q -= 0.12;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        URL.revokeObjectURL(url);
        if (dataUrl.length > MAX_IMAGE_BYTES * 1.5) {
          reject(new Error("COMPRESS_FAILED"));
          return;
        }
        resolve({ dataUrl, width: w, height: h });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    img.src = url;
  });
}

export async function addReferenceImage(state, file, { role = "reference" } = {}) {
  const next = normalizeReferenceState(state);
  if (next.images.length >= MAX_IMAGES) {
    return { ok: false, code: "MAX_IMAGES", message: "الحد الأقصى للصور المرجعية هو " + MAX_IMAGES + "." };
  }
  try {
    const { dataUrl, width, height } = await fileToBoundedDataUrl(file);
    const item = {
      id: uid("img"),
      name: cleanText(file.name || "صورة", MAX_NAME),
      role: cleanText(role, 40),
      dataUrl,
      width,
      height,
      addedAt: new Date().toISOString()
    };
    next.images.push(item);
    next.updatedAt = item.addedAt;
    return { ok: true, state: next, item };
  } catch (e) {
    const code = e && e.message ? e.message : "IMAGE_ERROR";
    return {
      ok: false,
      code,
      message:
        code === "FILE_TOO_LARGE"
          ? "الصورة أكبر من 12 ميجابايت."
          : code === "COMPRESS_FAILED"
            ? "تعذّر ضغط الصورة ضمن الحد المسموح."
            : "تعذّر قراءة الصورة."
    };
  }
}

export function removeReferenceImage(state, id) {
  const next = normalizeReferenceState(state);
  next.images = next.images.filter(i => i.id !== id);
  next.updatedAt = new Date().toISOString();
  return { ok: true, state: next };
}

export function addReferenceVideoMeta(state, file, { role = "reference", note = "" } = {}) {
  const next = normalizeReferenceState(state);
  if (next.videos.length >= MAX_VIDEOS) {
    return { ok: false, code: "MAX_VIDEOS", message: "الحد الأقصى للفيديوهات المرجعية هو " + MAX_VIDEOS + "." };
  }
  if (!file || !String(file.type || "").startsWith("video/")) {
    return { ok: false, code: "NOT_VIDEO", message: "اختر ملف فيديو." };
  }
  const item = {
    id: uid("vid"),
    name: cleanText(file.name || "فيديو", MAX_NAME),
    role: cleanText(role, 40),
    mime: cleanText(file.type || "", 80),
    size: file.size || 0,
    duration: null,
    note: cleanText(note, 500),
    persisted: false,
    addedAt: new Date().toISOString()
  };
  next.videos.push(item);
  next.updatedAt = item.addedAt;
  return {
    ok: true,
    state: next,
    item,
    notice: "يُحفظ اسم الفيديو ومعلوماته فقط محليًا. الملف نفسه لا يُرفع ولا يُخزَّن في localStorage لتفادي امتلاء المتصفح."
  };
}

export function removeReferenceVideo(state, id) {
  const next = normalizeReferenceState(state);
  next.videos = next.videos.filter(v => v.id !== id);
  next.updatedAt = new Date().toISOString();
  return { ok: true, state: next };
}

export function addAttachmentMeta(state, file, { note = "" } = {}) {
  const next = normalizeReferenceState(state);
  if (next.attachments.length >= MAX_ATTACHMENTS) {
    return { ok: false, code: "MAX_FILES", message: "الحد الأقصى للمرفقات هو " + MAX_ATTACHMENTS + "." };
  }
  if (!file) return { ok: false, code: "NO_FILE", message: "لم يُختر ملف." };
  const item = {
    id: uid("file"),
    name: cleanText(file.name || "ملف", MAX_NAME),
    mime: cleanText(file.type || "application/octet-stream", 80),
    size: file.size || 0,
    note: cleanText(note, 500),
    addedAt: new Date().toISOString()
  };
  next.attachments.push(item);
  next.updatedAt = item.addedAt;
  return {
    ok: true,
    state: next,
    item,
    notice: "يُحفظ اسم الملف وحجمه فقط. المحتوى لا يُرفع إلى خادم."
  };
}

export function removeAttachment(state, id) {
  const next = normalizeReferenceState(state);
  next.attachments = next.attachments.filter(a => a.id !== id);
  next.updatedAt = new Date().toISOString();
  return { ok: true, state: next };
}

/** Build a text block of locked rules for prompt context */
export function formatRulesForPrompt(state, maxChars = 3000) {
  const next = normalizeReferenceState(state);
  const lines = next.rules
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(r => "- " + r.title + ": " + r.body);
  let text = lines.join("\n");
  if (text.length > maxChars) text = text.slice(0, maxChars) + "…";
  return text;
}

export const REFERENCE_LIMITS = Object.freeze({
  MAX_RULES,
  MAX_RULE_LEN,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_VIDEOS,
  MAX_ATTACHMENTS
});

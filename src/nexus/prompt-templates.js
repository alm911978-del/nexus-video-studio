/**
 * Reusable prompt templates for cinematic, image-to-video and dialogue work.
 * These are text templates only. They do not generate video.
 */
export const TEMPLATES = Object.freeze({
  cinematic: {
    id: "cinematic",
    label: "مشهد سينمائي",
    build({ character = "", scene = "", mood = "", camera = "" } = {}) {
      return [
        "اكتب وصف مشهد سينمائي احترافي باللغة العربية.",
        character ? `الشخصية: ${character}` : null,
        scene ? `المشهد: ${scene}` : null,
        mood ? `المزاج: ${mood}` : null,
        camera ? `حركة الكاميرا: ${camera}` : null,
        "ركز على الإضاءة، التكوين، والحركة. لا تكتب حوارًا إلا إذا طُلب."
      ].filter(Boolean).join("\n");
    }
  },
  imageToVideo: {
    id: "image-to-video",
    label: "تحويل صورة إلى فيديو",
    build({ imageDescription = "", motion = "", duration = "4s" } = {}) {
      return [
        "صف حركة فيديو قصيرة انطلاقًا من صورة ثابتة.",
        imageDescription ? `وصف الصورة: ${imageDescription}` : null,
        motion ? `الحركة المطلوبة: ${motion}` : null,
        `المدة المستهدفة: ${duration}`,
        "كن محددًا في اتجاه الحركة وسرعة الكاميرا."
      ].filter(Boolean).join("\n");
    }
  },
  dialogue: {
    id: "dialogue",
    label: "حوار مشهد",
    build({ characterA = "", characterB = "", context = "", tone = "" } = {}) {
      return [
        "اكتب حوارًا طبيعيًا بين شخصيتين.",
        characterA ? `الشخصية أ: ${characterA}` : null,
        characterB ? `الشخصية ب: ${characterB}` : null,
        context ? `السياق: ${context}` : null,
        tone ? `النبرة: ${tone}` : null,
        "اجعل الحوار مناسبًا للشاشة وموجزًا."
      ].filter(Boolean).join("\n");
    }
  }
});

export function getTemplate(id) {
  return TEMPLATES[id] || null;
}

export function listTemplates() {
  return Object.values(TEMPLATES).map(t => ({ id: t.id, label: t.label }));
}

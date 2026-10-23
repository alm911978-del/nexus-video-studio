export const TASKS = Object.freeze({
  series: Object.freeze({ id: "series", label: "تطوير مسلسل", providerCapability: "text", outputKind: "development-bible" }),
  episode: Object.freeze({ id: "episode", label: "كتابة حلقة", providerCapability: "text", outputKind: "episode-script" }),
  continuity: Object.freeze({ id: "continuity", label: "تدقيق الاستمرارية", providerCapability: "text", outputKind: "continuity-report" }),
  "scene-prompt": Object.freeze({ id: "scene-prompt", label: "وصف مشهد سينمائي", providerCapability: "text", outputKind: "scene-prompt" })
});

export function getTask(taskId) {
  return typeof taskId === "string" ? TASKS[taskId] ?? null : null;
}

export function listTasks() {
  return Object.values(TASKS).map(task => ({ ...task }));
}

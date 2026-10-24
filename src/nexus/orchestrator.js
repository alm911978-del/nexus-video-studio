import { getTask } from "./task-registry.js";
import { selectProvider } from "./model-router.js";
import { buildProjectContext, formatProjectContext } from "./project-context.js";
import { validateTaskResult } from "./result-validator.js";

export async function runTask({ taskId, prompt, providers = [], context = {}, signal } = {}) {
  const task = getTask(taskId);
  if (!task) {
    return { ok: false, status: "failed", code: "UNKNOWN_TASK", message: "المهمة غير معروفة." };
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return { ok: false, status: "failed", code: "EMPTY_PROMPT", message: "اكتب وصف المهمة أولًا." };
  }
  if (signal?.aborted) {
    return { ok: false, status: "failed", code: "ABORTED", message: "أُلغيت المهمة قبل البدء." };
  }

  const route = selectProvider(task, providers);
  if (!route.ok) {
    return {
      ok: false,
      status: "failed",
      code: route.code,
      message: "لا توجد أداة مفعّلة ومؤهلة لهذه المهمة.",
      taskId
    };
  }

  const safeContext = buildProjectContext(context);
  const contextText = formatProjectContext(safeContext);
  const input = contextText
    ? "سياق المشروع (ميّز الحقائق عن الملاحظات):\n" + contextText + "\n\nالمهمة:\n" + prompt.trim()
    : prompt.trim();

  try {
    const raw = await route.provider.run({ task, prompt: input, signal });
    const validation = validateTaskResult(raw, task);
    if (!validation.ok) {
      return {
        ok: false,
        status: "failed",
        code: "INVALID_PROVIDER_RESULT",
        message: validation.issues.join(" "),
        taskId,
        providerId: route.provider.id ?? "unnamed"
      };
    }
    return {
      ok: true,
      status: "succeeded",
      taskId,
      providerId: route.provider.id ?? "unnamed",
      outputKind: task.outputKind,
      result: validation.result
    };
  } catch {
    return {
      ok: false,
      status: "failed",
      code: "PROVIDER_ERROR",
      message: "تعذّر تنفيذ المهمة عبر الأداة المختارة.",
      taskId,
      providerId: route.provider.id ?? "unnamed"
    };
  }
}

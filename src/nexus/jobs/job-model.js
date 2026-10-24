/**
 * Shared job lifecycle model for UI, orchestrator, and future engine clients.
 * Status values are stable contracts — do not invent silent success states.
 */

export const JOB_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
  TIMED_OUT: "timed_out",
  NOT_CONFIGURED: "not_configured"
});

const TERMINAL = new Set([
  JOB_STATUS.SUCCEEDED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELLED,
  JOB_STATUS.TIMED_OUT,
  JOB_STATUS.NOT_CONFIGURED
]);

/**
 * @typedef {Object} NexusJob
 * @property {string} id
 * @property {string} type
 * @property {string} status
 * @property {number} createdAt
 * @property {number} [updatedAt]
 * @property {string} [errorCode]
 * @property {string} [errorMessage]
 * @property {object} [result]
 * @property {object} [meta]
 */

export function createJob({ id, type, meta = {} }) {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("job id is required");
  }
  if (typeof type !== "string" || !type.trim()) {
    throw new Error("job type is required");
  }
  const now = Date.now();
  return Object.seal({
    id: id.trim(),
    type: type.trim(),
    status: JOB_STATUS.QUEUED,
    createdAt: now,
    updatedAt: now,
    errorCode: null,
    errorMessage: null,
    result: null,
    meta: { ...meta }
  });
}

export function transitionJob(job, nextStatus, patch = {}) {
  if (!job || typeof job !== "object") {
    return { ok: false, code: "INVALID_JOB" };
  }
  if (!Object.values(JOB_STATUS).includes(nextStatus)) {
    return { ok: false, code: "INVALID_STATUS" };
  }
  if (TERMINAL.has(job.status) && nextStatus !== job.status) {
    return { ok: false, code: "ALREADY_TERMINAL", status: job.status };
  }
  job.status = nextStatus;
  job.updatedAt = Date.now();
  if (patch.errorCode !== undefined) job.errorCode = patch.errorCode;
  if (patch.errorMessage !== undefined) job.errorMessage = patch.errorMessage;
  if (patch.result !== undefined) job.result = patch.result;
  if (patch.meta && typeof patch.meta === "object") {
    job.meta = { ...job.meta, ...patch.meta };
  }
  return { ok: true, job };
}

export function isTerminal(status) {
  return TERMINAL.has(status);
}

export function jobSummary(job) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    errorCode: job.errorCode,
    hasResult: job.result != null
  };
}

const MODEL = "gemini-3.8-flash";
const MAX_BODY_BYTES = 20_000;
const MAX_PROMPT_CHARS = 12_000;
const MAX_DAILY_REQUESTS_PER_IP = 30;
const ALLOWED_ACTIONS = new Set(["series", "episode", "continuity", "scene-prompt", "general"]);

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "access-control-allow-origin": origin,
      "vary": "Origin"
    }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : "";
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function response(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...corsHeaders(origin)
    }
  });
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function verifyTurnstile(token, ip, env) {
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  if (!env.TURNSTILE_SECRET_KEY) return false;
  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token
  });
  if (ip !== "unknown") form.set("remoteip", ip);
  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5000)
    });
    if (!result.ok) return false;
    const data = await result.json();
    if (!data.success) return false;
    if (env.TURNSTILE_HOSTNAME && data.hostname !== env.TURNSTILE_HOSTNAME) return false;
    return true;
  } catch {
    return false;
  }
}

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMITS) return false;
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + day));
  const key = "rl:" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  const current = Number(await env.RATE_LIMITS.get(key) || "0");
  if (current >= MAX_DAILY_REQUESTS_PER_IP) return true;
  await env.RATE_LIMITS.put(key, String(current + 1), { expirationTtl: 172800 });
  return false;
}

function systemInstruction(action) {
  const common = "أنت NEXUS Ω، مساعد تطوير درامي وسينمائي. أجب باللغة العربية ما لم يطلب المستخدم غير ذلك. حافظ على اتساق الشخصيات والزمن والمكان. افصل الحقائق التي قدمها المستخدم عن الاقتراحات. لا تدّعِ أنك أنشأت فيديو أو ملفًا أو نفذت إجراءً خارجيًا. تجنب الحشو، ونظم النتيجة بعناوين واضحة، واطلب التوضيح فقط عند وجود نقص يمنع تنفيذ المهمة.";
  const tasks = {
    series: "المهمة: تطوير مسلسل. قدّم ملف تطوير متماسكًا، دليل شخصيات، قواعد العالم، خريطة الحلقات، مشاهد قابلة للتصوير، ودليل استمرارية.",
    episode: "المهمة: كتابة حلقة كاملة. ابدأ بملخص قصير، ثم مشاهد مرقمة مع المكان والوقت والفعل المرئي والحوار والصوت والإضاءة والكاميرا، واختم بتدقيق الاستمرارية.",
    continuity: "المهمة: تدقيق الاستمرارية. أنشئ جدولًا للحقائق المؤكدة والتناقضات والمعلومات الناقصة والمخاطر، ولا تخترع حقائق لتغطية نقص البيانات.",
    "scene-prompt": "المهمة: تحويل وصف المشهد إلى Prompt سينمائي عملي. حدّد الشخصية الثابتة، الفعل، المكان، حركة الكاميرا، الإضاءة، الجو، الصوت، ونقاط الاستمرارية. اكتب نسخة إنجليزية قصيرة مناسبة لأدوات الفيديو.",
    general: "المهمة: مساعد عام متعدد المجالات. ساعد في المعرفة والشرح والكتابة والترجمة والتلخيص والتخطيط والبرمجة والتحليل وحل المشكلات والإبداع. اطرح سؤال توضيح واحدًا فقط عندما يكون نقص المعلومات مؤثرًا. ميّز بين الحقائق والاستنتاجات والاقتراحات، واذكر عدم اليقين عند الحاجة. لا تدّعِ تصفح الإنترنت أو استخدام أدوات أو تنفيذ إجراءات أو تعديل ملفات إذا لم يحدث ذلك. في المعلومات الطبية أو القانونية أو المالية، قدّم معلومات عامة متحفظة ونبّه إلى حدودها. أجب مباشرة وبشكل منظم، وباللغة التي يستخدمها المستخدم ما لم يطلب غيرها."
  };
  return common + "\n" + tasks[action];
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    const rawOrigin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (!origin) return json({ error: "Origin not allowed." }, 403);
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return response({ ok: true, service: "NEXUS Gemini Gateway", model: MODEL, auth: "turnstile-required" }, 200, origin);
    }
    if (request.method !== "POST" || url.pathname !== "/api/generate") {
      return response({ error: "Not found." }, 404, origin);
    }
    if (!env.GEMINI_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.RATE_LIMITS) {
      return response({ error: "Server configuration incomplete. Check secrets and RATE_LIMITS KV binding." }, 503, origin);
    }
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return response({ error: "Content-Type must be application/json." }, 415, origin);
    }
    const length = Number(request.headers.get("content-length") || "0");
    if (length > MAX_BODY_BYTES) return response({ error: "Request too large." }, 413, origin);
    let body;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return response({ error: "Request too large." }, 413, origin);
      body = JSON.parse(raw);
    } catch {
      return response({ error: "Invalid JSON body." }, 400, origin);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return response({ error: "JSON object required." }, 400, origin);
    const action = body.action;
    const prompt = body.prompt;
    const token = body.turnstileToken;
    if (!ALLOWED_ACTIONS.has(action)) return response({ error: "Unsupported action." }, 400, origin);
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
      return response({ error: "Prompt must be between 1 and 12000 characters." }, 400, origin);
    }
    const ip = clientIp(request);
    if (!await verifyTurnstile(token, ip, env)) return response({ error: "Security check failed. Complete Turnstile and try again." }, 403, origin);
    try {
      if (await checkRateLimit(ip, env)) return response({ error: "Daily request limit reached for this network. Try again tomorrow." }, 429, origin);
    } catch {
      return response({ error: "Rate-limit service unavailable; request rejected safely." }, 503, origin);
    }
    let upstream;
    try {
      upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction(action) }] },
          contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
          generationConfig: { maxOutputTokens: 8192 }
        }),
        signal: AbortSignal.timeout(55_000)
      });
    } catch {
      return response({ error: "Gemini request timed out or could not connect. Try again." }, 504, origin);
    }
    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 429) return response({ error: "Gemini rate limit or free quota reached. Wait and retry." }, 429, origin);
      if (status === 401 || status === 403) return response({ error: "Gemini rejected the server API key. Check the secret in Cloudflare." }, 502, origin);
      return response({ error: "Gemini returned an upstream error.", upstreamStatus: status }, 502, origin);
    }
    let result;
    try {
      result = await upstream.json();
    } catch {
      return response({ error: "Gemini returned invalid JSON." }, 502, origin);
    }
    const text = (result.candidates?.[0]?.content?.parts || []).filter(p => typeof p.text === "string").map(p => p.text).join("").trim();
    if (!text) return response({ error: "Gemini returned no text. The request may have been blocked or truncated." }, 502, origin);
    return response({ ok: true, model: MODEL, text, usage: result.usageMetadata || null }, 200, origin);
  }
};

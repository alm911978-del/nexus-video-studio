import {
  emptyReferenceState, normalizeReferenceState,
  addRule, removeRule, addReferenceImage, removeReferenceImage,
  addReferenceVideoMeta, removeReferenceVideo,
  addAttachmentMeta, removeAttachment, REFERENCE_LIMITS, formatRulesForPrompt
} from './reference-library.js';

const KEY = 'nexus-video-50-local-v4';
const emptyDB = () => ({ projects: [], characters: [], scenes: [], references: emptyReferenceState() });
let db = emptyDB();
let mediaUrls = [];

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    db = {
      projects: Array.isArray(p.projects) ? p.projects : [],
      characters: Array.isArray(p.characters) ? p.characters : [],
      scenes: Array.isArray(p.scenes) ? p.scenes : [],
      references: normalizeReferenceState(p.references)
    };
  } catch {
    db = emptyDB();
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch { alert('تعذّر الحفظ — التخزين قد يكون ممتلئًا.'); }
}
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function fmtSize(n) {
  if (!n || n < 1024) return (n || 0) + ' B';
  if (n < 1e6) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1e6).toFixed(2) + ' MB';
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === false || v == null) {}
    else node.setAttribute(k, v === true ? '' : String(v));
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function buildShell() {
  const root = $('root');
  root.innerHTML = '';
  const app = el('main', { className: 'app' });

  app.appendChild(el('header', { className: 'top' }, [
    el('div', { className: 'brand' }, [
      el('div', { className: 'logo', text: 'NΩ' }),
      el('div', {}, [
        el('h1', { text: 'NEXUS VIDEO 5.0' }),
        el('div', { className: 'muted', text: 'استوديو صناعة الأفلام بالذكاء الاصطناعي' })
      ])
    ]),
    el('span', { className: 'pill', text: 'Prototype 0.4 · محلي · آمن' })
  ]));

  const auth = el('section', { id: 'authGate', className: 'auth-shell' });
  auth.appendChild(el('div', { className: 'auth-card' }, [
    el('div', { className: 'brand' }, [
      el('div', { className: 'logo', text: 'NΩ' }),
      el('div', {}, [el('h2', { text: 'NEXUS' }), el('div', { className: 'muted', text: 'ادخل محليًا بدون حساب' })])
    ]),
    el('div', { className: 'notice', html: '<strong>شفافية:</strong> المشاريع والمراجع في متصفحك فقط. لا توليد فيديو حي هنا.' }),
    el('button', { id: 'authLocalMode', className: 'primary', type: 'button', text: 'المتابعة محليًا بدون حساب', style: 'width:100%;margin-top:12px' }),
    el('p', { className: 'muted', text: 'لا تضع مفاتيح API في الواجهة.', style: 'font-size:12px;margin-top:12px' })
  ]));
  app.appendChild(auth);

  const workspace = el('div', { id: 'appWorkspace', hidden: true });
  workspace.appendChild(el('div', { className: 'notice', html: '<strong>تنبيه:</strong> القواعد والصور المرجعية محلية. توليد الفيديو غير موصول.' }));

  const layout = el('div', { className: 'layout' });
  const nav = el('nav', { className: 'panel nav', 'aria-label': 'التنقل' });
  const pages = [
    ['projects', 'المشاريع'], ['characters', 'الشخصيات'], ['scenes', 'المشاهد'],
    ['references', 'المراجع والقواعد'], ['media', 'مختبر الوسائط'],
    ['writer', 'كاتب المسلسلات'], ['engine', 'حالة المحركات'], ['backup', 'النسخ الاحتياطي']
  ];
  pages.forEach(([id, label], i) => {
    nav.appendChild(el('button', {
      className: i === 0 ? 'active' : '',
      'data-page': id,
      type: 'button',
      text: label
    }));
  });
  layout.appendChild(nav);

  const main = el('div', { id: 'mainPages' });
  main.innerHTML = `
<section id="projects" class="page active">
  <div class="row"><h2>مشاريعي</h2><button class="primary" id="newProject" type="button">＋ مشروع</button></div>
  <div id="projectList" class="grid"></div>
  <div id="projectForm" class="card" hidden>
    <label>اسم المشروع</label><input id="pName" maxlength="120">
    <label>الملخص</label><textarea id="pSummary" maxlength="4000"></textarea>
    <div class="row" style="margin-top:10px"><button class="primary" id="saveProject" type="button">حفظ</button><button id="cancelProject" type="button">إلغاء</button></div>
  </div>
</section>
<section id="characters" class="page">
  <div class="row"><h2>الشخصيات</h2><button class="primary" id="newCharacter" type="button">＋ شخصية</button></div>
  <div id="characterForm" class="card" hidden>
    <label>الاسم</label><input id="cName" maxlength="120">
    <label>الوصف الثابت</label><textarea id="cDesc" maxlength="2500" placeholder="الوجه، الشعر، الملابس..."></textarea>
    <div class="row" style="margin-top:10px"><button class="primary" id="saveCharacter" type="button">حفظ</button><button id="cancelCharacter" type="button">إلغاء</button></div>
  </div>
  <div id="characterList" class="grid"></div>
</section>
<section id="scenes" class="page">
  <div class="row"><h2>المشاهد</h2><button class="primary" id="newScene" type="button">＋ مشهد</button></div>
  <div id="sceneForm" class="card" hidden>
    <label>اسم المشهد</label><input id="sName" maxlength="120">
    <label>الوصف / Prompt</label><textarea id="sPrompt" maxlength="8000"></textarea>
    <div class="row" style="margin-top:10px"><button class="primary" id="saveScene" type="button">حفظ</button><button id="cancelScene" type="button">إلغاء</button></div>
  </div>
  <div id="sceneList" class="grid"></div>
</section>
<section id="references" class="page">
  <div class="row"><h2>المراجع والقواعد</h2><span class="pill">محلي · بلا رفع</span></div>
  <p class="muted">قواعد ثابتة، صور مرجعية مضغوطة، وسجلات فيديو وملفات. لا يُرفع شيء إلى خادم.</p>
  <div class="notice"><strong>الحدود:</strong> 40 قاعدة · 12 صورة · 8 فيديوهات (تعريف فقط) · 20 مرفقًا</div>
  <div class="card stack">
    <h3>قواعد المشروع</h3>
    <label>عنوان القاعدة</label><input id="refRuleTitle" maxlength="120" placeholder="مثال: لون شعر الشخصية">
    <label>الأولوية</label><input id="refRulePriority" type="number" value="100" min="0" max="999">
    <label>نص القاعدة</label><textarea id="refRuleBody" maxlength="2000"></textarea>
    <button class="primary" id="refAddRule" type="button">إضافة قاعدة</button>
    <div id="refRulesList" class="stack"></div>
  </div>
  <div class="card stack" style="margin-top:14px">
    <h3>صور مرجعية</h3>
    <label>اختر صورًا</label><input id="refImageFiles" type="file" accept="image/*" multiple>
    <label>الدور</label>
    <select id="refImageRole"><option value="character">شخصية</option><option value="location">مكان</option><option value="style">أسلوب</option><option value="reference">مرجع</option></select>
    <p id="refImageStatus" class="muted" role="status">لا صور بعد.</p>
    <div id="refImageGrid" class="grid"></div>
  </div>
  <div class="card stack" style="margin-top:14px">
    <h3>فيديوهات مرجعية</h3>
    <p class="muted">يُحفظ الاسم والحجم فقط — الملف لا يُخزَّن في localStorage.</p>
    <label>اختر فيديوهات</label><input id="refVideoFiles" type="file" accept="video/*" multiple>
    <label>الدور</label>
    <select id="refVideoRole"><option value="motion">حركة</option><option value="scene">مشهد</option><option value="reference">مرجع</option></select>
    <p id="refVideoStatus" class="muted" role="status">لا سجلات.</p>
    <div id="refVideoList" class="stack"></div>
  </div>
  <div class="card stack" style="margin-top:14px">
    <h3>ملفات ومرفقات</h3>
    <label>اختر ملفات</label><input id="refAttachFiles" type="file" multiple>
    <p id="refAttachStatus" class="muted" role="status">لا مرفقات.</p>
    <div id="refAttachList" class="stack"></div>
  </div>
  <div class="card stack" style="margin-top:14px">
    <h3>تصدير / استيراد</h3>
    <div class="row">
      <button id="refExport" type="button">تصدير JSON</button>
      <button id="refClearAll" class="danger" type="button">مسح المكتبة</button>
    </div>
    <label>استيراد JSON</label><input id="refImportFile" type="file" accept="application/json,.json">
    <p id="refLibStatus" class="muted" role="status">جاهز.</p>
  </div>
</section>
<section id="media" class="page">
  <h2>مختبر الوسائط</h2>
  <p class="muted">معاينة محلية فقط — بلا رفع.</p>
  <div class="card stack">
    <label>ملفات</label><input id="mediaFiles" type="file" accept="image/*,video/*,audio/*" multiple>
    <p id="mediaStatus" class="muted" role="status">لم تختر ملفات.</p>
    <div id="mediaResults" class="grid"></div>
  </div>
</section>
<section id="writer" class="page">
  <h2>كاتب المسلسلات</h2>
  <div class="card stack">
    <label>فكرة المسلسل</label><textarea id="wIdea" maxlength="8000"></textarea>
    <label>قيود إضافية</label><textarea id="wNotes" maxlength="4000"></textarea>
    <button class="primary" id="buildWriter" type="button">إنشاء ملف تطوير محلي</button>
    <label>النتيجة</label><textarea id="wOutput" style="min-height:220px" readonly></textarea>
  </div>
</section>
<section id="engine" class="page">
  <h2>حالة المحركات</h2>
  <div class="item"><h3>المشاريع والمراجع</h3><span class="pill">متاح محليًا</span></div>
  <div class="item"><h3>توليد الفيديو</h3><span class="pill">غير متصل</span><p class="muted">VIDEO_ENGINE_NOT_CONFIGURED</p></div>
  <div class="item"><h3>بوابة النصوص</h3><span class="pill">اختياري</span><p class="muted">Cloudflare Worker + Turnstile عند النشر.</p></div>
</section>
<section id="backup" class="page">
  <h2>النسخ الاحتياطي</h2>
  <div class="card stack">
    <button id="exportAll" class="primary" type="button">تصدير كل البيانات JSON</button>
    <label>استيراد JSON</label><input id="importAll" type="file" accept="application/json,.json">
    <p id="backupStatus" class="muted" role="status">التصدير محلي فقط.</p>
  </div>
</section>`;
  layout.appendChild(main);
  workspace.appendChild(layout);
  workspace.appendChild(el('div', { className: 'footer', text: 'NEXUS Ω · لا مفاتيح API في الواجهة · البيانات في هذا المتصفح فقط' }));
  app.appendChild(workspace);
  root.appendChild(app);
}

function bindNav() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-page]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const page = $(btn.getAttribute('data-page'));
      if (page) page.classList.add('active');
      if (btn.getAttribute('data-page') === 'references') renderRefs();
    });
  });
}

function refState() {
  db.references = normalizeReferenceState(db.references);
  return db.references;
}

function renderProjects() {
  const elList = $('projectList');
  elList.innerHTML = db.projects.length
    ? db.projects.map(p => `<div class="item"><h3>${esc(p.name)}</h3><p class="muted">${esc(p.summary || '')}</p><button type="button" data-del-p="${p.id}" class="danger">حذف</button></div>`).join('')
    : '<div class="empty">لا مشاريع بعد</div>';
  elList.querySelectorAll('[data-del-p]').forEach(b => {
    b.onclick = () => { db.projects = db.projects.filter(x => x.id !== b.getAttribute('data-del-p')); save(); renderProjects(); };
  });
}
function renderCharacters() {
  const elList = $('characterList');
  elList.innerHTML = db.characters.length
    ? db.characters.map(c => `<div class="item"><h3>${esc(c.name)}</h3><p class="muted">${esc(c.desc || '')}</p><button type="button" data-del-c="${c.id}" class="danger">حذف</button></div>`).join('')
    : '<div class="empty">لا شخصيات</div>';
  elList.querySelectorAll('[data-del-c]').forEach(b => {
    b.onclick = () => { db.characters = db.characters.filter(x => x.id !== b.getAttribute('data-del-c')); save(); renderCharacters(); };
  });
}
function renderScenes() {
  const elList = $('sceneList');
  elList.innerHTML = db.scenes.length
    ? db.scenes.map(s => `<div class="item"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.prompt || '')}</p><button type="button" data-del-s="${s.id}" class="danger">حذف</button></div>`).join('')
    : '<div class="empty">لا مشاهد</div>';
  elList.querySelectorAll('[data-del-s]').forEach(b => {
    b.onclick = () => { db.scenes = db.scenes.filter(x => x.id !== b.getAttribute('data-del-s')); save(); renderScenes(); };
  });
}
function renderRefs() {
  const rules = refState().rules.slice().sort((a, b) => a.priority - b.priority);
  $('refRulesList').innerHTML = rules.length
    ? rules.map(r => `<div class="item"><h3>${esc(r.title)} <span class="pill">${r.priority}</span></h3><p class="muted" style="white-space:pre-wrap">${esc(r.body)}</p><button type="button" class="danger" data-del-rule="${r.id}">حذف</button></div>`).join('')
    : '<div class="empty">لا قواعد</div>';
  $('refRulesList').querySelectorAll('[data-del-rule]').forEach(b => {
    b.onclick = () => {
      const res = removeRule(refState(), b.getAttribute('data-del-rule'));
      if (!res.ok) { $('refLibStatus').textContent = res.message; return; }
      db.references = res.state; save(); renderRefs();
    };
  });
  const images = refState().images;
  $('refImageStatus').textContent = images.length ? `${images.length} / ${REFERENCE_LIMITS.MAX_IMAGES}` : 'لا صور بعد.';
  $('refImageGrid').innerHTML = images.map(img =>
    `<div class="item"><img class="media-preview" alt="" src="${img.dataUrl}"><strong>${esc(img.name)}</strong><div class="muted">${esc(img.role)}</div><button type="button" class="danger" data-del-img="${img.id}">حذف</button></div>`
  ).join('') || '<div class="empty">لا صور</div>';
  $('refImageGrid').querySelectorAll('[data-del-img]').forEach(b => {
    b.onclick = () => { db.references = removeReferenceImage(refState(), b.getAttribute('data-del-img')).state; save(); renderRefs(); };
  });
  const videos = refState().videos;
  $('refVideoStatus').textContent = videos.length ? `${videos.length} / ${REFERENCE_LIMITS.MAX_VIDEOS} (تعريف فقط)` : 'لا سجلات.';
  $('refVideoList').innerHTML = videos.map(v =>
    `<div class="item"><strong>${esc(v.name)}</strong><div class="muted">${esc(v.role)} · ${fmtSize(v.size)}</div><button type="button" class="danger" data-del-vid="${v.id}">حذف</button></div>`
  ).join('') || '<div class="empty">لا فيديوهات</div>';
  $('refVideoList').querySelectorAll('[data-del-vid]').forEach(b => {
    b.onclick = () => { db.references = removeReferenceVideo(refState(), b.getAttribute('data-del-vid')).state; save(); renderRefs(); };
  });
  const files = refState().attachments;
  $('refAttachStatus').textContent = files.length ? `${files.length} / ${REFERENCE_LIMITS.MAX_ATTACHMENTS}` : 'لا مرفقات.';
  $('refAttachList').innerHTML = files.map(a =>
    `<div class="item"><strong>${esc(a.name)}</strong><div class="muted">${esc(a.mime)} · ${fmtSize(a.size)}</div><button type="button" class="danger" data-del-att="${a.id}">حذف</button></div>`
  ).join('') || '<div class="empty">لا مرفقات</div>';
  $('refAttachList').querySelectorAll('[data-del-att]').forEach(b => {
    b.onclick = () => { db.references = removeAttachment(refState(), b.getAttribute('data-del-att')).state; save(); renderRefs(); };
  });
}

function bindActions() {
  $('authLocalMode').onclick = () => {
    $('authGate').hidden = true;
    $('appWorkspace').hidden = false;
    load(); renderAll();
  };
  $('newProject').onclick = () => { $('projectForm').hidden = false; };
  $('cancelProject').onclick = () => { $('projectForm').hidden = true; };
  $('saveProject').onclick = () => {
    const name = $('pName').value.trim(); if (!name) return;
    db.projects.push({ id: uid(), name, summary: $('pSummary').value.trim(), createdAt: new Date().toISOString() });
    $('pName').value = ''; $('pSummary').value = ''; $('projectForm').hidden = true; save(); renderProjects();
  };
  $('newCharacter').onclick = () => { $('characterForm').hidden = false; };
  $('cancelCharacter').onclick = () => { $('characterForm').hidden = true; };
  $('saveCharacter').onclick = () => {
    const name = $('cName').value.trim(); if (!name) return;
    db.characters.push({ id: uid(), name, desc: $('cDesc').value.trim() });
    $('cName').value = ''; $('cDesc').value = ''; $('characterForm').hidden = true; save(); renderCharacters();
  };
  $('newScene').onclick = () => { $('sceneForm').hidden = false; };
  $('cancelScene').onclick = () => { $('sceneForm').hidden = true; };
  $('saveScene').onclick = () => {
    const name = $('sName').value.trim(); if (!name) return;
    db.scenes.push({ id: uid(), name, prompt: $('sPrompt').value.trim() });
    $('sName').value = ''; $('sPrompt').value = ''; $('sceneForm').hidden = true; save(); renderScenes();
  };
  $('refAddRule').onclick = () => {
    const res = addRule(refState(), {
      title: $('refRuleTitle').value,
      body: $('refRuleBody').value,
      priority: Number($('refRulePriority').value) || 100
    });
    $('refLibStatus').textContent = res.ok ? 'تمت الإضافة' : res.message;
    if (!res.ok) return;
    db.references = res.state; $('refRuleTitle').value = ''; $('refRuleBody').value = ''; save(); renderRefs();
  };
  $('refImageFiles').onchange = async (ev) => {
    for (const f of [...(ev.target.files || [])]) {
      const res = await addReferenceImage(refState(), f, { role: $('refImageRole').value });
      $('refImageStatus').textContent = res.ok ? 'أُضيفت: ' + f.name : res.message;
      if (res.ok) { db.references = res.state; save(); }
    }
    ev.target.value = ''; renderRefs();
  };
  $('refVideoFiles').onchange = (ev) => {
    for (const f of [...(ev.target.files || [])]) {
      const res = addReferenceVideoMeta(refState(), f, { role: $('refVideoRole').value });
      $('refVideoStatus').textContent = res.ok ? (res.notice || 'تم') : res.message;
      if (res.ok) { db.references = res.state; save(); }
    }
    ev.target.value = ''; renderRefs();
  };
  $('refAttachFiles').onchange = (ev) => {
    for (const f of [...(ev.target.files || [])]) {
      const res = addAttachmentMeta(refState(), f);
      $('refAttachStatus').textContent = res.ok ? (res.notice || 'تم') : res.message;
      if (res.ok) { db.references = res.state; save(); }
    }
    ev.target.value = ''; renderRefs();
  };
  $('refExport').onclick = () => {
    const blob = new Blob([JSON.stringify({ version: 1, references: refState() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nexus-references.json'; a.click();
  };
  $('refClearAll').onclick = () => {
    if (!confirm('مسح مكتبة المراجع؟')) return;
    db.references = emptyReferenceState(); save(); renderRefs(); $('refLibStatus').textContent = 'تم المسح.';
  };
  $('refImportFile').onchange = async (ev) => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      db.references = normalizeReferenceState(data.references || data);
      save(); renderRefs(); $('refLibStatus').textContent = 'تم الاستيراد.';
    } catch { $('refLibStatus').textContent = 'JSON غير صالح.'; }
    ev.target.value = '';
  };
  $('mediaFiles').onchange = (ev) => {
    mediaUrls.forEach(u => URL.revokeObjectURL(u)); mediaUrls = [];
    const files = [...(ev.target.files || [])];
    $('mediaStatus').textContent = files.length ? files.length + ' ملف (معاينة محلية)' : 'لم تختر ملفات.';
    $('mediaResults').innerHTML = files.map(f => {
      const url = URL.createObjectURL(f); mediaUrls.push(url);
      if (f.type.startsWith('image/')) return `<div class="item"><img class="media-preview" src="${url}" alt=""><div class="muted">${esc(f.name)} · ${fmtSize(f.size)}</div></div>`;
      if (f.type.startsWith('video/')) return `<div class="item"><video class="media-preview" controls src="${url}"></video><div class="muted">${esc(f.name)} · ${fmtSize(f.size)}</div></div>`;
      if (f.type.startsWith('audio/')) return `<div class="item"><audio controls src="${url}"></audio><div class="muted">${esc(f.name)} · ${fmtSize(f.size)}</div></div>`;
      return `<div class="item"><strong>${esc(f.name)}</strong><div class="muted">${fmtSize(f.size)}</div></div>`;
    }).join('');
  };
  $('buildWriter').onclick = () => {
    const rules = formatRulesForPrompt(refState());
    const idea = $('wIdea').value.trim();
    const notes = $('wNotes').value.trim();
    $('wOutput').value = ['# ملف تطوير مسلسل — NEXUS (محلي)', '', '## الفكرة', idea || '(فارغ)', '', '## قيود إضافية', notes || '(لا يوجد)', '', '## قواعد المراجع', rules || '(لا قواعد)', '', '## ملاحظة', 'تخطيط محلي فقط — ليس توليد فيديو.'].join('\n');
  };
  $('exportAll').onclick = () => {
    const blob = new Blob([JSON.stringify({ version: 4, ...db }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nexus-backup.json'; a.click();
    $('backupStatus').textContent = 'تم التصدير.';
  };
  $('importAll').onchange = async (ev) => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      db = {
        projects: Array.isArray(p.projects) ? p.projects : [],
        characters: Array.isArray(p.characters) ? p.characters : [],
        scenes: Array.isArray(p.scenes) ? p.scenes : [],
        references: normalizeReferenceState(p.references)
      };
      save(); renderAll(); $('backupStatus').textContent = 'تم الاستيراد.';
    } catch { $('backupStatus').textContent = 'ملف غير صالح.'; }
    ev.target.value = '';
  };
}

function renderAll() { renderProjects(); renderCharacters(); renderScenes(); renderRefs(); }

buildShell();
bindNav();
bindActions();
window.addEventListener('beforeunload', () => mediaUrls.forEach(u => URL.revokeObjectURL(u)));

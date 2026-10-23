// "Denemeler" ekranı: özet, puan ve eksik analizleri, deneme geçmişi.
// Ekleme/düzenleme sağdan açılan drawer'da, yazdıkça kaydedilir.
import { SUBJECTS, SUBJ_MAP } from '../data.js';
import * as store from '../store.js';
import { netOf, fmtNet, estimateScore, todayKey, dateOf, fmtShort, clampInt, esc } from '../utils.js';
import { line } from '../charts.js';
import { rec, topicStats, filterBar, focusCard, subjectCard, eksikCard, changeCard, topicTable } from './examAnalysis.js';
import { confetti } from '../confetti.js';

// drawer: null | { mode:'add' } | { mode:'edit', id } | { mode:'topics' }
let drawer = null;
let justOpened = false;
// formdaki konu kutularının adları: data-tp="ders:sıra" ile eşleşir (adlarda tırnak olabilir)
let formTopics = {};
let drawerScroll = 0;      // konu ayarında yeniden çizimde kaydırma kaybolmasın
let focusSubject = null;    // konu eklenen dersin kutusu yeniden odaklansın
let saveTimer = null;       // yazarken kaydetme beklemesi
let savedAny = false;       // drawer açıkken en az bir kayıt yapıldı mı
let createdNew = false;     // bu drawer'da yeni deneme oluşturuldu mu (kapanışta konfeti)
let filter = 'all';         // analiz kartlarının ders filtresi
let renaming = null;        // adı kartta düzenlenen denemenin kimliği

let flushPending = null;    // başka sekmeye geçerken bekleyen kaydı yazar

export const reset = () => { flushPending?.(); drawer = null; savedAny = createdNew = false; };
/** Başka sayfadan (Bugün > Deneme ekle) drawer'ı açık getirmek için */
export const requestAdd = () => { drawer = { mode: 'add' }; justOpened = true; };

const examNet = ex => SUBJECTS.reduce((a, s) => a + netOf(ex.subjects[s.key]?.d, ex.subjects[s.key]?.y), 0);
const topicKey = n => String(n).trim().toLocaleLowerCase('tr');

/** Bir dersin konuları: Denemeler > Konular'da ayarlanan liste + düzenlenen denemede kayıtlı olanlar */
function topicsOf(subject, ex) {
  const seen = new Map();
  const add = n => {
    const name = String(n || '').trim();
    if (name && !seen.has(topicKey(name))) seen.set(topicKey(name), name);
  };
  (store.get().examTopics?.[subject] || []).forEach(add);
  Object.keys(ex?.topics?.[subject] || {}).forEach(add);
  return [...seen.values()];
}

const FIELDS = [['d', 'doğru'], ['y', 'yanlış'], ['b', 'boş']];
const sumOf = m => Object.values(m || {}).map(rec).reduce((a, r) => ({ d: a.d + r.d, y: a.y + r.y, b: a.b + r.b }), { d: 0, y: 0, b: 0 });

/** Denemedeki eksik konular (yanlış + boş), en çoktan aza */
const examTopics = ex => Object.entries(ex.topics || {})
  .flatMap(([subject, m]) => Object.entries(m).map(([name, v]) => ({ subject, name, ...rec(v) })))
  .filter(t => t.y + t.b > 0)
  .sort((a, b) => (b.y + b.b) - (a.y + a.b));

/* ---------------- deneme kartı ---------------- */
function examCard(ex, pos, count) {
  const score = estimateScore(ex.subjects);
  const total = examNet(ex);
  const sum = SUBJECTS.reduce((a, s) => {
    const r = ex.subjects[s.key] || {};
    return { d: a.d + (r.d || 0), y: a.y + (r.y || 0), b: a.b + (r.b || 0) };
  }, { d: 0, y: 0, b: 0 });
  const tops = examTopics(ex).slice(0, 4);
  return `
  <article class="xcard">
    <div class="xcard-top">
      <div class="xcard-title">
        ${renaming === ex.id
          ? `<input class="inp xcard-rename" data-rename-inp="${ex.id}" value="${esc(ex.name)}" maxlength="40" aria-label="Deneme adı">`
          : `<button type="button" class="xcard-name" data-rename="${ex.id}" title="Adı değiştir">${esc(ex.name)} <span aria-hidden="true">✎</span></button>`}
        <div class="xcard-date">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()}</div>
      </div>
      <div class="xcard-acts">
        <button type="button" class="ga-btn" data-move="${ex.id}" data-dir="1" aria-label="sırada yukarı al" ${pos === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="ga-btn" data-move="${ex.id}" data-dir="-1" aria-label="sırada aşağı al" ${pos === count - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="ga-btn" data-edit="${ex.id}" aria-label="düzenle">✏️</button>
        <button type="button" class="ga-btn danger" data-del="${ex.id}" aria-label="sil">🗑</button>
      </div>
    </div>
    <div class="xsum">
      <div class="xsum-main"><b>${fmtNet(total)}</b>net</div>
      <div class="xsum-main score"><b>${score}</b>puan</div>
      <div class="xsum-dyb"><b class="d">${sum.d}</b>doğru</div>
      <div class="xsum-dyb"><b class="y">${sum.y}</b>yanlış</div>
      <div class="xsum-dyb"><b class="b">${sum.b}</b>boş</div>
    </div>
    <table class="xsub">
      <thead><tr><th>Ders</th><th>D</th><th>Y</th><th>B</th><th>Net</th></tr></thead>
      <tbody>${SUBJECTS.map(s => {
        const r = ex.subjects[s.key] || {};
        const n = netOf(r.d, r.y);
        return `<tr>
          <td><span class="xsub-name">${s.emoji} ${esc(s.name)}</span>
            <span class="xbar-track"><i style="width:${Math.round((n / s.q) * 100)}%;background:${s.color}"></i></span></td>
          <td class="d">${r.d || 0}</td><td class="y">${r.y || 0}</td><td class="b">${r.b || 0}</td>
          <td class="n">${fmtNet(n)}<small>/${s.q}</small></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    ${tops.length ? `
      <div class="xcard-topics"><em>Eksik konular</em> ${tops.map(t => `<span>${esc(t.name)} <b>${[t.y && `${t.y}Y`, t.b && `${t.b}B`].filter(Boolean).join(' ')}</b></span>`).join('')}</div>` : ''}
  </article>`;
}

/* ---------------- drawer: form ---------------- */
function subjectBlock(s, ex) {
  const r = ex?.subjects?.[s.key] || {};
  const topics = topicsOf(s.key, ex);
  formTopics[s.key] = topics;
  const saved = ex?.topics?.[s.key] || {};
  const sum = sumOf(saved);
  const marked = sum.d + sum.y + sum.b;
  // ders toplamı konulardan geliyorsa kutu boş kalır (soluk yazıyla toplam görünür)
  const auto = marked > 0 && FIELDS.every(([f]) => (r[f] || 0) === sum[f]);
  const val = f => auto ? '' : (r[f] || '');
  return `
  <div class="xs" style="--c:${s.color};--i:${s.ink}">
    <div class="xs-row">
      <div class="xs-name">${s.emoji} ${esc(s.name)} <small>/${s.q}</small></div>
      ${FIELDS.map(([f, lbl]) => `<input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0" value="${val(f)}" data-ex="${s.key}" data-f="${f}" aria-label="${esc(s.name)} ${lbl}">`).join('')}
    </div>
    <details class="xs-topics" ${marked ? 'open' : ''}>
      <summary>📚 Konulara göre gir <span data-tpsum="${s.key}"></span></summary>
      ${topics.length ? `
        <ul class="xt-list">${topics.map((name, i) => {
          const t = rec(saved[name]);
          return `
          <li class="xt">
            <span class="xt-name">${esc(name)}</span>
            ${FIELDS.map(([f, lbl]) => `<input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0"
                   value="${t[f] || ''}" data-tp="${s.key}:${i}" data-f="${f}" aria-label="${esc(name)} ${lbl}">`).join('')}
          </li>`;
        }).join('')}
        </ul>
        <p class="xt-hint">Ders satırını boş bırakırsan toplam konulardan hesaplanır.</p>`
        : '<p class="xt-empty">Bu derse henüz konu eklenmedi. Denemeler sayfasındaki ⚙️ Konular ayarından ekleyebilirsin.</p>'}
    </details>
  </div>`;
}

/* ---------------- drawer: konu ayarı ---------------- */
function topicsAdminHtml() {
  const all = store.get().examTopics || {};
  return `
  <p class="hint" style="text-align:left;margin:0 0 12px">
    Deneme girerken her dersin altında bu konular çıkar. Birden fazla konuyu alt alta ya da virgülle yazıp tek seferde ekleyebilirsin.
  </p>
  ${SUBJECTS.map(s => {
    const list = all[s.key] || [];
    return `
    <div class="xs xta" style="--c:${s.color};--i:${s.ink}">
      <div class="xs-name">${s.emoji} ${esc(s.name)} <small>${list.length} konu</small></div>
      ${list.length ? `<ul class="xta-list">${list.map((n, i) => `
        <li><span>${esc(n)}</span><button type="button" class="xta-x" data-tdel="${s.key}:${i}" aria-label="sil">✕</button></li>`).join('')}</ul>` : ''}
      <div class="xta-add">
        <textarea class="inp" rows="1" data-tnew="${s.key}" placeholder="Yeni konu (ör. Üslü İfadeler)"></textarea>
        <button type="button" class="btn-ghost" data-tadd="${s.key}">Ekle</button>
      </div>
    </div>`;
  }).join('')}`;
}

function drawerHtml() {
  if (!drawer) return '';
  const topicsMode = drawer.mode === 'topics';
  const ex = drawer.mode === 'edit' ? store.get().exams.find(e => e.id === drawer.id) : null;
  const title = topicsMode ? 'Deneme konuları' : ex ? 'Denemeyi düzenle' : 'Yeni deneme';
  formTopics = {};
  const body = topicsMode ? topicsAdminHtml() : `
      <div class="frow">
        <div>
          <label class="lbl" for="exName">Deneme adı</label>
          <input id="exName" class="inp" type="text" placeholder="Örn: 3. Deneme" maxlength="40" value="${esc(ex?.name || '')}">
        </div>
        <div>
          <label class="lbl" for="exDate">Tarih</label>
          <input id="exDate" class="inp" type="date" value="${ex?.date || todayKey()}">
        </div>
      </div>
      <div class="xs-head"><span>Ders</span><span>Doğru</span><span>Yanlış</span><span>Boş</span></div>
      ${SUBJECTS.map(s => subjectBlock(s, ex)).join('')}`;

  return `
  <div class="drawer-scrim" data-closex></div>
  <aside class="drawer xdrawer ${justOpened ? 'opening' : ''}" role="dialog" aria-modal="true" aria-label="${title}">
    <div class="drawer-head">
      <span class="xdrawer-ico">${topicsMode ? '⚙️' : ex ? '✏️' : '🏆'}</span>
      <div class="drawer-title"><div class="book-name">${title}</div></div>
      <button type="button" class="drawer-x" data-closex aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">${body}</div>
    ${!topicsMode ? `
      <div class="xdrawer-foot">
        <div class="xprev"><span><b id="exNet">0</b>net</span><span><b id="exScore">100</b>tahmini puan</span></div>
        <span class="xsaved" id="exSaved">${ex ? 'Yazdıkça kaydedilir' : 'Yazmaya başlayınca kaydedilir'}</span>
        <button type="button" id="exSave" class="btn-primary">Tamam</button>
      </div>` : ''}
  </aside>`;
}

/* ---------------- ekran ---------------- */
export function render() {
  const state = store.get();
  const exams = state.exams;

  const trend = exams.map(e => ({ label: fmtShort(dateOf(e.date)), value: estimateScore(e.subjects) }));
  const best = exams.length ? Math.max(...trend.map(t => t.value)) : 0;
  const bestNet = exams.length ? Math.max(...exams.map(examNet)) : 0;
  const last = exams.length ? trend[trend.length - 1].value : 0;
  const prev = exams.length > 1 ? trend[trend.length - 2].value : null;
  const diff = prev !== null ? last - prev : null;
  const topics = topicStats(exams, filter);
  const shown = [...exams].reverse();   // geçmişte en yeni üstte
  const html = `
  <div class="xpage">
    <div class="xhead">
      <div class="xstats">
        <div class="xstat"><b>${exams.length}</b>deneme</div>
        <div class="xstat"><b>${best || '–'}</b>en yüksek puan</div>
        <div class="xstat"><b>${exams.length ? fmtNet(bestNet) : '–'}</b>en iyi net</div>
        <div class="xstat"><b class="${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === null ? '–' : (diff >= 0 ? '+' : '') + diff}</b>son değişim</div>
      </div>
      <div class="xhead-acts">
        <button type="button" class="btn-ghost" data-topics title="Deneme konuları">⚙️ Konular</button>
        <button type="button" class="btn-primary" data-addexam>+ Deneme ekle</button>
      </div>
    </div>

    ${exams.length ? `
      <div class="xgrid">
        <div class="card xa-card">
          <div class="card-title">📈 Puan gelişimin</div>
          ${line(trend, { min: 100, max: 500, height: 165 })}
        </div>
        ${subjectCard(exams, 'all')}
      </div>
      <div class="sec-title">Eksik analizi <small>yanlış + boş</small></div>
      ${filterBar(filter)}
      <div class="xgrid">
        ${focusCard(topics)}
        ${eksikCard(exams, filter)}
        ${changeCard(topics)}
      </div>
      <div class="xgrid xgrid-one">${topicTable(topics)}</div>
      <div class="sec-title">Deneme geçmişi</div>
      <div class="xlist">${shown.map((ex, i) => examCard(ex, i, shown.length)).join('')}</div>
    ` : `<div class="card"><div class="empty"><div>🏆</div>
        Henüz deneme yok.<br>İlk denemeyi ekle, gelişimini grafikte görelim! 📈</div></div>`}
  </div>
  <div id="xDrawer">${drawerHtml()}</div>`;
  justOpened = false;
  return html;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);
  document.body.classList.toggle('drawer-open', !!drawer);

  const open = next => { drawer = next; justOpened = true; savedAny = createdNew = false; ctx.rerender(); };
  const close = () => {
    flush();
    drawer = null;
    if (createdNew) { confetti(1600); ctx.toast('Deneme kaydedildi! 🏆'); }
    ctx.rerender();
    if (savedAny) { ctx.refreshHeader(); ctx.checkBadges(); }
    savedAny = createdNew = false;
  };

  /** Ders kutusu boşsa toplam konulardan; yazılmışsa yazılan geçerli */
  const readForm = () => {
    const subjects = {}, topics = {}, auto = {};
    for (const s of SUBJECTS) {
      (formTopics[s.key] || []).forEach((name, i) => {
        const [d, y, b] = FIELDS.map(([f]) => clampInt($(`[data-tp="${s.key}:${i}"][data-f="${f}"]`)?.value || 0, 0, s.q));
        if (d || y || b) (topics[s.key] ||= {})[name] = { d, y, b };
      });
      const sum = sumOf(topics[s.key]);
      const field = f => $(`[data-ex="${s.key}"][data-f="${f}"]`)?.value;
      const pick = f => field(f) === '' || field(f) == null ? sum[f] : clampInt(field(f), 0, s.q);
      const d = Math.min(pick('d'), s.q), y = Math.min(pick('y'), s.q);
      subjects[s.key] = { d, y, b: Math.min(pick('b'), Math.max(0, s.q - d - y)) };   // boş, kalan soruyu aşmaz
      auto[s.key] = sum;
    }
    return { subjects, topics, auto };
  };

  const preview = () => {
    if (!$('#exNet')) return;
    const { subjects, auto } = readForm();
    const net = SUBJECTS.reduce((a, s) => a + netOf(subjects[s.key].d, subjects[s.key].y), 0);
    $('#exNet').textContent = fmtNet(net);
    $('#exScore').textContent = estimateScore(subjects);
    for (const s of SUBJECTS) {
      const sum = auto[s.key];
      FIELDS.forEach(([f]) => {
        const inp = $(`[data-ex="${s.key}"][data-f="${f}"]`);
        if (inp) inp.placeholder = sum.d + sum.y + sum.b ? String(sum[f]) : '0';   // boşken konu toplamı görünür
      });
      const el = $(`[data-tpsum="${s.key}"]`);
      if (!el) continue;
      const over = FIELDS.some(([f]) => sum[f] > subjects[s.key][f]);
      el.textContent = sum.d + sum.y + sum.b
        ? `${FIELDS.map(([f, lbl]) => `${sum[f]} ${lbl}`).join(' · ')}${over ? ' (ders toplamından fazla)' : ''}` : '';
      el.classList.toggle('over', over);
    }
  };
  preview();

  /** Yazdıkça kaydeder: yeni denemede ilk sayıyla oluşturur, sonra aynı kaydı günceller */
  const persist = () => {
    clearTimeout(saveTimer); saveTimer = null;
    if (!drawer || drawer.mode === 'topics' || !$('#exName')) return;
    const { subjects, topics } = readForm();
    const name = ($('#exName').value || '').trim();
    const date = $('#exDate').value || todayKey();
    if (drawer.mode === 'add') {
      if (!SUBJECTS.some(s => subjects[s.key].d || subjects[s.key].y || subjects[s.key].b)) return;
      const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      store.addExam({ id, name: name || `Deneme ${store.get().exams.length + 1}`, date, subjects, topics });
      drawer = { mode: 'edit', id };   // yeniden çizmeden düzenlemeye geç, odak kaybolmasın
      createdNew = true;
    } else {
      const old = store.get().exams.find(x => x.id === drawer.id);
      if (!old) return;
      store.updateExam(drawer.id, { name: name || old.name, date, subjects, topics });
    }
    savedAny = true;
    const el = $('#exSaved');
    if (el) el.textContent = 'Kaydedildi ✓';
  };
  const flush = () => { if (saveTimer) persist(); };
  flushPending = flush;
  const schedule = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 500);
    const el = $('#exSaved');
    if (el && drawer?.mode !== 'add') el.textContent = 'Kaydediliyor…';
  };

  root.addEventListener('input', e => {
    if (e.target.closest('[data-ex], [data-tp]')) preview();
    if (e.target.closest('[data-ex], [data-tp], #exName, #exDate')) schedule();
  });
  root.addEventListener('change', e => { if (e.target.closest('[data-ex], [data-tp], #exName, #exDate')) flush(); });

  root.addEventListener('click', e => {
    if (e.target.closest('[data-addexam]')) { open({ mode: 'add' }); return; }
    if (e.target.closest('[data-topics]')) { drawerScroll = 0; open({ mode: 'topics' }); return; }

    // konu ayarı: ekle / sil (anında kaydedilir)
    const tadd = e.target.closest('[data-tadd]');
    if (tadd) { addTopics(tadd.dataset.tadd); return; }
    const tdel = e.target.closest('[data-tdel]');
    if (tdel) {
      const [subj, idx] = tdel.dataset.tdel.split(':');
      const list = [...(store.get().examTopics?.[subj] || [])];
      list.splice(Number(idx), 1);
      store.setExamTopics(subj, list);
      redrawKeep();
      return;
    }
    if (e.target.closest('[data-closex]')) { close(); return; }

    const fb = e.target.closest('[data-xfilter]');
    if (fb) { filter = fb.dataset.xfilter; ctx.rerender(); return; }
    const rn = e.target.closest('[data-rename]');
    if (rn) {
      renaming = rn.dataset.rename;
      ctx.rerender();   // yeni görünüm kutuya odaklanır (aşağıda)
      return;
    }
    const mv = e.target.closest('[data-move]');
    if (mv) { store.moveExam(mv.dataset.move, Number(mv.dataset.dir)); ctx.rerender(); return; }

    const ed = e.target.closest('[data-edit]');
    if (ed) { open({ mode: 'edit', id: ed.dataset.edit }); return; }

    const del = e.target.closest('[data-del]');
    if (del) {
      if (confirm('Bu denemeyi silmek istediğine emin misin?')) {
        store.removeExam(del.dataset.del);
        ctx.rerender();
        ctx.toast('Deneme silindi');
      }
      return;
    }

    if (e.target.closest('#exSave')) close();
  });

  // konu ayarında yeniden çizerken kaydırma ve odak korunur
  const dBody = $('.xdrawer .drawer-body');
  if (dBody && drawer?.mode === 'topics') {
    dBody.scrollTop = drawerScroll;
    dBody.addEventListener('scroll', () => { drawerScroll = dBody.scrollTop; });
    if (focusSubject) { $(`[data-tnew="${focusSubject}"]`)?.focus(); focusSubject = null; }
  }
  function redrawKeep() { justOpened = false; ctx.rerender(); }
  function addTopics(subj) {
    const box = $(`[data-tnew="${subj}"]`);
    const names = (box?.value || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
    if (!names.length) { box?.focus(); return; }
    const before = (store.get().examTopics?.[subj] || []).length;
    store.setExamTopics(subj, [...(store.get().examTopics?.[subj] || []), ...names]);
    const added = (store.get().examTopics?.[subj] || []).length - before;   // aynı adlar tekrar eklenmez
    focusSubject = subj;
    redrawKeep();
    ctx.toast(added ? `${added} konu eklendi` : 'Bu konu zaten listede');
  }
  root.addEventListener('keydown', e => {
    const box = e.target.closest('[data-tnew]');
    if (box && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTopics(box.dataset.tnew); }
  });

  root.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer) close(); });

  // kartta ad değiştirme: Enter ya da dışarı tıklama kaydeder, Esc vazgeçer
  const rin = renaming && $(`[data-rename-inp="${renaming}"]`);
  if (rin) {
    const done = keep => {
      if (!renaming) return;
      const id = renaming, name = rin.value.trim();
      renaming = null;
      if (keep && name) { store.updateExam(id, { name }); ctx.toast('Deneme adı güncellendi'); }
      ctx.rerender();
    };
    rin.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      if (e.key === 'Escape') { e.stopPropagation(); done(false); }
    });
    rin.addEventListener('blur', () => done(true));
    rin.focus(); rin.select();
  }
}

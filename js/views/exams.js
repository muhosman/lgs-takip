// "Denemeler" ekranı — özet, puan grafiği, konu yanlışları ve deneme geçmişi.
// Ekleme/düzenleme sağdan açılan drawer'da; yönetici şifresiyle korunur.
import { SUBJECTS, SUBJ_MAP } from '../data.js';
import * as store from '../store.js';
import { netOf, fmtNet, estimateScore, todayKey, dateOf, fmtShort, clampInt, esc } from '../utils.js';
import { line } from '../charts.js';
import { confetti } from '../confetti.js';
import * as admin from '../admin.js';

// drawer: null | { mode:'add' } | { mode:'edit', id } | { mode:'topics' }
let drawer = null;
let justOpened = false;
// formdaki konu kutularının adları: data-tp="ders:sıra" ile eşleşir (adlarda tırnak olabilir)
let formTopics = {};
let drawerScroll = 0;      // konu ayarında yeniden çizimde kaydırma kaybolmasın
let focusSubject = null;   // konu eklenen dersin kutusu yeniden odaklansın

export const reset = () => { drawer = null; };

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

/** Konu kaydı { d, y }; eski kayıtlarda yalnız sayı vardı (= yanlış) */
const rec = v => typeof v === 'number' ? { d: 0, y: v } : { d: v?.d || 0, y: v?.y || 0 };
const sumOf = m => Object.values(m || {}).map(rec).reduce((a, r) => ({ d: a.d + r.d, y: a.y + r.y }), { d: 0, y: 0 });

/** Denemedeki konu yanlışları, en çoktan aza: [{ subject, name, d, y }] */
const examTopics = ex => Object.entries(ex.topics || {})
  .flatMap(([subject, m]) => Object.entries(m).map(([name, v]) => ({ subject, name, ...rec(v) })))
  .filter(t => t.y > 0)
  .sort((a, b) => b.y - a.y);

/** Tüm denemelerden konu bazında toplam yanlış */
function weakTopics(exams) {
  const m = new Map();
  for (const ex of exams) {
    for (const t of examTopics(ex)) {
      const k = t.subject + '|' + topicKey(t.name);
      const cur = m.get(k) || { ...t, y: 0, n: 0 };
      cur.y += t.y; cur.n++;
      m.set(k, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.y - a.y);
}

/* ---------------- deneme kartı ---------------- */
function examCard(ex) {
  const score = estimateScore(ex.subjects);
  const total = examNet(ex);
  const tops = examTopics(ex).slice(0, 3);
  const unlocked = admin.isUnlocked();
  return `
  <article class="xcard">
    <div class="xcard-top">
      <div class="xcard-title">
        <div class="xcard-name">${esc(ex.name)}</div>
        <div class="xcard-date">${fmtShort(dateOf(ex.date))} ${dateOf(ex.date).getFullYear()}</div>
      </div>
      <div class="xcard-nums">
        <span><b>${fmtNet(total)}</b>net</span>
        <span class="xcard-score"><b>${score}</b>puan</span>
      </div>
      ${unlocked ? `
        <div class="xcard-acts">
          <button type="button" class="ga-btn" data-edit="${ex.id}" aria-label="düzenle">✏️</button>
          <button type="button" class="ga-btn danger" data-del="${ex.id}" aria-label="sil">🗑</button>
        </div>` : ''}
    </div>
    <div class="xbars">
      ${SUBJECTS.map(s => {
        const r = ex.subjects[s.key] || { d: 0, y: 0 };
        const n = netOf(r.d, r.y);
        return `<div class="xbar" title="${esc(s.name)}: ${r.d || 0} doğru, ${r.y || 0} yanlış">
          <span class="xbar-track"><i style="width:${Math.round((n / s.q) * 100)}%;background:${s.color}"></i></span>
          <span class="xbar-lbl">${s.emoji} ${fmtNet(n)}</span>
        </div>`;
      }).join('')}
    </div>
    ${tops.length ? `
      <div class="xcard-topics">❌ ${tops.map(t => `<span>${esc(t.name)} <b>${t.y}</b></span>`).join('')}</div>` : ''}
  </article>`;
}

/* ---------------- drawer: form ---------------- */
function subjectBlock(s, ex) {
  const r = ex?.subjects?.[s.key] || {};
  const topics = topicsOf(s.key, ex);
  formTopics[s.key] = topics;
  const saved = ex?.topics?.[s.key] || {};
  const sum = sumOf(saved);
  const marked = sum.d + sum.y;
  // ders toplamı konulardan geliyorsa kutu boş kalır (soluk yazıyla toplam görünür)
  const auto = marked > 0 && (r.d || 0) === sum.d && (r.y || 0) === sum.y;
  const val = f => auto ? '' : (r[f] || '');
  return `
  <div class="xs" style="--c:${s.color};--i:${s.ink}">
    <div class="xs-row">
      <div class="xs-name">${s.emoji} ${esc(s.name)} <small>/${s.q}</small></div>
      <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0" value="${val('d')}" data-ex="${s.key}" data-f="d" aria-label="${esc(s.name)} doğru">
      <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0" value="${val('y')}" data-ex="${s.key}" data-f="y" aria-label="${esc(s.name)} yanlış">
    </div>
    <details class="xs-topics" ${marked ? 'open' : ''}>
      <summary>📚 Konulara göre gir <span data-tpsum="${s.key}"></span></summary>
      ${topics.length ? `
        <ul class="xt-list">${topics.map((name, i) => {
          const t = rec(saved[name]);
          return `
          <li class="xt">
            <span class="xt-name">${esc(name)}</span>
            <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0"
                   value="${t.d || ''}" data-tp="${s.key}:${i}" data-f="d" aria-label="${esc(name)} doğru">
            <input type="number" inputmode="numeric" min="0" max="${s.q}" placeholder="0"
                   value="${t.y || ''}" data-tp="${s.key}:${i}" data-f="y" aria-label="${esc(name)} yanlış">
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
  const body = !admin.isUnlocked()
    ? admin.gateHtml({ title: 'Deneme girişi', hint: 'Deneme eklemek ya da düzenlemek için yönetici şifresini gir.' })
    : topicsMode ? topicsAdminHtml() : `
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
      <div class="xs-head"><span>Ders</span><span>Doğru</span><span>Yanlış</span></div>
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
    ${admin.isUnlocked() && !topicsMode ? `
      <div class="xdrawer-foot">
        <div class="xprev"><span><b id="exNet">0</b>net</span><span><b id="exScore">100</b>tahmini puan</span></div>
        <button type="button" id="exSave" class="btn-primary">${ex ? 'Değişiklikleri kaydet' : 'Denemeyi kaydet 🏆'}</button>
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
  const weak = weakTopics(exams).slice(0, 8);
  const maxWeak = weak.length ? weak[0].y : 1;
  const unlocked = admin.isUnlocked();
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
        ${unlocked ? '<button type="button" class="btn-ghost xlock" data-examlock>🔒</button>' : ''}
        <button type="button" class="btn-ghost" data-topics title="Deneme konuları">⚙️ Konular</button>
        <button type="button" class="btn-primary" data-addexam>+ Deneme ekle</button>
      </div>
    </div>

    ${exams.length ? `
      <div class="xgrid">
        <div class="card">
          <div class="card-title">📈 Puan gelişimin</div>
          ${line(trend, { min: 100, max: 500, height: 165 })}
        </div>
        <div class="card">
          <div class="card-title">🎯 En çok yanlış yaptığın konular</div>
          ${weak.length ? `<ul class="wtop">${weak.map(t => `
            <li>
              <span class="wtop-dot" style="background:${SUBJ_MAP[t.subject]?.color || '#ddd'}"></span>
              <span class="wtop-name">${esc(t.name)}</span>
              <span class="wtop-bar"><i style="width:${(t.y / maxWeak) * 100}%;background:${SUBJ_MAP[t.subject]?.color || 'var(--pink)'}"></i></span>
              <b>${t.y}</b>
            </li>`).join('')}</ul>`
          : '<p class="hint" style="text-align:left;margin:0">Denemeye konu yanlışlarını da girersen hangi konuya çalışman gerektiği burada görünür.</p>'}
        </div>
      </div>
      <div class="sec-title">Deneme geçmişi</div>
      <div class="xlist">${[...exams].reverse().map(examCard).join('')}</div>
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

  const open = next => { drawer = next; justOpened = true; ctx.rerender(); };
  const close = () => { drawer = null; ctx.rerender(); };

  admin.bindGate(root, ctx, () => ctx.rerender());
  if (drawer && !admin.isUnlocked()) setTimeout(() => $('[data-admin-pin]')?.focus(), 200);

  /** Ders kutusu boşsa toplam konulardan; yazılmışsa yazılan geçerli */
  const readForm = () => {
    const subjects = {}, topics = {}, auto = {};
    for (const s of SUBJECTS) {
      (formTopics[s.key] || []).forEach((name, i) => {
        const d = clampInt($(`[data-tp="${s.key}:${i}"][data-f="d"]`)?.value || 0, 0, s.q);
        const y = clampInt($(`[data-tp="${s.key}:${i}"][data-f="y"]`)?.value || 0, 0, s.q);
        if (d || y) (topics[s.key] ||= {})[name] = { d, y };
      });
      const sum = sumOf(topics[s.key]);
      const field = f => $(`[data-ex="${s.key}"][data-f="${f}"]`)?.value;
      const pick = f => field(f) === '' || field(f) == null ? sum[f] : clampInt(field(f), 0, s.q);
      subjects[s.key] = { d: Math.min(pick('d'), s.q), y: Math.min(pick('y'), s.q) };
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
      ['d', 'y'].forEach(f => {
        const inp = $(`[data-ex="${s.key}"][data-f="${f}"]`);
        if (inp) inp.placeholder = sum.d + sum.y ? String(sum[f]) : '0';   // boşken konu toplamı görünür
      });
      const el = $(`[data-tpsum="${s.key}"]`);
      if (!el) continue;
      const { d, y } = subjects[s.key];
      const over = sum.d > d || sum.y > y;
      el.textContent = sum.d + sum.y ? `${sum.d} doğru · ${sum.y} yanlış${over ? ' (ders toplamından fazla)' : ''}` : '';
      el.classList.toggle('over', over);
    }
  };
  preview();

  root.addEventListener('input', e => {
    if (e.target.closest('[data-ex], [data-tp]')) preview();
  });

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
    if (e.target.closest('[data-examlock]')) { admin.lock(); drawer = null; ctx.rerender(); ctx.toast('Kilitlendi 🔒'); return; }

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

    if (e.target.closest('#exSave')) {
      const name = ($('#exName').value || '').trim();
      const date = $('#exDate').value || todayKey();
      const { subjects, topics } = readForm();
      const any = SUBJECTS.some(s => subjects[s.key].d || subjects[s.key].y);
      if (!any) { ctx.toast('Önce doğru/yanlış sayılarını gir 🙂'); return; }

      if (drawer.mode === 'edit') {
        const old = store.get().exams.find(x => x.id === drawer.id);
        store.updateExam(drawer.id, { name: name || old?.name || 'Deneme', date, subjects, topics });
        ctx.toast('Deneme güncellendi ✅');
      } else {
        store.addExam({
          id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: name || `Deneme ${store.get().exams.length + 1}`,
          date, subjects, topics,
        });
        confetti(1600);
        ctx.toast('Deneme kaydedildi! 🏆');
      }
      drawer = null;
      ctx.rerender();
      ctx.refreshHeader();
      ctx.checkBadges();
    }
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
}

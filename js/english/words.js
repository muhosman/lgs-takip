// "Kelimelerim" alt sekmesi — özet, arama, filtreler, kelime kartları ve çoklu ekleme drawer'ı
import { WORD_TYPES, WORD_TYPE_MAP, typeLabel, LEARNED_AT } from '../data.js';
import * as store from '../store.js';
import { esc } from '../utils.js';
import { isLearned } from './session.js';

let drawerOpen = false;     // çoklu ekleme drawer'ı
let justOpened = false;
let rows = [];              // drawer'daki satırlar: [{ en, tr, type }]
let paste = '';             // "listeden yapıştır" kutusu
let pasteOpen = false;
let focusRow = null;        // yeniden çizimde odaklanacak satır { i, f }
let drawerScroll = 0;
let filter = '';            // arama kutusu
let typeFilter = 'all';     // 'all' | tür anahtarı
let stateFilter = 'all';    // 'all' | 'learned' | 'learning'
let editing = null;         // düzenlenen kelimenin id'si

const blankRow = type => ({ en: '', tr: '', type: type || 'noun' });
const keyOf = en => String(en || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

/**
 * Toplu yapıştırmayı satır satır çözer.
 * "apple = elma", "apple - elma", "apple: elma" ve sekmeyle ayrılmış satırlar kabul edilir.
 */
export function parseBulk(text) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)\s*(?:=|\t|\s[-–—]\s|:)\s*(.+)$/);
    if (!m) continue;                       // ayraçsız satır sessizce atlanır
    out.push({ en: m[1], tr: m[2] });
  }
  return out;
}

const dots = w => {
  const n = Math.min(w.ticks || 0, LEARNED_AT);
  return Array.from({ length: LEARNED_AT }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
};

/* ---------------- kelime kartı ---------------- */
function wordCard(w) {
  const t = WORD_TYPE_MAP[w.type] || WORD_TYPE_MAP.other || WORD_TYPES[0];
  if (editing === w.id) {
    return `
    <article class="wcard editing" style="--c:${t.color}">
      <input class="inp" type="text" maxlength="80" value="${esc(w.en)}" data-eden="${w.id}" aria-label="İngilizcesi">
      <input class="inp" type="text" maxlength="80" value="${esc(w.tr)}" data-edtr="${w.id}" aria-label="Türkçesi">
      <div class="wcard-acts">
        <button type="button" class="btn-fill" data-savew="${w.id}">Kaydet</button>
        <button type="button" class="btn-out" data-canceledit>Vazgeç</button>
      </div>
    </article>`;
  }
  return `
  <article class="wcard ${isLearned(w) ? 'learned' : ''}" style="--c:${t.color}">
    <div class="wcard-top">
      <span class="wcard-type">${t.emoji} ${esc(t.en || '')}</span>
      <span class="wcard-tools">
        <button type="button" class="wbtn" data-editw="${w.id}" aria-label="düzenle">✏️</button>
        <button type="button" class="wbtn danger" data-delw="${w.id}" aria-label="sil">🗑</button>
      </span>
    </div>
    <div class="wcard-en">${esc(w.en)}</div>
    <div class="wcard-tr">${esc(w.tr)}</div>
    <div class="wcard-foot">
      <span class="wdots" title="${w.ticks || 0} kez doğru bildin">${dots(w)}</span>
      ${isLearned(w) ? '<span class="wcard-badge">🌟 öğrenildi</span>' : (w.wrong ? `<span class="wcard-wrong">❌ ${w.wrong}</span>` : '')}
    </div>
  </article>`;
}

/* ---------------- çoklu ekleme drawer'ı ---------------- */
const typeOptions = sel => WORD_TYPES.map(t =>
  `<option value="${t.key}" ${t.key === sel ? 'selected' : ''}>${t.emoji} ${esc(typeLabel(t.key))}</option>`).join('');

function rowState(i) {
  const r = rows[i];
  const k = keyOf(r.en);
  if (!k) return '';
  const known = new Set((store.get().words || []).map(w => keyOf(w.en)));
  if (known.has(k)) return 'dup';
  if (rows.findIndex(x => keyOf(x.en) === k) !== i) return 'dup';
  return r.tr.trim() ? 'ok' : '';
}

function rowHtml(r, i) {
  const st = rowState(i);
  return `
  <div class="wr ${st}" data-row="${i}">
    <span class="wr-n">${i + 1}</span>
    <input class="inp" type="text" maxlength="80" placeholder="brave" value="${esc(r.en)}" data-ren="${i}"
           autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="${i + 1}. kelime İngilizcesi">
    <input class="inp" type="text" maxlength="80" placeholder="cesur" value="${esc(r.tr)}" data-rtr="${i}"
           autocomplete="off" aria-label="${i + 1}. kelime Türkçesi">
    <select class="inp" data-rty="${i}" aria-label="${i + 1}. kelime türü">${typeOptions(r.type)}</select>
    <button type="button" class="wr-x" data-rdel="${i}" aria-label="satırı sil">✕</button>
    <span class="wr-note">zaten var</span>
  </div>`;
}

const readyCount = () => rows.filter((r, i) => r.en.trim() && r.tr.trim() && rowState(i) !== 'dup').length;

function drawerHtml() {
  if (!drawerOpen) return '';
  const n = readyCount();
  return `
  <div class="drawer-scrim" data-closeadd></div>
  <aside class="drawer xdrawer wdrawer ${justOpened ? 'opening' : ''}" role="dialog" aria-modal="true" aria-label="Kelime ekle">
    <div class="drawer-head">
      <span class="xdrawer-ico">🔤</span>
      <div class="drawer-title"><div class="book-name">Kelime ekle</div></div>
      <button type="button" class="drawer-x" data-closeadd aria-label="kapat">✕</button>
    </div>
    <div class="drawer-body">
      <details class="wpaste" ${pasteOpen ? 'open' : ''}>
        <summary>📋 Listeden yapıştır</summary>
        <textarea class="inp" rows="5" data-paste placeholder="apple = elma&#10;brave = cesur&#10;conceal = gizlemek">${esc(paste)}</textarea>
        <p class="xt-hint">Her satıra bir kelime. Ayraç olarak <b>=</b>, <b>:</b>, <b>-</b> ya da sekme kullanabilirsin. Satırlar aşağıdaki tabloya eklenir, türlerini orada seçersin.</p>
        <button type="button" class="btn-out" data-pastego>Tabloya aktar</button>
      </details>
      <div class="wr-head"><span></span><span>İngilizcesi</span><span>Türkçesi</span><span>Türü</span><span></span></div>
      <div class="wr-list">${rows.map(rowHtml).join('')}</div>
      <button type="button" class="btn-out wr-add" data-addrow>+ Satır ekle</button>
      <p class="xt-hint">İngilizceden Enter Türkçeye, Türkçeden Enter yeni satıra geçer.</p>
    </div>
    <div class="xdrawer-foot">
      <div class="xprev"><span><b data-ready>${n}</b>kelime eklenecek</span></div>
      <button type="button" class="btn-primary" data-saveall>Hepsini kaydet</button>
    </div>
  </aside>`;
}

/* ---------------- ekran ---------------- */
export function render() {
  const words = store.get().words || [];
  const learned = words.filter(isLearned).length;
  const hardest = [...words].sort((a, b) => (b.wrong || 0) - (a.wrong || 0))[0];

  const q = filter.toLocaleLowerCase('tr');
  let shown = q
    ? words.filter(w => w.en.toLocaleLowerCase('en').includes(q) || w.tr.toLocaleLowerCase('tr').includes(q))
    : words;
  if (typeFilter !== 'all') shown = shown.filter(w => w.type === typeFilter);
  if (stateFilter === 'learned') shown = shown.filter(isLearned);
  if (stateFilter === 'learning') shown = shown.filter(w => !isLearned(w));
  shown = [...shown].reverse();             // yeni eklenen üstte

  const typeCounts = WORD_TYPES.map(t => ({ t, n: words.filter(w => w.type === t.key).length })).filter(x => x.n);

  return `
  <div class="xpage">
    <div class="xhead">
      <div class="xstats">
        <div class="xstat"><b>${words.length}</b>kelime</div>
        <div class="xstat"><b class="up">${learned}</b>öğrenildi</div>
        <div class="xstat"><b>${words.length - learned}</b>çalışılıyor</div>
        <div class="xstat"><b class="wstat-word">${hardest?.wrong ? esc(hardest.en) : '–'}</b>en çok zorlanılan</div>
      </div>
      <div class="xhead-acts">
        <button type="button" class="btn-primary" data-openadd>+ Kelime ekle</button>
      </div>
    </div>

    ${words.length ? `
    <div class="wtools">
      <input id="wSearch" class="inp wsearch" type="search" placeholder="🔍 Kelime ara" value="${esc(filter)}" autocomplete="off">
      <div class="bfilters wseg">
        ${[['all', 'Hepsi'], ['learning', 'Çalışılanlar'], ['learned', 'Öğrenilenler']].map(([k, l]) =>
          `<button type="button" class="seg ${stateFilter === k ? 'on' : ''}" data-wstate="${k}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="bchips">
      <button type="button" class="bchip ${typeFilter === 'all' ? 'on' : ''}" data-wfilter="all">Tümü <i>${words.length}</i></button>
      ${typeCounts.map(({ t, n }) => `
        <button type="button" class="bchip ${typeFilter === t.key ? 'on' : ''}" data-wfilter="${t.key}">${t.emoji} ${esc(t.en)} <i>${n}</i></button>`).join('')}
    </div>
    ${shown.length
      ? `<div class="wgrid">${shown.map(wordCard).join('')}</div>`
      : `<div class="card"><div class="empty"><div>🔍</div>Bu filtreye uyan kelime yok.</div></div>`}
    ` : `<div class="card"><div class="empty"><div>🔤</div>
        Henüz kelime eklemedin.<br>Kelimelerini ekle, sonra oyunlarla pekiştir! ✨</div></div>`}
  </div>
  ${drawerHtml()}`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);
  document.body.classList.toggle('drawer-open', drawerOpen);
  justOpened = false;

  const redraw = () => ctx.rerender();
  const open = () => {
    drawerOpen = true; justOpened = true; drawerScroll = 0;
    if (!rows.length) rows = [blankRow(), blankRow(), blankRow()];
    focusRow = { i: 0, f: 'en' };
    redraw();
  };
  const close = () => { drawerOpen = false; rows = []; paste = ''; pasteOpen = false; redraw(); };

  // drawer yeniden çizilince kaydırma ve odak yerinde kalsın
  const body = $('.wdrawer .drawer-body');
  if (body) {
    body.scrollTop = drawerScroll;
    body.addEventListener('scroll', () => { drawerScroll = body.scrollTop; });
  }
  if (focusRow) {
    const el = $(focusRow.f === 'tr' ? `[data-rtr="${focusRow.i}"]` : `[data-ren="${focusRow.i}"]`);
    focusRow = null;
    if (el) setTimeout(() => el.focus(), 30);
  }

  // satır durumunu (zaten var / hazır) yeniden çizmeden tazele
  const refreshRows = () => {
    rows.forEach((_, i) => {
      const el = $(`[data-row="${i}"]`);
      if (el) el.className = `wr ${rowState(i)}`;
    });
    const n = $('[data-ready]');
    if (n) n.textContent = readyCount();
  };

  const addRow = () => {
    rows.push(blankRow(rows[rows.length - 1]?.type));
    focusRow = { i: rows.length - 1, f: 'en' };
    redraw();
  };

  root.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-openadd]')) { open(); return; }
    if (t.closest('[data-closeadd]')) { close(); return; }
    if (t.closest('[data-addrow]')) { addRow(); return; }

    const rd = t.closest('[data-rdel]');
    if (rd) {
      rows.splice(Number(rd.dataset.rdel), 1);
      if (!rows.length) rows.push(blankRow());
      redraw();
      return;
    }

    if (t.closest('[data-pastego]')) {
      const parsed = parseBulk(paste);
      if (!parsed.length) { ctx.toast('Okunabilir satır bulamadım, "apple = elma" gibi yaz 🙂'); return; }
      const type = rows[rows.length - 1]?.type;
      rows = rows.filter(r => r.en.trim() || r.tr.trim()).concat(parsed.map(p => ({ ...p, type: type || 'noun' })));
      paste = ''; pasteOpen = false;
      redraw();
      ctx.toast(`${parsed.length} satır tabloya eklendi, türlerini kontrol et`);
      return;
    }

    if (t.closest('[data-saveall]')) {
      const list = rows.filter((r, i) => r.en.trim() && r.tr.trim() && rowState(i) !== 'dup');
      if (!list.length) { ctx.toast('Kaydedilecek kelime yok, İngilizcesini ve Türkçesini yaz 🙂'); return; }
      const { added, skipped } = store.addWords(list);
      drawerOpen = false; rows = [];
      redraw();
      ctx.refreshHeader();
      ctx.checkBadges();
      ctx.toast(skipped ? `${added} kelime eklendi · ${skipped} atlandı` : `${added} kelime eklendi 🎉`);
      return;
    }

    const wf = t.closest('[data-wfilter]');
    if (wf) { typeFilter = wf.dataset.wfilter; redraw(); return; }
    const ws = t.closest('[data-wstate]');
    if (ws) { stateFilter = ws.dataset.wstate; redraw(); return; }

    const ed = t.closest('[data-editw]');
    if (ed) { editing = ed.dataset.editw; redraw(); setTimeout(() => root.querySelector(`[data-eden="${editing}"]`)?.focus(), 30); return; }
    if (t.closest('[data-canceledit]')) { editing = null; redraw(); return; }

    const sv = t.closest('[data-savew]');
    if (sv) {
      const id = sv.dataset.savew;
      store.updateWord(id, {
        en: root.querySelector(`[data-eden="${id}"]`)?.value,
        tr: root.querySelector(`[data-edtr="${id}"]`)?.value,
      });
      editing = null;
      redraw();
      return;
    }

    const del = t.closest('[data-delw]');
    if (del) {
      const w = store.findWord(del.dataset.delw);
      if (!w || !confirm(`"${w.en}" silinsin mi?`)) return;
      store.removeWord(w.id);
      if (editing === w.id) editing = null;
      redraw();
      ctx.toast('Kelime silindi');
    }
  });

  root.addEventListener('toggle', e => {
    if (e.target.matches?.('.wpaste')) pasteOpen = e.target.open;
  }, true);

  root.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.ren != null) { rows[+t.dataset.ren].en = t.value; refreshRows(); return; }
    if (t.dataset.rtr != null) { rows[+t.dataset.rtr].tr = t.value; refreshRows(); return; }
    if (t.matches('[data-paste]')) { paste = t.value; return; }

    if (t.id === 'wSearch') {
      filter = t.value;
      const at = t.selectionStart;
      redraw();
      const box = root.querySelector('#wSearch');
      if (box) { box.focus(); box.setSelectionRange(at, at); }
    }
  });

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.rty != null) rows[+t.dataset.rty].type = t.value;
  });

  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawerOpen) { close(); return; }
    if (e.key !== 'Enter') return;
    const t = e.target;
    // İngilizceden Enter Türkçeye, Türkçeden Enter bir sonraki (gerekirse yeni) satıra
    if (t.dataset.ren != null) { e.preventDefault(); $(`[data-rtr="${t.dataset.ren}"]`)?.focus(); return; }
    if (t.dataset.rtr != null) {
      e.preventDefault();
      const i = +t.dataset.rtr;
      if (i < rows.length - 1) $(`[data-ren="${i + 1}"]`)?.focus();
      else addRow();
      return;
    }
    const sv = t.closest('[data-eden], [data-edtr]');
    if (sv) {
      const id = sv.dataset.eden || sv.dataset.edtr;
      root.querySelector(`[data-savew="${id}"]`)?.click();
    }
  });
}

/** Sekmeden çıkarken form durumunu sıfırlamak için */
export function reset() {
  drawerOpen = false; rows = []; paste = ''; pasteOpen = false;
  filter = ''; editing = null; typeFilter = 'all'; stateFilter = 'all';
}

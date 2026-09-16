// "Kelimelerim" alt sekmesi — kelime ekleme, toplu yapıştırma ve tür tür liste
import { WORD_TYPES, WORD_TYPE_MAP, typeLabel, LEARNED_AT } from '../data.js';
import * as store from '../store.js';
import { esc } from '../utils.js';
import { isLearned } from './session.js';

let addMode = null;        // null | 'single' | 'bulk'
let addType = 'noun';      // ekleme formunda seçili tür
let filter = '';           // arama kutusu
let editing = null;        // düzenlenen kelimenin id'si

/**
 * Toplu yapıştırmayı satır satır çözer.
 * "apple = elma", "apple - elma", "apple: elma" ve sekmeyle ayrılmış satırlar kabul edilir.
 */
export function parseBulk(text) {
  const rows = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)\s*(?:=|\t|\s[-–—]\s|:)\s*(.+)$/);
    if (!m) continue;                       // ayraçsız satır sessizce atlanır
    rows.push({ en: m[1], tr: m[2] });
  }
  return rows;
}

const tickBar = w => {
  const n = Math.min(w.ticks || 0, LEARNED_AT);
  return '✓'.repeat(n) + '○'.repeat(LEARNED_AT - n);
};

function typePicker(selected) {
  return `
  <div class="subj-picker">
    ${WORD_TYPES.map(t => `
      <button type="button" class="spick ${t.key === selected ? 'on' : ''}" data-wtype="${t.key}"
              style="--c:${t.color};--i:var(--ink)">${t.emoji} ${esc(typeLabel(t.key))}</button>`).join('')}
  </div>`;
}

function addPanel() {
  if (!addMode) {
    return `
    <div class="btn-row" style="margin-bottom:13px">
      <button type="button" class="btn-primary" data-addmode="single">➕ Kelime ekle</button>
      <button type="button" class="btn-ghost" data-addmode="bulk">📋 Toplu yapıştır</button>
    </div>`;
  }

  if (addMode === 'single') {
    return `
    <div class="card">
      <div class="card-title">➕ Yeni kelime</div>
      <div class="frow">
        <div>
          <label class="lbl" for="wEn">İngilizcesi</label>
          <input id="wEn" class="inp" type="text" maxlength="80" placeholder="brave" autocomplete="off">
        </div>
        <div>
          <label class="lbl" for="wTr">Türkçesi</label>
          <input id="wTr" class="inp" type="text" maxlength="80" placeholder="cesur" autocomplete="off">
        </div>
      </div>
      <label class="lbl" style="margin-top:12px">Türü</label>
      ${typePicker(addType)}
      <div class="btn-row" style="margin-top:13px">
        <button type="button" id="saveWord" class="btn-primary">Ekle</button>
        <button type="button" class="btn-ghost" data-addmode="">Kapat</button>
      </div>
      <p class="hint" style="text-align:left;margin:9px 0 0">
        Enter'a basınca kaydeder ve bir sonraki kelimeye geçer ✍️
      </p>
    </div>`;
  }

  return `
  <div class="card">
    <div class="card-title">📋 Toplu yapıştır</div>
    <label class="lbl" for="wBulk">Her satıra bir kelime — <b>apple = elma</b></label>
    <textarea id="wBulk" class="inp ta" rows="8"
      placeholder="apple = elma&#10;brave = cesur&#10;conceal = gizlemek&#10;diligent = çalışkan"></textarea>
    <p class="hint" style="text-align:left;margin:7px 0 12px">
      Ayraç olarak <b>=</b>, <b>:</b>, <b>-</b> veya sekme kullanabilirsin.
      Ayraçsız satırlar atlanır, zaten kayıtlı kelimeler tekrar eklenmez.
    </p>
    <label class="lbl">Hepsinin türü</label>
    ${typePicker(addType)}
    <div class="btn-row" style="margin-top:13px">
      <button type="button" id="saveBulk" class="btn-primary">Hepsini ekle</button>
      <button type="button" class="btn-ghost" data-addmode="">Kapat</button>
    </div>
  </div>`;
}

function wordRow(w) {
  if (editing === w.id) {
    return `
    <li class="wrow editing">
      <input class="uedit" type="text" maxlength="80" value="${esc(w.en)}" data-eden="${w.id}" aria-label="İngilizcesi">
      <input class="uedit" type="text" maxlength="80" value="${esc(w.tr)}" data-edtr="${w.id}" aria-label="Türkçesi">
      <button type="button" class="uicon" data-savew="${w.id}" aria-label="kaydet">✔️</button>
      <button type="button" class="uicon danger" data-delw="${w.id}" aria-label="sil">🗑</button>
    </li>`;
  }
  return `
  <li class="wrow ${isLearned(w) ? 'learned' : ''}">
    <span class="w-en">${esc(w.en)}</span>
    <span class="w-tr">${esc(w.tr)}</span>
    <span class="w-ticks" title="${w.ticks || 0} kez doğru bildin">${tickBar(w)}${isLearned(w) ? ' 🌟' : ''}</span>
    <button type="button" class="uicon" data-editw="${w.id}" aria-label="düzenle">✎</button>
    <button type="button" class="uicon danger" data-delw="${w.id}" aria-label="sil">🗑</button>
  </li>`;
}

export function render() {
  const words = store.get().words || [];
  const learned = words.filter(isLearned).length;
  const q = filter.toLocaleLowerCase('tr');
  const shown = q
    ? words.filter(w => w.en.toLocaleLowerCase('en').includes(q) || w.tr.toLocaleLowerCase('tr').includes(q))
    : words;

  const groups = WORD_TYPES
    .map(t => ({ t, list: shown.filter(w => w.type === t.key) }))
    .filter(g => g.list.length);

  const summary = `
  <div class="card">
    <div class="card-title">🔤 Kelime durumun</div>
    <div class="mini-stats" style="margin-top:0">
      <div class="mini-stat"><b>${words.length}</b>kelime</div>
      <div class="mini-stat"><b>${learned}</b>öğrenildi 🌟</div>
      <div class="mini-stat"><b>${words.length - learned}</b>çalışılıyor</div>
    </div>
    <div class="pbar" style="margin-top:12px">
      <div class="pfill" style="width:${words.length ? (learned / words.length) * 100 : 0}%"></div>
    </div>
  </div>`;

  if (!words.length) {
    return `${addPanel()}
      <div class="card"><div class="empty"><div>🔤</div>
        Henüz kelime eklemedin.<br>
        Kelimelerini ekle, sonra oyunlarla pekiştir! ✨
      </div></div>`;
  }

  return `
    ${summary}
    ${addPanel()}
    <input id="wSearch" class="inp" type="search" placeholder="🔍 Kelime ara" value="${esc(filter)}"
           style="margin-bottom:6px" autocomplete="off">
    ${groups.length ? groups.map(g => `
      <div class="sec-title">${g.t.emoji} ${esc(typeLabel(g.t.key))} <span class="sec-count">${g.list.length}</span></div>
      <ul class="wlist">${g.list.map(wordRow).join('')}</ul>
    `).join('') : `<div class="card"><div class="empty"><div>🔍</div>Aramana uyan kelime yok.</div></div>`}`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);

  const saveSingle = () => {
    const en = ($('#wEn')?.value || '').trim();
    const tr = ($('#wTr')?.value || '').trim();
    if (!en || !tr) { ctx.toast('İngilizcesini ve Türkçesini yazar mısın? 🙂'); return; }
    const { added, skipped } = store.addWords([{ en, tr, type: addType }]);
    if (!added) { ctx.toast(skipped ? 'Bu kelime zaten kayıtlı 🌸' : 'Eklenemedi'); return; }
    ctx.rerender();
    // form açık kalsın, sıradaki kelimeye hazır olalım
    root.querySelector('#wEn')?.focus();
    ctx.toast('Kelime eklendi 🔤');
  };

  root.addEventListener('click', e => {
    const t = e.target;

    const mode = t.closest('[data-addmode]');
    if (mode) { addMode = mode.dataset.addmode || null; ctx.rerender(); return; }

    const pick = t.closest('[data-wtype]');
    if (pick) { addType = pick.dataset.wtype; ctx.rerender(); return; }

    if (t.closest('#saveWord')) { saveSingle(); return; }

    if (t.closest('#saveBulk')) {
      const rows = parseBulk($('#wBulk')?.value).map(r => ({ ...r, type: addType }));
      if (!rows.length) { ctx.toast('Okunabilir satır bulamadım — "apple = elma" gibi yaz 🙂'); return; }
      const { added, skipped } = store.addWords(rows);
      addMode = null;
      ctx.rerender();
      ctx.toast(skipped ? `${added} kelime eklendi · ${skipped} atlandı` : `${added} kelime eklendi 🎉`);
      return;
    }

    const ed = t.closest('[data-editw]');
    if (ed) { editing = ed.dataset.editw; ctx.rerender(); root.querySelector(`[data-eden="${editing}"]`)?.focus(); return; }

    const sv = t.closest('[data-savew]');
    if (sv) {
      const id = sv.dataset.savew;
      store.updateWord(id, {
        en: root.querySelector(`[data-eden="${id}"]`)?.value,
        tr: root.querySelector(`[data-edtr="${id}"]`)?.value,
      });
      editing = null;
      ctx.rerender();
      return;
    }

    const del = t.closest('[data-delw]');
    if (del) {
      const w = store.findWord(del.dataset.delw);
      if (!w || !confirm(`"${w.en}" silinsin mi?`)) return;
      store.removeWord(w.id);
      if (editing === w.id) editing = null;
      ctx.rerender();
      ctx.toast('Kelime silindi');
    }
  });

  root.addEventListener('input', e => {
    if (e.target.id === 'wSearch') {
      filter = e.target.value;
      const at = e.target.selectionStart;
      ctx.rerender();
      const box = root.querySelector('#wSearch');
      if (box) { box.focus(); box.setSelectionRange(at, at); }
    }
  });

  root.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches('#wEn, #wTr')) { e.preventDefault(); saveSingle(); }
    const sv = e.target.closest('[data-eden], [data-edtr]');
    if (sv) {
      const id = sv.dataset.eden || sv.dataset.edtr;
      root.querySelector(`[data-savew="${id}"]`)?.click();
    }
  });
}

/** Sekmeden çıkarken form durumunu sıfırlamak için */
export function reset() { addMode = null; filter = ''; editing = null; }

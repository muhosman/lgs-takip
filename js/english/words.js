// "Kelimelerim" alt sekmesi — kelime ekleme, toplu yapıştırma ve tür tür liste
import { WORD_TYPES, WORD_TYPE_MAP, typeLabel, LEARNED_AT } from '../data.js';
import * as store from '../store.js';
import { esc } from '../utils.js';
import { isLearned } from './session.js';

let modalOpen = false;     // ekleme modal'ı açık mı
let addMode = 'single';    // modal içindeki sekme: 'single' | 'bulk'
let addType = 'noun';      // ekleme formunda seçili tür
let filter = '';           // arama kutusu
let editing = null;        // düzenlenen kelimenin id'si
let escHandler = null;     // önceki render'ın Esc dinleyicisi
let addedNow = 0;          // modal açıkken kaç kelime eklendi

// Her tıklama görünümü yeniden çizdiği için yazılanlar burada saklanıyor;
// aksi hâlde tür seçmek yazdığın kelimeyi siliyordu.
let draft = { en: '', tr: '', bulk: '' };

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

const addButton = () =>
  `<button type="button" class="btn-primary wide" data-openadd style="margin-bottom:13px">➕ Kelime ekle</button>`;

function addModal() {
  if (!modalOpen) return '';

  const body = addMode === 'single' ? `
    <div class="frow">
      <div>
        <label class="lbl" for="wEn">İngilizcesi</label>
        <input id="wEn" class="inp" type="text" maxlength="80" placeholder="brave"
               value="${esc(draft.en)}" autocomplete="off" autocapitalize="none" spellcheck="false">
      </div>
      <div>
        <label class="lbl" for="wTr">Türkçesi</label>
        <input id="wTr" class="inp" type="text" maxlength="80" placeholder="cesur"
               value="${esc(draft.tr)}" autocomplete="off">
      </div>
    </div>
    <label class="lbl" style="margin-top:12px">Türü</label>
    ${typePicker(addType)}
    <p class="hint" style="text-align:left;margin:10px 0 0">
      Enter'a basınca kaydeder ve bir sonraki kelimeye geçer ✍️
    </p>`
  : `
    <label class="lbl" for="wBulk">Her satıra bir kelime — <b>apple = elma</b></label>
    <textarea id="wBulk" class="inp ta" rows="7"
      placeholder="apple = elma&#10;brave = cesur&#10;conceal = gizlemek&#10;diligent = çalışkan">${esc(draft.bulk)}</textarea>
    <p class="hint" style="text-align:left;margin:7px 0 12px">
      Ayraç olarak <b>=</b>, <b>:</b>, <b>-</b> veya sekme kullanabilirsin.
      Ayraçsız satırlar atlanır, zaten kayıtlı kelimeler tekrar eklenmez.
    </p>
    <label class="lbl">Hepsinin türü</label>
    ${typePicker(addType)}`;

  return `
  <div class="modal-scrim" data-closeadd></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Kelime ekle">
    <div class="modal-head">
      <span class="modal-title">➕ Kelime ekle</span>
      <button type="button" class="drawer-x" data-closeadd aria-label="kapat">✕</button>
    </div>

    <div class="modal-modes">
      <button type="button" class="subtab ${addMode === 'single' ? 'on' : ''}" data-addmode="single">✍️ Tek tek</button>
      <button type="button" class="subtab ${addMode === 'bulk' ? 'on' : ''}" data-addmode="bulk">📋 Toplu yapıştır</button>
    </div>

    <div class="modal-body">${body}</div>

    <div class="modal-foot">
      ${addedNow ? `<span class="modal-count">✅ ${addedNow} kelime eklendi</span>` : ''}
      <div class="btn-row">
        <button type="button" class="btn-primary" data-save>${addMode === 'single' ? 'Ekle' : 'Hepsini ekle'}</button>
        <button type="button" class="btn-ghost" data-closeadd>Bitir</button>
      </div>
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
    return `${addButton()}
      <div class="card"><div class="empty"><div>🔤</div>
        Henüz kelime eklemedin.<br>
        Kelimelerini ekle, sonra oyunlarla pekiştir! ✨
      </div></div>
      ${addModal()}`;
  }

  return `
    ${summary}
    ${addButton()}
    ${addModal()}
    <input id="wSearch" class="inp" type="search" placeholder="🔍 Kelime ara" value="${esc(filter)}"
           style="margin-bottom:6px" autocomplete="off">
    ${groups.length ? groups.map(g => `
      <div class="sec-title">${g.t.emoji} ${esc(typeLabel(g.t.key))} <span class="sec-count">${g.list.length}</span></div>
      <ul class="wlist">${g.list.map(wordRow).join('')}</ul>
    `).join('') : `<div class="card"><div class="empty"><div>🔍</div>Aramana uyan kelime yok.</div></div>`}`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);

  // Modal açıkken arka plan kaymasın (app.js sekme geçişinde bu sınıfı bırakır)
  document.body.classList.toggle('modal-open', modalOpen);

  const closeAdd = () => {
    modalOpen = false;
    addMode = 'single';        // tekrar açınca hep tanıdık form gelsin
    addedNow = 0;
    draft = { en: '', tr: '', bulk: '' };
    ctx.rerender();
  };

  if (escHandler) document.removeEventListener('keydown', escHandler);
  escHandler = e => {
    if (e.key === 'Escape' && modalOpen && root.isConnected) closeAdd();
  };
  document.addEventListener('keydown', escHandler);

  const saveSingle = () => {
    const en = (draft.en || '').trim();
    const tr = (draft.tr || '').trim();
    if (!en || !tr) { ctx.toast('İngilizcesini ve Türkçesini yazar mısın? 🙂'); return; }
    const { added, skipped } = store.addWords([{ en, tr, type: addType }]);
    if (!added) { ctx.toast(skipped ? 'Bu kelime zaten kayıtlı 🌸' : 'Eklenemedi'); return; }
    addedNow++;
    draft.en = draft.tr = '';          // modal açık kalsın, sıradakine hazır olalım
    ctx.rerender();
    root.querySelector('#wEn')?.focus();
  };

  const saveBulk = () => {
    const rows = parseBulk(draft.bulk).map(r => ({ ...r, type: addType }));
    if (!rows.length) { ctx.toast('Okunabilir satır bulamadım — "apple = elma" gibi yaz 🙂'); return; }
    const { added, skipped } = store.addWords(rows);
    draft.bulk = '';
    addedNow += added;
    ctx.rerender();
    ctx.toast(skipped ? `${added} kelime eklendi · ${skipped} atlandı` : `${added} kelime eklendi 🎉`);
  };

  root.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('[data-openadd]')) { modalOpen = true; addedNow = 0; ctx.rerender(); root.querySelector('#wEn')?.focus(); return; }
    if (t.closest('[data-closeadd]')) { closeAdd(); return; }

    const mode = t.closest('[data-addmode]');
    if (mode) { addMode = mode.dataset.addmode; ctx.rerender(); return; }

    const pick = t.closest('[data-wtype]');
    if (pick) {
      addType = pick.dataset.wtype;
      ctx.rerender();
      // tür seçmek yazdıklarını silmesin diye odak yazılan alana geri döner
      root.querySelector(addMode === 'bulk' ? '#wBulk' : '#wEn')?.focus();
      return;
    }

    if (t.closest('[data-save]')) { addMode === 'single' ? saveSingle() : saveBulk(); return; }

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
    // Yazılanlar modül durumunda tutulur; yeniden çizim onları silmesin
    if (e.target.id === 'wEn')   { draft.en = e.target.value; return; }
    if (e.target.id === 'wTr')   { draft.tr = e.target.value; return; }
    if (e.target.id === 'wBulk') { draft.bulk = e.target.value; return; }

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
    // İngilizce alanından Enter Türkçeye geçsin, Türkçeden Enter kaydetsin
    if (e.target.id === 'wEn') { e.preventDefault(); root.querySelector('#wTr')?.focus(); return; }
    if (e.target.id === 'wTr') { e.preventDefault(); saveSingle(); return; }
    const sv = e.target.closest('[data-eden], [data-edtr]');
    if (sv) {
      const id = sv.dataset.eden || sv.dataset.edtr;
      root.querySelector(`[data-savew="${id}"]`)?.click();
    }
  });
}

/** Sekmeden çıkarken form durumunu sıfırlamak için */
export function reset() {
  modalOpen = false; addMode = 'single'; addedNow = 0;
  draft = { en: '', tr: '', bulk: '' };
  filter = ''; editing = null;
}

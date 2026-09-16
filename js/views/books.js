// "Kitaplarım" ekranı — ders bazlı kitaplar ve ünite takibi
import { SUBJECTS, SUBJ_MAP } from '../data.js';
import * as store from '../store.js';
import { esc } from '../utils.js';
import { confetti } from '../confetti.js';

// Görünüm yeniden çizildiğinde açık kalan kartlar ve düzenlenen satırlar korunsun
const expanded = new Set();
const editing = new Set();
let formOpen = false;
let formSubject = SUBJECTS[0].key;

const progressOf = book => {
  const total = book.units.length;
  const done = book.units.filter(u => u.done).length;
  return { total, done, pct: total ? (done / total) * 100 : 0, finished: total > 0 && done === total };
};

function summaryCard(books) {
  const total = books.reduce((a, b) => a + b.units.length, 0);
  const done = books.reduce((a, b) => a + b.units.filter(u => u.done).length, 0);
  const finished = books.filter(b => progressOf(b).finished).length;
  const pct = total ? (done / total) * 100 : 0;

  return `
  <div class="card">
    <div class="card-title">📚 Kitap durumun</div>
    <div class="mini-stats" style="margin-top:0">
      <div class="mini-stat"><b>${books.length}</b>kitap</div>
      <div class="mini-stat"><b>${done}/${total}</b>ünite</div>
      <div class="mini-stat"><b>${finished}</b>bitirilen kitap</div>
      <div class="mini-stat"><b>%${Math.round(pct)}</b>genel ilerleme</div>
    </div>
    <div class="pbar" style="margin-top:12px"><div class="pfill" style="width:${pct}%"></div></div>
  </div>`;
}

function addForm() {
  if (!formOpen) {
    return `<button type="button" id="openForm" class="btn-primary wide" style="margin-bottom:13px">➕ Kitap ekle</button>`;
  }
  return `
  <div class="card">
    <div class="card-title">➕ Yeni kitap</div>

    <label class="lbl">Hangi ders?</label>
    <div class="subj-picker">
      ${SUBJECTS.map(s => `
        <button type="button" class="spick ${s.key === formSubject ? 'on' : ''}" data-pick="${s.key}"
                style="--c:${s.color};--i:${s.ink}">${s.emoji} ${esc(s.name)}</button>`).join('')}
    </div>

    <label class="lbl" for="bookName" style="margin-top:12px">Kitabın adı</label>
    <input id="bookName" class="inp" type="text" maxlength="80" placeholder="Örn: ABC Yayınları Soru Bankası">

    <label class="lbl" for="bookUnits" style="margin-top:12px">Üniteler — her satıra bir tane</label>
    <textarea id="bookUnits" class="inp ta" rows="7" placeholder="Çarpanlar ve Katlar&#10;Üslü İfadeler&#10;Kareköklü İfadeler&#10;Veri Analizi"></textarea>
    <p class="hint" style="text-align:left;margin:7px 0 12px">
      Kitabın içindekiler sayfasını kopyalayıp buraya yapıştırabilirsin ✨
    </p>

    <div class="btn-row">
      <button type="button" id="saveBook" class="btn-primary">Kitabı ekle</button>
      <button type="button" id="cancelBook" class="btn-ghost">Vazgeç</button>
    </div>
  </div>`;
}

function unitRow(book, u) {
  const isEdit = editing.has(u.id);
  return `
  <li class="unit ${u.done ? 'done' : ''}">
    <button type="button" class="ubox" data-toggle="${book.id}|${u.id}" aria-label="tamamlandı işareti">
      ${u.done ? '✓' : ''}
    </button>
    ${isEdit
      ? `<input class="uedit" type="text" maxlength="120" value="${esc(u.name)}" data-rename="${book.id}|${u.id}">`
      : `<span class="uname" data-toggle="${book.id}|${u.id}">${esc(u.name)}</span>`}
    <button type="button" class="uicon" data-edit="${u.id}" aria-label="adını değiştir">${isEdit ? '✔️' : '✎'}</button>
    <button type="button" class="uicon danger" data-delunit="${book.id}|${u.id}" aria-label="üniteyi sil">🗑</button>
  </li>`;
}

function bookCard(book) {
  const s = SUBJ_MAP[book.subject] || SUBJECTS[0];
  const { total, done, pct, finished } = progressOf(book);
  const open = expanded.has(book.id);

  return `
  <div class="book ${finished ? 'finished' : ''}" style="--c:${s.color};--i:${s.ink}">
    <div class="book-head" data-expand="${book.id}">
      <span class="book-emoji">${finished ? '🎓' : s.emoji}</span>
      <div class="book-main">
        <div class="book-name">${esc(book.name)}</div>
        <div class="book-sub">${esc(s.name)} · ${done}/${total} ünite</div>
        <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
      </div>
      <span class="book-pct">%${Math.round(pct)}</span>
      <span class="book-caret ${open ? 'open' : ''}">▾</span>
    </div>

    ${open ? `
    <div class="book-body">
      ${total
        ? `<ul class="units">${book.units.map(u => unitRow(book, u)).join('')}</ul>`
        : `<p class="hint" style="margin:4px 0 10px">Bu kitapta henüz ünite yok.</p>`}

      <div class="add-unit">
        <input class="inp" type="text" maxlength="120" placeholder="Yeni ünite adı" data-newunit="${book.id}">
        <button type="button" class="btn-ghost" data-addunit="${book.id}">Ekle</button>
      </div>

      <div class="btn-row" style="margin-top:10px">
        <button type="button" class="btn-ghost" data-renamebook="${book.id}">✎ Kitabın adını değiştir</button>
        <button type="button" class="btn-danger" data-delbook="${book.id}">🗑 Kitabı sil</button>
      </div>
    </div>` : ''}
  </div>`;
}

export function render() {
  const books = store.get().books || [];

  if (!books.length) {
    return `
      ${addForm()}
      <div class="card"><div class="empty"><div>📚</div>
        Henüz kitap eklemedin.<br>
        Kitaplarını ekle, ünitelerini işaretleyerek nerede kaldığını takip et! ✨
      </div></div>`;
  }

  // dersine göre grupla, ders sırasını koru
  const groups = SUBJECTS
    .map(s => ({ s, list: books.filter(b => b.subject === s.key) }))
    .filter(g => g.list.length);

  return `
    ${summaryCard(books)}
    ${addForm()}
    ${groups.map(g => `
      <div class="sec-title">${g.s.emoji} ${esc(g.s.name)}</div>
      <div class="grid-cards">${g.list.map(bookCard).join('')}</div>
    `).join('')}`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);
  const parse = v => v.split('|');

  root.addEventListener('click', e => {
    const t = e.target;

    // --- form aç/kapat ---
    if (t.closest('#openForm')) { formOpen = true; ctx.rerender(); return; }
    if (t.closest('#cancelBook')) { formOpen = false; ctx.rerender(); return; }

    const pick = t.closest('[data-pick]');
    if (pick) { formSubject = pick.dataset.pick; ctx.rerender(); return; }

    if (t.closest('#saveBook')) {
      const name = ($('#bookName').value || '').trim();
      const units = ($('#bookUnits').value || '')
        .split('\n').map(x => x.trim()).filter(Boolean);
      if (!name) { ctx.toast('Kitabın adını yazar mısın? 🙂'); return; }
      const book = store.addBook({ subject: formSubject, name, unitNames: units });
      formOpen = false;
      expanded.add(book.id);
      ctx.rerender();
      ctx.toast(units.length ? `Kitap eklendi · ${units.length} ünite 📚` : 'Kitap eklendi 📚');
      ctx.checkBadges();
      return;
    }

    // --- kartı aç/kapat ---
    const head = t.closest('[data-expand]');
    if (head && !t.closest('[data-toggle]')) {
      const id = head.dataset.expand;
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      ctx.rerender();
      return;
    }

    // --- ünite işaretle ---
    const tog = t.closest('[data-toggle]');
    if (tog) {
      const [bookId, unitId] = parse(tog.dataset.toggle);
      if (editing.has(unitId)) return;              // düzenlenirken işaretleme
      const res = store.toggleUnit(bookId, unitId);
      ctx.rerender();
      ctx.refreshHeader();
      if (res?.justFinished) {
        confetti();
        ctx.toast('🎓 Kitabı bitirdin, harikasın!');
      }
      ctx.checkBadges();
      return;
    }

    // --- ünite adını düzenle ---
    const ed = t.closest('[data-edit]');
    if (ed) {
      const id = ed.dataset.edit;
      if (editing.has(id)) {
        const input = root.querySelector(`[data-rename$="|${id}"]`);
        if (input) {
          const [bookId, unitId] = parse(input.dataset.rename);
          store.renameUnit(bookId, unitId, input.value);
        }
        editing.delete(id);
      } else {
        editing.add(id);
      }
      ctx.rerender();
      const focus = root.querySelector(`[data-rename$="|${id}"]`);
      if (focus) { focus.focus(); focus.select(); }
      return;
    }

    // --- ünite sil ---
    const du = t.closest('[data-delunit]');
    if (du) {
      const [bookId, unitId] = parse(du.dataset.delunit);
      store.removeUnit(bookId, unitId);
      ctx.rerender();
      return;
    }

    // --- ünite ekle ---
    const au = t.closest('[data-addunit]');
    if (au) {
      const input = root.querySelector(`[data-newunit="${au.dataset.addunit}"]`);
      const val = (input?.value || '').trim();
      if (!val) { ctx.toast('Ünite adını yazar mısın?'); return; }
      store.addUnits(au.dataset.addunit, [val]);
      ctx.rerender();
      ctx.toast('Ünite eklendi ✨');
      return;
    }

    // --- kitap adını değiştir ---
    const rb = t.closest('[data-renamebook]');
    if (rb) {
      const book = store.findBook(rb.dataset.renamebook);
      if (!book) return;
      const val = prompt('Kitabın yeni adı:', book.name);
      if (val && val.trim()) {
        store.renameBook(book.id, val);
        ctx.rerender();
        ctx.toast('Kitap adı güncellendi');
      }
      return;
    }

    // --- kitap sil ---
    const db = t.closest('[data-delbook]');
    if (db) {
      const book = store.findBook(db.dataset.delbook);
      if (!book) return;
      if (!confirm(`"${book.name}" silinsin mi? Üniteleri de gider.`)) return;
      store.removeBook(book.id);
      expanded.delete(book.id);
      ctx.rerender();
      ctx.refreshHeader();
      ctx.toast('Kitap silindi');
    }
  });

  // düzenleme kutusunda Enter ile kaydet
  root.addEventListener('keydown', e => {
    const inp = e.target.closest('[data-rename]');
    if (inp && e.key === 'Enter') {
      const [bookId, unitId] = parse(inp.dataset.rename);
      store.renameUnit(bookId, unitId, inp.value);
      editing.delete(unitId);
      ctx.rerender();
    }
    const nu = e.target.closest('[data-newunit]');
    if (nu && e.key === 'Enter') {
      const val = nu.value.trim();
      if (!val) return;
      store.addUnits(nu.dataset.newunit, [val]);
      ctx.rerender();
    }
  });
}

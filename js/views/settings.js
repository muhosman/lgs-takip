// "Ayarlar" ekranı — kişiselleştirme, yedekleme, sıfırlama
import * as store from '../store.js';
import * as sync from '../sync.js';
import { esc, clampInt, dateOf, fmtLong, daysBetween, todayKey, fmtNet } from '../utils.js';
import { GIFT_KINDS, GIFT_KIND_MAP } from '../data.js';
import { summarize, giftProgress } from '../gamify.js';

// Hediye düzenleyicisi bu oturumda şifreyle açıldı mı? Sekmeden çıkınca kapanır.
let giftsOpen = false;
export const lockGifts = () => { giftsOpen = false; };

function giftAdminRow(g, st, opened) {
  const p = giftProgress(g, st);
  const cur = g.kind === 'net' ? fmtNet(p.cur) : Math.floor(p.cur);
  const status = !p.unlocked ? `🔒 ${cur}/${g.target}` : opened[g.id] ? '🎉 açıldı' : '🎁 hazır, açılmadı';
  return `
  <li class="gadm">
    <div class="gadm-main">
      <div class="gadm-name">${esc(g.name)}</div>
      <div class="gadm-sub">${esc(GIFT_KIND_MAP[g.kind]?.cond(g.target) || '')} · ${status}</div>
    </div>
    <label class="gadm-done"><input type="checkbox" data-gdeliver="${g.id}" ${g.delivered ? 'checked' : ''}> teslim</label>
    <button type="button" class="del-x" data-gdel="${g.id}" aria-label="sil">🗑</button>
  </li>`;
}

function giftCard(s) {
  if (!s.giftPin) {
    return `
    <div class="card">
      <div class="card-title">🎁 Hediyeler</div>
      <p class="hint" style="text-align:left;margin:0 0 11px">
        Belli bir nete, puana ya da seviyeye ulaşınca açılan hediyeler koy. Önce yalnız
        senin bileceğin bir hediye şifresi belirle, böylece sürpriz bozulmaz 🤫
      </p>
      <input id="giftPinNew" class="inp" type="password" inputmode="numeric" maxlength="6" placeholder="4-6 rakam">
      <div style="height:10px"></div>
      <button type="button" id="giftPinSet" class="btn-ghost">Şifreyi belirle</button>
    </div>`;
  }
  if (!giftsOpen) {
    return `
    <div class="card">
      <div class="card-title">🎁 Hediyeler</div>
      <input id="giftPinIn" class="inp" type="password" inputmode="numeric" maxlength="6" placeholder="Hediye şifresi">
      <div style="height:10px"></div>
      <button type="button" id="giftUnlock" class="btn-ghost">Aç</button>
    </div>`;
  }
  const st = summarize(s);
  const opened = s.openedGifts || {};
  return `
  <div class="card">
    <div class="card-title">🎁 Hediyeler</div>
    ${s.gifts.length
      ? `<ul class="gadm-list">${s.gifts.map(g => giftAdminRow(g, st, opened)).join('')}</ul>`
      : '<p class="hint" style="text-align:left;margin:0 0 11px">Henüz hediye yok.</p>'}
    <div class="gadm-form">
      <label class="lbl" for="gName">Hediye</label>
      <input id="gName" class="inp" type="text" maxlength="80" placeholder="Örn: Sinema bileti">
      <div class="frow" style="margin-top:9px">
        <div>
          <label class="lbl" for="gKind">Koşul</label>
          <select id="gKind" class="inp">${GIFT_KINDS.map(k => `<option value="${k.key}">${esc(k.label)}</option>`).join('')}</select>
        </div>
        <div>
          <label class="lbl" for="gTarget">Hedef</label>
          <input id="gTarget" class="inp" type="number" inputmode="numeric" min="1" placeholder="Örn: 70">
        </div>
      </div>
      <div style="height:10px"></div>
      <button type="button" id="gAdd" class="btn-primary wide">Hediye ekle 🎁</button>
    </div>
    <p class="hint" style="text-align:left;margin:12px 0 9px">
      Kardeşin yalnız koşulu ve ilerlemeyi görür. Koşul sağlanınca kutu sallanır,
      dokununca hediyenin adı açılır.
    </p>
    <div class="btn-row">
      <button type="button" id="giftPinChange" class="btn-ghost">Şifreyi değiştir</button>
      <button type="button" id="giftClose" class="btn-ghost">Kapat 🔒</button>
    </div>
  </div>`;
}

export function render() {
  const s = store.get();
  const exam = dateOf(s.examDate);
  const kalan = daysBetween(new Date(), exam);

  return `
  <div class="grid-cards">
  <div class="card">
    <div class="card-title">🎀 Kişisel</div>
    <label class="lbl" for="setName">Adın</label>
    <input id="setName" class="inp" type="text" maxlength="18" value="${esc(s.name)}" placeholder="Adın">
    <div style="height:11px"></div>
    <label class="lbl" for="setGoal">Günlük soru hedefin</label>
    <input id="setGoal" class="inp" type="number" inputmode="numeric" min="0" max="999" value="${store.goalFor(todayKey())}">
    <p class="hint" style="text-align:left;margin:8px 0 0">
      Değişiklik <b>bugünden itibaren</b> geçerli olur; geçmiş günler kendi hedefiyle kalır 🎯
    </p>
  </div>

  <div class="card">
    <div class="card-title">⏳ Sınav tarihi</div>
    <input id="setExam" class="inp" type="date" value="${esc(s.examDate)}">
    <p class="hint" style="text-align:left;margin-top:9px">
      ${kalan >= 0 ? `<b>${fmtLong(exam)}</b> · ${kalan} gün kaldı 💪` : 'Sınav tarihi geçmiş görünüyor, güncelleyebilirsin.'}
    </p>
  </div>

  <div class="card">
    <div class="card-title">🔒 Şifre</div>
    <label class="lbl" for="setPin">Yeni şifre (6 rakam)</label>
    <input id="setPin" class="inp" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" placeholder="••••••">
    <div style="height:10px"></div>
    <button type="button" id="savePin" class="btn-ghost">Şifreyi güncelle</button>
  </div>

  ${giftCard(s)}

  ${sync.enabled() ? `
  <div class="card">
    <div class="card-title">☁️ Bulut eşitleme</div>
    <p class="hint" style="text-align:left;margin:0 0 11px">
      Kayıtların buluta yazılıyor — telefondan girdiğin bilgisayarda da görünür.
      Eşitleme kendiliğinden olur; istersen elle de tetikleyebilirsin.
    </p>
    <button type="button" id="syncBtn" class="btn-ghost">🔄 Şimdi eşitle</button>
  </div>` : ''}

  <div class="card">
    <div class="card-title">💾 Yedekleme</div>
    <p class="hint" style="text-align:left;margin:0 0 11px">
      ${sync.enabled()
        ? 'Buluttaki verinin bir kopyasını dosya olarak da saklamak istersen 🌸'
        : 'Veriler bu tarayıcıda saklanır. Telefon değiştirirsen veya tarayıcıyı temizlersen kaybolmasın diye ara ara yedek al 🌸'}
    </p>
    <div class="btn-row">
      <button type="button" id="exportBtn" class="btn-ghost">⬇️ Yedek indir</button>
      <button type="button" id="importBtn" class="btn-ghost">⬆️ Yedek yükle</button>
    </div>
    <input id="importFile" type="file" accept="application/json,.json" hidden>
  </div>

  <div class="card">
    <div class="card-title">🧹 Sıfırla</div>
    <p class="hint" style="text-align:left;margin:0 0 11px">Tüm soru kayıtları ve denemeler silinir. Ayarların korunur.${sync.enabled() ? ' Buluttaki kopya da silinir.' : ''}</p>
    <button type="button" id="resetBtn" class="btn-danger">Tüm verileri sil</button>
  </div>

  <div class="card">
    <div class="card-title">🔓 Çıkış</div>
    <button type="button" id="lockBtn" class="btn-ghost">Kilitle</button>
  </div>

  </div>
  <p class="hint">Sevgiyle yapıldı 💗 · v1.0</p>`;
}

export function bind(root, ctx) {
  const $ = sel => root.querySelector(sel);

  $('#setName').addEventListener('change', e => {
    store.setMeta({ name: e.target.value.trim().slice(0, 18) });
    ctx.refreshHeader();
    ctx.toast('Kaydedildi 🌸');
  });

  $('#setGoal').addEventListener('change', e => {
    const v = clampInt(e.target.value, 0, 999);
    e.target.value = v;
    store.setGoal(v);                 // bugünden itibaren geçerli
    ctx.toast('Hedef bugünden itibaren güncellendi 🎯');
  });

  $('#setExam').addEventListener('change', e => {
    if (!e.target.value) return;
    store.setMeta({ examDate: e.target.value });
    ctx.refreshHeader();
    ctx.rerender();
  });

  $('#savePin').addEventListener('click', () => {
    const v = ($('#setPin').value || '').replace(/\D/g, '');
    if (v.length !== 6) { ctx.toast('Şifre 6 rakam olmalı'); return; }
    store.setMeta({ pin: v });
    $('#setPin').value = '';
    ctx.toast('Şifre güncellendi 🔒');
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.get(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lgs-takip-yedek-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ctx.toast('Yedek indirildi 💾');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());

  $('#importFile').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        store.replaceAll(JSON.parse(reader.result));
        ctx.toast('Yedek yüklendi ✅');
        ctx.refreshHeader();
        ctx.rerender();
      } catch (err) {
        ctx.toast('Dosya okunamadı 😔');
        console.warn(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Tüm soru kayıtların ve denemelerin silinecek. Emin misin?')) return;
    if (!confirm('Gerçekten emin misin? Bu işlem geri alınamaz.')) return;
    store.resetAll();
    ctx.refreshHeader();
    ctx.rerender();
    ctx.toast('Veriler sıfırlandı');
  });

  $('#syncBtn')?.addEventListener('click', () => ctx.syncNow());

  /* ---- hediyeler ---- */
  const pinOk = v => /^\d{4,6}$/.test(v);

  $('#giftPinSet')?.addEventListener('click', () => {
    const v = $('#giftPinNew').value.trim();
    if (!pinOk(v)) { ctx.toast('Şifre 4-6 rakam olmalı'); return; }
    store.setMeta({ giftPin: v });
    giftsOpen = true;
    ctx.rerender();
  });

  const unlock = () => {
    if ($('#giftPinIn').value.trim() !== store.get().giftPin) { ctx.toast('Şifre yanlış'); return; }
    giftsOpen = true;
    ctx.rerender();
  };
  $('#giftUnlock')?.addEventListener('click', unlock);
  $('#giftPinIn')?.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });

  $('#giftClose')?.addEventListener('click', () => { giftsOpen = false; ctx.rerender(); });

  $('#giftPinChange')?.addEventListener('click', () => {
    const v = (prompt('Yeni hediye şifresi (4-6 rakam)') || '').trim();
    if (!v) return;
    if (!pinOk(v)) { ctx.toast('Şifre 4-6 rakam olmalı'); return; }
    store.setMeta({ giftPin: v });
    ctx.toast('Hediye şifresi güncellendi 🔒');
  });

  $('#gAdd')?.addEventListener('click', () => {
    const name = $('#gName').value.trim();
    const kind = $('#gKind').value;
    const target = clampInt($('#gTarget').value, 0, 999999);
    if (!name) { ctx.toast('Hediyenin adını yaz'); return; }
    if (!GIFT_KIND_MAP[kind] || target < 1) { ctx.toast('Hedefi gir'); return; }
    store.addGift({ name, kind, target });
    ctx.refreshHeader();
    ctx.rerender();
    ctx.toast('Hediye eklendi 🎁');
  });

  root.addEventListener('change', e => {
    const cb = e.target.closest('[data-gdeliver]');
    if (!cb) return;
    store.setGiftDelivered(cb.dataset.gdeliver, cb.checked);
    ctx.toast(cb.checked ? 'Teslim edildi olarak işaretlendi 💝' : 'Teslim işareti kaldırıldı');
  });

  root.addEventListener('click', e => {
    const del = e.target.closest('[data-gdel]');
    if (!del) return;
    const g = store.findGift(del.dataset.gdel);
    if (!g || !confirm(`"${g.name}" silinsin mi?`)) return;
    store.removeGift(g.id);
    ctx.refreshHeader();
    ctx.rerender();
  });

  $('#lockBtn').addEventListener('click', () => ctx.lock());
}

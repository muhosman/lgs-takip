// "Ayarlar" ekranı — kişiselleştirme, yedekleme, sıfırlama
import * as store from '../store.js';
import * as sync from '../sync.js';
import { esc, clampInt, dateOf, fmtLong, daysBetween, todayKey } from '../utils.js';

export function render() {
  const s = store.get();
  const exam = dateOf(s.examDate);
  const kalan = daysBetween(new Date(), exam);

  return `
  <div class="card">
    <div class="card-title">🎀 Kişisel</div>
    <label class="lbl" for="setName">Adın</label>
    <input id="setName" class="inp" type="text" maxlength="18" value="${esc(s.name)}" placeholder="Adın">
    <div style="height:11px"></div>
    <label class="lbl" for="setGoal">Günlük soru hedefin</label>
    <input id="setGoal" class="inp" type="number" inputmode="numeric" min="0" max="999" value="${s.dailyGoal}">
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
    store.setMeta({ dailyGoal: v });
    ctx.toast('Hedef güncellendi 🎯');
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

  $('#lockBtn').addEventListener('click', () => ctx.lock());
}

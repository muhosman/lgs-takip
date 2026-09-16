// Sabitler: dersler, metrikler, seviyeler, rozetler

export const SUBJECTS = [
  { key:'turkce',    name:'TÜRKÇE',        emoji:'📚', color:'#F7B7B6', ink:'#8A4A4A', q:20, w:4 },
  { key:'matematik', name:'MATEMATİK',     emoji:'📐', color:'#A9E4DE', ink:'#26635C', q:20, w:4 },
  { key:'fen',       name:'FEN BİLİMLERİ', emoji:'🔬', color:'#A8E9C6', ink:'#276848', q:20, w:4 },
  { key:'inkilap',   name:'T.C. İNKILAP',  emoji:'🏛️', color:'#FBE3A6', ink:'#8A6A17', q:10, w:1 },
  { key:'ingilizce', name:'İNGİLİZCE',     emoji:'🌍', color:'#C6BAF5', ink:'#4A3A8C', q:10, w:1 },
  { key:'din',       name:'DİN KÜLTÜRÜ',   emoji:'🕌', color:'#F7B9D2', ink:'#8A3A63', q:10, w:1 },
];

export const SUBJ_MAP = Object.fromEntries(SUBJECTS.map(s => [s.key, s]));

// Girilen metrikler. Toplam soru = doğru + yanlış + boş + çözdürdüğüm
export const METRICS = [
  { key:'d',  label:'Doğru',       emoji:'✅', short:'Doğru' },
  { key:'y',  label:'Yanlış',      emoji:'❌', short:'Yanlış' },
  { key:'b',  label:'Boş',         emoji:'⚪', short:'Boş' },
  { key:'ct', label:'Çözdürdüğüm', emoji:'🧑‍🏫', short:'Çözdürdüğüm' },
];

// Çözdürülen soru da bir sorudur ve ekstra puan kazandırır:
// kendi çözdüğü 1 XP, çözdürdüğü 2 XP.
export const XP_PER_OWN = 1;
export const XP_PER_TAUGHT = 2;

export const LEVEL_TITLES = [
  'Yeni Başlayan','Kalem Dostu','Defter Kurdu','Soru Avcısı','Net Ustası',
  'Test Kâşifi','Kalem Ustası','Deneme Şampiyonu','Bilgi Kâşifi','LGS Kahramanı',
  'Efsane Öğrenci','Yıldız Avcısı','Zirvedeki','Efsanenin Ötesi',
];

// XP eşiği: n. seviyeye ulaşmak için 20*n*(n-1) XP (1 soru = 1 XP)
export const xpForLevel = n => 20 * n * (n - 1);

/**
 * İngilizce kelime türleri. Etiket bilerek iki dilli: terimin İngilizcesi de
 * gördükçe öğrenilsin diye her yerde "VERB (fiil)" biçiminde gösterilir.
 */
export const WORD_TYPES = [
  { key:'noun',    en:'NOUN',         tr:'isim',      emoji:'📐', color:'#A9E4DE' },
  { key:'verb',    en:'VERB',         tr:'fiil',      emoji:'🏃', color:'#F7B7B6' },
  { key:'adj',     en:'ADJECTIVE',    tr:'sıfat',     emoji:'🎨', color:'#FBE3A6' },
  { key:'adv',     en:'ADVERB',       tr:'zarf',      emoji:'⚡', color:'#C6BAF5' },
  { key:'phrasal', en:'PHRASAL VERB', tr:'öbek fiil', emoji:'🔗', color:'#A8E9C6' },
  { key:'phrase',  en:'PHRASE',       tr:'kalıp',     emoji:'💬', color:'#F7B9D2' },
  { key:'other',   en:'OTHER',        tr:'diğer',     emoji:'✨', color:'#E3DCF7' },
];

export const WORD_TYPE_MAP = Object.fromEntries(WORD_TYPES.map(t => [t.key, t]));

/** "VERB (fiil)" — tür etiketinin tek doğru yazımı */
export const typeLabel = key => {
  const t = WORD_TYPE_MAP[key] || WORD_TYPE_MAP.other;
  return `${t.en} (${t.tr})`;
};

/** Bu kadar doğru bilince kelime "öğrenildi" sayılır */
export const LEARNED_AT = 5;

// Rozet grupları — rozetler ekranında bu sırayla başlıklara ayrılır
export const BADGE_GROUPS = [
  { key:'soru',   label:'Soru sayısı',   emoji:'✏️' },
  { key:'seri',   label:'Süreklilik',    emoji:'🔥' },
  { key:'hedef',  label:'Hedef',         emoji:'🎯' },
  { key:'tempo',  label:'Tempo',         emoji:'⚡' },
  { key:'ders',   label:'Ders ustalığı', emoji:'🎓' },
  { key:'deneme', label:'Denemeler',     emoji:'📝' },
  { key:'kitap',  label:'Kitaplar',      emoji:'📚' },
  { key:'ogret',  label:'Öğretmek',      emoji:'🧑‍🏫' },
];

/**
 * Sayaca dayalı rozet: hem "kazanıldı mı" testini hem de kilitliyken
 * gösterilecek ilerlemeyi (`[şuan, hedef]`) üretir.
 */
const tier = (id, ico, name, desc, group, pick, target) => ({
  id, ico, name, desc, group,
  test: s => pick(s) >= target,
  progress: s => [Math.min(Math.floor(pick(s)), target), target],
});

/** Evet/hayır rozeti — ilerleme çubuğu yok */
const flag = (id, ico, name, desc, group, pick) => ({ id, ico, name, desc, group, test: s => !!pick(s) });

const subjQ = key => s => s.perSubject[key] || 0;

export const BADGES = [
  /* ---- soru sayısı ---- */
  tier('ilk',         '🌱', 'İlk Adım',        'İlk soruyu çöz',      'soru', s => s.totalQ, 1),
  tier('yuz',         '💯', 'Yüzler Kulübü',   '100 soru çöz',        'soru', s => s.totalQ, 100),
  tier('besyuz',      '🎯', 'Nişancı',         '500 soru çöz',        'soru', s => s.totalQ, 500),
  tier('bin',         '🚀', 'Bin Soru',        '1000 soru çöz',       'soru', s => s.totalQ, 1000),
  tier('ikibucukbin', '🌠', 'Yol Alıyor',      '2500 soru çöz',       'soru', s => s.totalQ, 2500),
  tier('besbin',      '👑', 'Soru Kraliçesi',  '5000 soru çöz',       'soru', s => s.totalQ, 5000),
  tier('onbin',       '💎', 'On Bin',          '10.000 soru çöz',     'soru', s => s.totalQ, 10000),
  tier('yirmibesbin', '🏵️', 'Yirmi Beş Bin',   '25.000 soru çöz',     'soru', s => s.totalQ, 25000),
  tier('ellibin',     '🦄', 'Efsane',          '50.000 soru çöz',     'soru', s => s.totalQ, 50000),

  /* ---- süreklilik ---- */
  tier('seri3',    '🔥', 'Isınma Turu',    '3 gün üst üste çalış',    'seri', s => s.bestStreak, 3),
  tier('seri7',    '⚡', 'Tam Hafta',      '7 gün üst üste çalış',    'seri', s => s.bestStreak, 7),
  tier('seri14',   '🌙', 'İki Hafta',      '14 gün üst üste çalış',   'seri', s => s.bestStreak, 14),
  tier('seri30',   '🏔️', 'Ay Boyunca',     '30 gün üst üste çalış',   'seri', s => s.bestStreak, 30),
  tier('seri50',   '❄️', 'Elli Gün',       '50 gün üst üste çalış',   'seri', s => s.bestStreak, 50),
  tier('seri100',  '🌟', 'Yüz Gün',        '100 gün üst üste çalış',  'seri', s => s.bestStreak, 100),
  tier('seri180',  '🛡️', 'Yarım Yıl',      '180 gün üst üste çalış',  'seri', s => s.bestStreak, 180),
  tier('seri365',  '🗓️', 'Tam Yıl',        '365 gün üst üste çalış',  'seri', s => s.bestStreak, 365),
  tier('gun100',   '📅', 'Yüz Gün Emek',   '100 gün çalış',           'seri', s => s.activeDays, 100),
  tier('gun250',   '📆', 'İki Yüz Elli',   '250 gün çalış',           'seri', s => s.activeDays, 250),
  tier('hafta10',  '🍀', 'On Hafta',       '10 farklı hafta çalış',   'seri', s => s.activeWeeks, 10),
  tier('hafta30',  '🌿', 'Otuz Hafta',     '30 farklı hafta çalış',   'seri', s => s.activeWeeks, 30),
  tier('ay6',      '🌗', 'Altı Ay',        '6 farklı ay çalış',       'seri', s => s.activeMonths, 6),
  tier('ay12',     '🌕', 'On İki Ay',      '12 farklı ay çalış',      'seri', s => s.activeMonths, 12),

  /* ---- hedef ---- */
  tier('hedef5',      '🏅', 'Hedef Avcısı',   '5 kez günlük hedefi tuttur',   'hedef', s => s.goalDays, 5),
  tier('hedef20',     '🎖️', 'Kararlı',        '20 kez günlük hedefi tuttur',  'hedef', s => s.goalDays, 20),
  tier('hedef50',     '🥇', 'Hedef Ustası',   '50 kez günlük hedefi tuttur',  'hedef', s => s.goalDays, 50),
  tier('hedef100',    '🧭', 'Yolunu Bilen',   '100 kez günlük hedefi tuttur', 'hedef', s => s.goalDays, 100),
  tier('hedefseri7',  '🎗️', 'Hedefli Hafta',  '7 gün üst üste hedefi tuttur', 'hedef', s => s.goalStreak, 7),
  tier('hedefseri30', '🪄', 'Hedefli Ay',     '30 gün üst üste hedefi tuttur','hedef', s => s.goalStreak, 30),

  /* ---- tempo ---- */
  tier('maraton',   '🦾', 'Maratoncu',              'Bir günde 150 soru',           'tempo', s => s.bestDay, 150),
  tier('tempo200',  '🌪️', 'Fırtına',                'Bir günde 200 soru',           'tempo', s => s.bestDay, 200),
  tier('tempo300',  '🚴', 'Sınır Tanımaz',          'Bir günde 300 soru',           'tempo', s => s.bestDay, 300),
  tier('haftasonu', '🌞', 'Hafta Sonu Kahramanı',   'Hafta sonu bir günde 150 soru','tempo', s => s.bestWeekendDay, 150),
  tier('hafta500',  '🎡', 'Dolu Hafta',             'Bir haftada 500 soru',         'tempo', s => s.bestWeek, 500),
  tier('hafta1000', '🎢', 'Bin Soruluk Hafta',      'Bir haftada 1000 soru',        'tempo', s => s.bestWeek, 1000),
  tier('ay2000',    '🌋', 'Verimli Ay',             'Bir ayda 2000 soru',           'tempo', s => s.bestMonth, 2000),
  tier('ay4000',    '☄️', 'Muhteşem Ay',            'Bir ayda 4000 soru',           'tempo', s => s.bestMonth, 4000),
  tier('keskin',    '🔎', 'Keskin Nişancı',         'Bir günde %90 doğruluk',       'tempo', s => s.bestAccuracy, 90),
  tier('keskin95',  '🧿', 'Kusursuz',               'Bir günde %95 doğruluk',       'tempo', s => s.bestAccuracy, 95),
  flag('tumders',   '🌈', 'Her Şeyden Biraz',       'Bir günde 6 dersi de çalış',   'tempo', s => s.allSixDay),
  tier('tumders7',  '🧩', 'Denge Ustası',           '7 kez bir günde 6 dersi çalış','tempo', s => s.sixSubjectDays, 7),

  /* ---- ders ustalığı ---- */
  tier('turkce500',    '📚', 'Türkçe Dostu',        'Türkçede 500 soru',      'ders', subjQ('turkce'), 500),
  tier('turkce2000',   '✒️', 'Türkçe Ustası',       'Türkçede 2000 soru',     'ders', subjQ('turkce'), 2000),
  tier('mat500',       '📐', 'Matematikçi',         'Matematikte 500 soru',   'ders', subjQ('matematik'), 500),
  tier('mat2000',      '🧮', 'Matematik Ustası',    'Matematikte 2000 soru',  'ders', subjQ('matematik'), 2000),
  tier('fen500',       '🔬', 'Fen Meraklısı',       'Fende 500 soru',         'ders', subjQ('fen'), 500),
  tier('fen2000',      '⚗️', 'Fen Ustası',          'Fende 2000 soru',        'ders', subjQ('fen'), 2000),
  tier('inkilap500',   '🏛️', 'İnkılap Bilgini',     'İnkılapta 500 soru',     'ders', subjQ('inkilap'), 500),
  tier('inkilap2000',  '🗿', 'İnkılap Ustası',      'İnkılapta 2000 soru',    'ders', subjQ('inkilap'), 2000),
  tier('ingilizce500', '🌍', 'İngilizce Dostu',     'İngilizcede 500 soru',   'ders', subjQ('ingilizce'), 500),
  tier('ingilizce2000','🗽', 'İngilizce Ustası',    'İngilizcede 2000 soru',  'ders', subjQ('ingilizce'), 2000),
  tier('din500',       '🕌', 'Din Kültürü Dostu',   'Din Kültüründe 500 soru','ders', subjQ('din'), 500),
  tier('din2000',      '🕋', 'Din Kültürü Ustası',  'Din Kültüründe 2000 soru','ders', subjQ('din'), 2000),

  /* ---- denemeler ---- */
  tier('deneme1',  '📝', 'İlk Deneme',      'İlk denemeni gir',           'deneme', s => s.examCount, 1),
  tier('deneme10', '🏆', 'Deneme Canavarı', '10 deneme gir',              'deneme', s => s.examCount, 10),
  tier('deneme25', '🎟️', 'Deneme Ustası',   '25 deneme gir',              'deneme', s => s.examCount, 25),
  tier('deneme50', '🎊', 'Yarım Yüz',       '50 deneme gir',              'deneme', s => s.examCount, 50),
  tier('puan400',  '🎓', 'Dört Yüzlük',     'Bir denemede 400+ puan',     'deneme', s => s.bestExamScore, 400),
  tier('puan450',  '🧠', 'Zirve',           'Bir denemede 450+ puan',     'deneme', s => s.bestExamScore, 450),
  tier('net70',    '⚖️', 'Net Avcısı',      'Bir denemede 70 net yap',    'deneme', s => s.bestExamNet, 70),

  /* ---- kitaplar ---- */
  tier('kitap1',      '📕', 'İlk Kitap',      'İlk kitabını ekle',      'kitap', s => s.bookCount, 1),
  tier('kutuphane',   '📗', 'Kütüphaneci',    '5 kitap ekle',           'kitap', s => s.bookCount, 5),
  tier('kitap10',     '📘', 'Koleksiyoner',   '10 kitap ekle',          'kitap', s => s.bookCount, 10),
  tier('kitapbitti',  '🏁', 'Kapak Attım',    'Bir kitabı bitir',       'kitap', s => s.booksFinished, 1),
  tier('kitapbitti5', '🏫', 'Kapak Ustası',   '5 kitabı bitir',         'kitap', s => s.booksFinished, 5),
  tier('unite50',     '✔️', 'Üniteci',        '50 üniteyi tamamla',     'kitap', s => s.unitsDone, 50),
  tier('unite200',    '✅', 'Ünite Ustası',   '200 üniteyi tamamla',    'kitap', s => s.unitsDone, 200),

  /* ---- öğretmek ---- */
  tier('sorduran',     '🧑‍🏫', 'Sormaktan Korkmaz', '100 soru çözdür',   'ogret', s => s.totalTaught, 100),
  tier('sorduran500',  '👩‍🏫', 'Öğreten Eller',     '500 soru çözdür',   'ogret', s => s.totalTaught, 500),
  tier('sorduran1000', '🗣️', 'Akran Öğretmeni',   '1000 soru çözdür',  'ogret', s => s.totalTaught, 1000),
];

export const MOTIVATION = [
  'Bugün de bir adım daha! 🌸','Her soru seni zirveye yaklaştırıyor ⛰️','Küçük adımlar büyük sonuçlar getirir ✨',
  'Yanlışlar öğretmendir, korkma ❤️','Bugünün emeği yarının gülümsemesi 🌷','Sen yaparsın, biliyorum! 💪',
  'Devam et, çok iyi gidiyorsun! 🚀','Bir soru daha, bir adım daha 🎯','Disiplin yeteneği yener 🌟',
];

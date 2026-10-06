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
 * Hediye koşul türleri. Ölçütler hep "en iyi" değerden okunur (gamify.giftProgress),
 * bu yüzden açılan hediye kötü bir denemeyle tekrar kilitlenmez.
 */
export const GIFT_KINDS = [
  { key: 'net', emoji: '📝', label: 'Deneme neti',        cond: t => `Bir denemede ${t} net yap`,   left: n => `${n} net kaldı` },
  { key: 'score', emoji: '🎓', label: 'Tahmini LGS puanı',  cond: t => `Bir denemede ${t} puan al`,  left: n => `${n} puan kaldı` },
  { key: 'level', emoji: '⭐', label: 'Seviye',             cond: t => `Sv. ${t} ol`,                left: n => `${n} seviye kaldı` },
  { key: 'questions', emoji: '✏️', label: 'Toplam soru',        cond: t => `Toplam ${t} soru çöz (çözdürdüğün 2 sayılır)`,       left: n => `${n} soru kaldı` },
  { key: 'streak', emoji: '🔥', label: 'Gün serisi',         cond: t => `${t} gün üst üste çalış`,    left: n => `${n} gün daha` },
  { key: 'badges', emoji: '🏅', label: 'Rozet sayısı',       cond: t => `Toplam ${t} rozet kazan`,    left: n => `${n} rozet kaldı` },
  { key: 'diamond', emoji: '💎', label: 'Elmas rozet',       cond: t => t === 1 ? 'İlk elmas rozetini kazan' : `${t} elmas rozet kazan`, left: n => `${n} elmas rozet kaldı` },
];
export const GIFT_KIND_MAP = Object.fromEntries(GIFT_KINDS.map(k => [k.key, k]));

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

// Rozet grupları — rozetler ekranında bu sırayla gösterilir
export const BADGE_GROUPS = [
  { key:'soru',    label:'Soru sayısı',   emoji:'✏️' },
  { key:'seviye',  label:'Seviye',        emoji:'⭐' },
  { key:'seri',    label:'Süreklilik',    emoji:'🔥' },
  { key:'hedef',   label:'Hedef',         emoji:'🎯' },
  { key:'tempo',   label:'Tempo',         emoji:'⚡' },
  { key:'ders',    label:'Ders ustalığı', emoji:'🎓' },
  { key:'deneme',  label:'Denemeler',     emoji:'📝' },
  { key:'kitap',   label:'Kitaplar',      emoji:'📚' },
  { key:'ogret',   label:'Öğretmek',      emoji:'🧑‍🏫' },
  { key:'ingilizce', label:'İngilizce',   emoji:'🔤' },
];

/** Bir ölçütün değerini okur. `per:turkce` gibi izler ders bazlı soru sayısıdır. */
export const trackValue = (s, track) =>
  track.startsWith('wper:') ? (s.perSubjectW[track.slice(5)] || 0)
  : track.startsWith('per:') ? (s.perSubject[track.slice(4)] || 0) : (s[track] || 0);

/** Çözdürdüğü sorunun 2 sayıldığı ölçütler (seviyedeki XP ile aynı denge) */
export const WEIGHTED_TRACKS = new Set(['xp', 'bestDayW', 'bestWeekendDay', 'bestWeek', 'bestMonth']);
export const isWeighted = track => !!track && (WEIGHTED_TRACKS.has(track) || track.startsWith('wper:'));

/**
 * Sayaca dayalı rozet. `track` ölçütün adı (summarize alanı); aynı izdeki rozetler
 * kolaydan zora bir merdiven oluşturur ve zorluk rengi bu sıradan çıkar.
 * `show` verilirse kilitliyken ilerleme ondan gösterilir: seri rozetleri en iyi
 * seriyi değil, şu an süren seriyi gösterir (kazanmak için onu sürdürmesi gerek).
 */
const tier = (id, ico, name, desc, group, track, target, show) => ({
  id, ico, name, desc, group, track, target,
  test: s => trackValue(s, track) >= target,
  progress: s => [Math.min(Math.floor(show ? trackValue(s, show) : trackValue(s, track)), target), target],
  live: show || null,
});

/** Evet/hayır rozeti — ilerleme çubuğu yok */
const flag = (id, ico, name, desc, group, pick) => ({ id, ico, name, desc, group, track: null, test: s => !!pick(s) });

const SUBJ_NAMES = {
  turkce: 'Türkçede', matematik: 'Matematikte', fen: 'Fende',
  inkilap: 'İnkılapta', ingilizce: 'İngilizcede', din: 'Din Kültüründe',
};
const nf = n => n.toLocaleString('tr-TR');

export const BADGES = [
  /* ---- soru sayısı ---- */
  tier('ilk',         '🌱', 'İlk Adım',         'İlk soruyu çöz',        'soru', 'xp', 1),
  tier('elli',        '🌿', 'Isınıyor',         '50 soru çöz',           'soru', 'xp', 50),
  tier('yuz',         '💯', 'Yüzler Kulübü',    '100 soru çöz',          'soru', 'xp', 100),
  tier('ikiyuzelli',  '🍀', 'Çeyrek Bin',       '250 soru çöz',          'soru', 'xp', 250),
  tier('besyuz',      '🎯', 'Nişancı',          '500 soru çöz',          'soru', 'xp', 500),
  tier('yediyuzelli', '🎈', 'Yükselişte',       '750 soru çöz',          'soru', 'xp', 750),
  tier('bin',         '🚀', 'Bin Soru',         '1000 soru çöz',         'soru', 'xp', 1000),
  tier('binbesyuz',   '🛸', 'Yörüngede',        '1500 soru çöz',         'soru', 'xp', 1500),
  tier('ikibin',      '🌙', 'İki Bin',          '2000 soru çöz',         'soru', 'xp', 2000),
  tier('ikibucukbin', '🌠', 'Yol Alıyor',       '2500 soru çöz',         'soru', 'xp', 2500),
  tier('ucbin',       '🪐', 'Üç Bin',           '3000 soru çöz',         'soru', 'xp', 3000),
  tier('dortbin',     '☀️', 'Dört Bin',         '4000 soru çöz',         'soru', 'xp', 4000),
  tier('besbin',      '👑', 'Soru Kraliçesi',   '5000 soru çöz',         'soru', 'xp', 5000),
  tier('yedibinbesyuz','🎆', 'Havai Fişek',     '7500 soru çöz',         'soru', 'xp', 7500),
  tier('onbin',       '💎', 'On Bin',           '10.000 soru çöz',       'soru', 'xp', 10000),
  tier('onbesbin',    '🔮', 'On Beş Bin',       '15.000 soru çöz',       'soru', 'xp', 15000),
  tier('yirmibin',    '🏰', 'Yirmi Bin',        '20.000 soru çöz',       'soru', 'xp', 20000),
  tier('yirmibesbin', '🏵️', 'Yirmi Beş Bin',    '25.000 soru çöz',       'soru', 'xp', 25000),
  tier('otuzbin',     '🌌', 'Otuz Bin',         '30.000 soru çöz',       'soru', 'xp', 30000),
  tier('ellibin',     '🦄', 'Efsane',           '50.000 soru çöz',       'soru', 'xp', 50000),
  tier('yetmisbesbin','🐉', 'Ejderha',          '75.000 soru çöz',       'soru', 'xp', 75000),
  tier('yuzbin',      '🏆', 'Yüz Bin',          '100.000 soru çöz',      'soru', 'xp', 100000),

  /* ---- seviye ---- */
  tier('sv5',  '⭐', 'Net Ustası',       'Sv. 5 ol',  'seviye', 'level', 5),
  tier('sv10', '🌟', 'LGS Kahramanı',    'Sv. 10 ol', 'seviye', 'level', 10),
  tier('sv15', '✨', 'Parlayan Yıldız',  'Sv. 15 ol', 'seviye', 'level', 15),
  tier('sv20', '💫', 'Yıldız Tozu',      'Sv. 20 ol', 'seviye', 'level', 20),
  tier('sv25', '🌠', 'Kayan Yıldız',     'Sv. 25 ol', 'seviye', 'level', 25),
  tier('sv30', '🌞', 'Güneş',            'Sv. 30 ol', 'seviye', 'level', 30),
  tier('sv40', '🌌', 'Galaksi',          'Sv. 40 ol', 'seviye', 'level', 40),
  tier('sv50', '👑', 'Seviye Kraliçesi', 'Sv. 50 ol', 'seviye', 'level', 50),

  /* ---- süreklilik (seri rozetleri şu an süren seriyi gösterir) ---- */
  tier('seri3',    '🔥', 'Isınma Turu',    '3 gün üst üste çalış',    'seri', 'bestStreak', 3,   'streak'),
  tier('seri7',    '⚡', 'Tam Hafta',      '7 gün üst üste çalış',    'seri', 'bestStreak', 7,   'streak'),
  tier('seri14',   '🌙', 'İki Hafta',      '14 gün üst üste çalış',   'seri', 'bestStreak', 14,  'streak'),
  tier('seri30',   '🏔️', 'Ay Boyunca',     '30 gün üst üste çalış',   'seri', 'bestStreak', 30,  'streak'),
  tier('seri50',   '❄️', 'Elli Gün',       '50 gün üst üste çalış',   'seri', 'bestStreak', 50,  'streak'),
  tier('seri100',  '🌟', 'Yüz Gün',        '100 gün üst üste çalış',  'seri', 'bestStreak', 100, 'streak'),
  tier('seri180',  '🛡️', 'Yarım Yıl',      '180 gün üst üste çalış',  'seri', 'bestStreak', 180, 'streak'),
  tier('seri365',  '🗓️', 'Tam Yıl',        '365 gün üst üste çalış',  'seri', 'bestStreak', 365, 'streak'),
  tier('gun100',   '📅', 'Yüz Gün Emek',   '100 gün çalış',           'seri', 'activeDays', 100),
  tier('gun250',   '📆', 'İki Yüz Elli',   '250 gün çalış',           'seri', 'activeDays', 250),
  tier('hafta10',  '🍀', 'On Hafta',       '10 farklı hafta çalış',   'seri', 'activeWeeks', 10),
  tier('hafta30',  '🌿', 'Otuz Hafta',     '30 farklı hafta çalış',   'seri', 'activeWeeks', 30),
  tier('ay6',      '🌗', 'Altı Ay',        '6 farklı ay çalış',       'seri', 'activeMonths', 6),
  tier('ay12',     '🌕', 'On İki Ay',      '12 farklı ay çalış',      'seri', 'activeMonths', 12),

  /* ---- hedef ---- */
  tier('hedef5',      '🏅', 'Hedef Avcısı',   '5 kez günlük hedefi tuttur',     'hedef', 'goalDays', 5),
  tier('hedef20',     '🎖️', 'Kararlı',        '20 kez günlük hedefi tuttur',    'hedef', 'goalDays', 20),
  tier('hedef50',     '🥇', 'Hedef Ustası',   '50 kez günlük hedefi tuttur',    'hedef', 'goalDays', 50),
  tier('hedef100',    '🧭', 'Yolunu Bilen',   '100 kez günlük hedefi tuttur',   'hedef', 'goalDays', 100),
  tier('hedef200',    '🗺️', 'Pusula',         '200 kez günlük hedefi tuttur',   'hedef', 'goalDays', 200),
  tier('hedefseri7',  '🎗️', 'Hedefli Hafta',  '7 gün üst üste hedefi tuttur',   'hedef', 'goalStreak', 7,   'curGoalStreak'),
  tier('hedefseri14', '🎀', 'Hedefli İki Hafta','14 gün üst üste hedefi tuttur', 'hedef', 'goalStreak', 14,  'curGoalStreak'),
  tier('hedefseri30', '🪄', 'Hedefli Ay',     '30 gün üst üste hedefi tuttur',  'hedef', 'goalStreak', 30,  'curGoalStreak'),
  tier('hedefseri60', '🔱', 'Hedef Makinesi', '60 gün üst üste hedefi tuttur',  'hedef', 'goalStreak', 60,  'curGoalStreak'),
  tier('hedefseri100','🏹', 'Hiç Şaşmaz',     '100 gün üst üste hedefi tuttur', 'hedef', 'goalStreak', 100, 'curGoalStreak'),

  /* ---- tempo ---- */
  tier('tempo100',  '🏃', 'Hızlanıyor',             'Bir günde 100 soru',           'tempo', 'bestDayW', 100),
  tier('maraton',   '🦾', 'Maratoncu',              'Bir günde 150 soru',           'tempo', 'bestDayW', 150),
  tier('tempo200',  '🌪️', 'Fırtına',                'Bir günde 200 soru',           'tempo', 'bestDayW', 200),
  tier('tempo300',  '🚴', 'Sınır Tanımaz',          'Bir günde 300 soru',           'tempo', 'bestDayW', 300),
  tier('tempo400',  '🏎️', 'Formula',                'Bir günde 400 soru',           'tempo', 'bestDayW', 400),
  tier('tempo500',  '🚄', 'Hızlı Tren',             'Bir günde 500 soru',           'tempo', 'bestDayW', 500),
  tier('haftasonu', '🌞', 'Hafta Sonu Kahramanı',   'Hafta sonu bir günde 150 soru','tempo', 'bestWeekendDay', 150),
  tier('hafta500',  '🎡', 'Dolu Hafta',             'Bir haftada 500 soru',         'tempo', 'bestWeek', 500),
  tier('hafta1000', '🎢', 'Bin Soruluk Hafta',      'Bir haftada 1000 soru',        'tempo', 'bestWeek', 1000),
  tier('hafta1500', '🎠', 'Lunapark',               'Bir haftada 1500 soru',        'tempo', 'bestWeek', 1500),
  tier('hafta2000', '🚀', 'Roket Hafta',            'Bir haftada 2000 soru',        'tempo', 'bestWeek', 2000),
  tier('ay2000',    '🌋', 'Verimli Ay',             'Bir ayda 2000 soru',           'tempo', 'bestMonth', 2000),
  tier('ay4000',    '☄️', 'Muhteşem Ay',            'Bir ayda 4000 soru',           'tempo', 'bestMonth', 4000),
  tier('ay6000',    '🌊', 'Dev Dalga',              'Bir ayda 6000 soru',           'tempo', 'bestMonth', 6000),
  tier('keskin',    '🔎', 'Keskin Nişancı',         'Bir günde %90 doğruluk',       'tempo', 'bestAccuracy', 90),
  tier('keskin95',  '🧿', 'Kusursuz',               'Bir günde %95 doğruluk',       'tempo', 'bestAccuracy', 95),
  flag('tumders',   '🌈', 'Her Şeyden Biraz',       'Bir günde 6 dersi de çalış',   'tempo', s => s.allSixDay),
  tier('tumders7',  '🧩', 'Denge Ustası',           '7 kez bir günde 6 dersi çalış','tempo', 'sixSubjectDays', 7),

  /* ---- ders ustalığı ---- */
  ...[
    ['turkce',    ['📚','Türkçe Dostu'],      ['✒️','Türkçe Ustası'],      ['📜','Türkçe Bilgesi'],      ['🖋️','Türkçe Efsanesi']],
    ['matematik', ['📐','Matematikçi'],       ['🧮','Matematik Ustası'],   ['📊','Matematik Bilgesi'],   ['♾️','Matematik Efsanesi']],
    ['fen',       ['🔬','Fen Meraklısı'],     ['⚗️','Fen Ustası'],         ['🧬','Fen Bilgesi'],         ['🔭','Fen Efsanesi']],
    ['inkilap',   ['🏛️','İnkılap Bilgini'],   ['🗿','İnkılap Ustası'],     ['🎖️','Tarih Bilgesi'],       ['🇹🇷','Tarih Efsanesi']],
    ['ingilizce', ['🌍','İngilizce Dostu'],   ['🗽','İngilizce Ustası'],   ['🎡','İngilizce Bilgesi'],   ['💂','İngilizce Efsanesi']],
    ['din',       ['🕌','Din Kültürü Dostu'], ['🕋','Din Kültürü Ustası'], ['📿','Din Kültürü Bilgesi'], ['🌙','Din Kültürü Efsanesi']],
  ].flatMap(([key, ...ranks]) => {
    // ilk ikisinin kimlikleri eski sürümden: kazanılmış rozetler korunur
    const ids = { turkce:'turkce', matematik:'mat', fen:'fen', inkilap:'inkilap', ingilizce:'ingilizce', din:'din' };
    return [500, 1000, 2000, 5000].map((n, i) => tier(
      `${ids[key]}${n}`, ranks[[0, 2, 1, 3][i]][0], ranks[[0, 2, 1, 3][i]][1],
      `${SUBJ_NAMES[key]} ${nf(n)} soru`, 'ders', `wper:${key}`, n));
  }),

  /* ---- denemeler ---- */
  tier('deneme1',  '📝', 'İlk Deneme',      'İlk denemeni gir',         'deneme', 'examCount', 1),
  tier('deneme5',  '🗒️', 'Isındım',         '5 deneme gir',             'deneme', 'examCount', 5),
  tier('deneme10', '🏆', 'Deneme Canavarı', '10 deneme gir',            'deneme', 'examCount', 10),
  tier('deneme25', '🎟️', 'Deneme Ustası',   '25 deneme gir',            'deneme', 'examCount', 25),
  tier('deneme50', '🎊', 'Yarım Yüz',       '50 deneme gir',            'deneme', 'examCount', 50),
  tier('deneme100','🏟️', 'Deneme Efsanesi', '100 deneme gir',           'deneme', 'examCount', 100),
  tier('net50',    '📏', 'Elli Net',        'Bir denemede 50 net yap',  'deneme', 'bestExamNet', 50),
  tier('net60',    '📐', 'Altmış Net',      'Bir denemede 60 net yap',  'deneme', 'bestExamNet', 60),
  tier('net70',    '⚖️', 'Net Avcısı',      'Bir denemede 70 net yap',  'deneme', 'bestExamNet', 70),
  tier('net80',    '🎯', 'Seksen Net',      'Bir denemede 80 net yap',  'deneme', 'bestExamNet', 80),
  tier('net90',    '💯', 'Doksan Net',      'Bir denemede 90 net yap',  'deneme', 'bestExamNet', 90),
  tier('puan400',  '🎓', 'Dört Yüzlük',     'Bir denemede 400+ puan',   'deneme', 'bestExamScore', 400),
  tier('puan450',  '🧠', 'Zirve',           'Bir denemede 450+ puan',   'deneme', 'bestExamScore', 450),
  tier('puan480',  '🥇', 'Şampiyon',        'Bir denemede 480+ puan',   'deneme', 'bestExamScore', 480),
  tier('puan500',  '👑', 'Tam Puan',        'Bir denemede 500 puan',    'deneme', 'bestExamScore', 500),

  /* ---- kitaplar ---- */
  tier('kitap1',      '📕', 'İlk Kitap',      'İlk kitabını ekle',      'kitap', 'bookCount', 1),
  tier('kutuphane',   '📗', 'Kütüphaneci',    '5 kitap ekle',           'kitap', 'bookCount', 5),
  tier('kitap10',     '📘', 'Koleksiyoner',   '10 kitap ekle',          'kitap', 'bookCount', 10),
  tier('kitapbitti',  '🏁', 'Kapak Attım',    'Bir kitabı bitir',       'kitap', 'booksFinished', 1),
  tier('kitapbitti5', '🏫', 'Kapak Ustası',   '5 kitabı bitir',         'kitap', 'booksFinished', 5),
  tier('unite50',     '✔️', 'Üniteci',        '50 üniteyi tamamla',     'kitap', 'unitsDone', 50),
  tier('unite200',    '✅', 'Ünite Ustası',   '200 üniteyi tamamla',    'kitap', 'unitsDone', 200),

  /* ---- öğretmek ---- */
  tier('sorduran50',   '🤝', 'Yardımsever',       '50 soru çözdür',    'ogret', 'totalTaught', 50),
  tier('sorduran',     '🧑‍🏫', 'Sormaktan Korkmaz', '100 soru çözdür',   'ogret', 'totalTaught', 100),
  tier('sorduran500',  '👩‍🏫', 'Öğreten Eller',     '500 soru çözdür',   'ogret', 'totalTaught', 500),
  tier('sorduran1000', '🗣️', 'Akran Öğretmeni',   '1000 soru çözdür',  'ogret', 'totalTaught', 1000),
  tier('sorduran2500', '🏫', 'Sınıf Öğretmeni',   '2500 soru çözdür',  'ogret', 'totalTaught', 2500),
  tier('sorduran5000', '🦉', 'Bilge Baykuş',      '5000 soru çözdür',  'ogret', 'totalTaught', 5000),

  /* ---- İngilizce kelimeler ---- */
  tier('kelime50',   '🔤', 'Kelime Toplayıcı', '50 kelime ekle',     'ingilizce', 'wordsAdded', 50),
  tier('kelime200',  '📒', 'Kelime Defteri',   '200 kelime ekle',    'ingilizce', 'wordsAdded', 200),
  tier('kelime500',  '📖', 'Sözlük',           '500 kelime ekle',    'ingilizce', 'wordsAdded', 500),
  tier('ogrendi25',  '💬', 'Konuşmaya Başladı','25 kelime öğren',    'ingilizce', 'wordsLearned', 25),
  tier('ogrendi100', '🗨️', 'Akıcı',            '100 kelime öğren',   'ingilizce', 'wordsLearned', 100),
  tier('ogrendi300', '🇬🇧', 'Native Speaker',   '300 kelime öğren',   'ingilizce', 'wordsLearned', 300),
];

/**
 * Zorluk rengi: aynı izdeki (ör. totalQ) rozetler arasındaki sırası.
 * bronz → gümüş → altın → elmas; tek rozetli izler bronz.
 */
export const RARITY = { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', diamond: 'Elmas' };
const rarityOf = (() => {
  const tracks = new Map();
  for (const b of BADGES) {
    if (!b.track) continue;
    if (!tracks.has(b.track)) tracks.set(b.track, []);
    tracks.get(b.track).push(b.target);
  }
  return b => {
    if (!b.track) return 'silver';
    const list = [...tracks.get(b.track)].sort((x, y) => x - y);
    const i = list.indexOf(b.target);
    // kısa diziler elmasa çıkmaz: elmas, uzun bir merdivenin en tepesi olmalı
    if (list.length === 1) return 'silver';
    if (list.length === 2) return ['silver', 'gold'][i];
    if (list.length === 3) return ['bronze', 'silver', 'gold'][i];
    const r = i / (list.length - 1);
    return r >= 0.99 ? 'diamond' : r >= 0.6 ? 'gold' : r >= 0.3 ? 'silver' : 'bronze';
  };
})();
BADGES.forEach(b => { b.rarity = rarityOf(b); });

/**
 * KURAL: her rozetin kendine özgü bir animasyonu olur.
 * Hareket türü, süre ve gecikme rozet kimliğinden türetilir; yeni eklenen her rozet
 * kendiliğinden kendi animasyonunu alır, elle atama gerekmez. (12 hareket × süre × gecikme:
 * 130 rozetin hiçbiri bir diğeriyle aynı oynamaz.) Animasyon yalnız kazanılmış rozette oynar.
 */
export const BADGE_ANIMS = ['float', 'spin', 'bounce', 'swing', 'pulse', 'flip', 'heart', 'jelly', 'tada', 'wobble', 'orbit', 'shake'];
const hashOf = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const usedAnims = new Set();
BADGES.forEach((b, i) => {
  const h = hashOf(b.id);
  const name = BADGE_ANIMS[(h + i) % BADGE_ANIMS.length];
  const dur = (1.6 + (h % 23) / 10).toFixed(1);       // 1.6s – 3.8s
  let delay = (h >> 5) % 17;                            // 0 – 1.6s (onda bir)
  while (usedAnims.has(`${name}|${dur}|${delay}`)) delay++;   // çakışırsa gecikmeyi kaydır: hepsi farklı
  usedAnims.add(`${name}|${dur}|${delay}`);
  b.anim = { name, dur: dur + 's', delay: (delay / 10).toFixed(1) + 's' };
});

export const MOTIVATION = [
  'Bugün de bir adım daha! 🌸','Her soru seni zirveye yaklaştırıyor ⛰️','Küçük adımlar büyük sonuçlar getirir ✨',
  'Yanlışlar öğretmendir, korkma ❤️','Bugünün emeği yarının gülümsemesi 🌷','Sen yaparsın, biliyorum! 💪',
  'Devam et, çok iyi gidiyorsun! 🚀','Bir soru daha, bir adım daha 🎯','Disiplin yeteneği yener 🌟',
];

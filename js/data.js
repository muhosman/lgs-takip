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

// Girilen metrikler (cozulen = d+y+b, otomatik hesaplanır)
export const METRICS = [
  { key:'d',  label:'Doğru',       emoji:'✅', short:'Doğru' },
  { key:'y',  label:'Yanlış',      emoji:'❌', short:'Yanlış' },
  { key:'b',  label:'Boş',         emoji:'⚪', short:'Boş' },
  { key:'s',  label:'Sorulacak',   emoji:'❓', short:'Sorulacak' },
  { key:'ct', label:'Çözdürdüğüm', emoji:'🧑‍🏫', short:'Çözdürdüğüm' },
];

export const LEVEL_TITLES = [
  'Yeni Başlayan','Kalem Dostu','Defter Kurdu','Soru Avcısı','Net Ustası',
  'Test Kâşifi','Kalem Ustası','Deneme Şampiyonu','Bilgi Kâşifi','LGS Kahramanı',
  'Efsane Öğrenci','Yıldız Avcısı','Zirvedeki','Efsanenin Ötesi',
];

// XP eşiği: n. seviyeye ulaşmak için 20*n*(n-1) XP (1 soru = 1 XP)
export const xpForLevel = n => 20 * n * (n - 1);

export const BADGES = [
  { id:'ilk',        ico:'🌱', name:'İlk Adım',        desc:'İlk soruyu çöz',        test:s => s.totalQ >= 1 },
  { id:'yuz',        ico:'💯', name:'Yüzler Kulübü',   desc:'100 soru çöz',          test:s => s.totalQ >= 100 },
  { id:'besyuz',     ico:'🎯', name:'Nişancı',         desc:'500 soru çöz',          test:s => s.totalQ >= 500 },
  { id:'bin',        ico:'🚀', name:'Bin Soru',        desc:'1000 soru çöz',         test:s => s.totalQ >= 1000 },
  { id:'besbin',     ico:'👑', name:'Soru Kraliçesi',  desc:'5000 soru çöz',         test:s => s.totalQ >= 5000 },
  { id:'seri3',      ico:'🔥', name:'Isınma Turu',     desc:'3 gün üst üste',        test:s => s.bestStreak >= 3 },
  { id:'seri7',      ico:'⚡', name:'Tam Hafta',       desc:'7 gün üst üste',        test:s => s.bestStreak >= 7 },
  { id:'seri30',     ico:'🏔️', name:'Ay Boyunca',      desc:'30 gün üst üste',       test:s => s.bestStreak >= 30 },
  { id:'keskin',     ico:'🎖️', name:'Keskin Nişancı',  desc:'Bir günde %90 doğruluk', test:s => s.bestAccuracy >= 90 },
  { id:'hedef5',     ico:'🏅', name:'Hedef Avcısı',    desc:'5 kez günlük hedefi tuttur', test:s => s.goalDays >= 5 },
  { id:'hedef20',    ico:'🌟', name:'Kararlı',         desc:'20 kez günlük hedefi tuttur', test:s => s.goalDays >= 20 },
  { id:'deneme1',    ico:'📝', name:'İlk Deneme',      desc:'İlk denemeni gir',      test:s => s.examCount >= 1 },
  { id:'deneme10',   ico:'🏆', name:'Deneme Canavarı', desc:'10 deneme gir',         test:s => s.examCount >= 10 },
  { id:'mat500',     ico:'📐', name:'Matematikçi',     desc:'Matematikte 500 soru',  test:s => (s.perSubject.matematik||0) >= 500 },
  { id:'tumders',    ico:'🌈', name:'Her Şeyden Biraz',desc:'Bir günde 6 dersi de çalış', test:s => s.allSixDay },
  { id:'maraton',    ico:'🦾', name:'Maratoncu',       desc:'Bir günde 150 soru',    test:s => s.bestDay >= 150 },
];

export const MOTIVATION = [
  'Bugün de bir adım daha! 🌸','Her soru seni zirveye yaklaştırıyor ⛰️','Küçük adımlar büyük sonuçlar getirir ✨',
  'Yanlışlar öğretmendir, korkma ❤️','Bugünün emeği yarının gülümsemesi 🌷','Sen yaparsın, biliyorum! 💪',
  'Devam et, çok iyi gidiyorsun! 🚀','Bir soru daha, bir adım daha 🎯','Disiplin yeteneği yener 🌟',
];

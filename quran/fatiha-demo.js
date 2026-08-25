/**
 * Taiyabah Masjid — Qur'an demo data
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * Deliberately kept OUT of index.html and fetched only when someone opens
 * the Qur'an page, so the main app never pays the cost of loading this —
 * the whole point of a separate folder.
 *
 * Arabic text: Sūrah al-Fātiḥah, Uthmani script, verified against
 * Al Quran Cloud (alquran.cloud) — api.alquran.cloud, an open Quran API
 * with no usage restriction on the Arabic text.
 *
 * English: an original short rendering, not quoted from any single named
 * translation.
 *
 * Tajweed colour legend: reproduced from Al Quran Cloud's own published
 * rule table (alquran.cloud/tajweed-guide) — this is the REAL colour
 * scheme, not invented. What is NOT included yet: letter-by-letter colour
 * annotation of the verses themselves. That needs a verified rules dataset
 * (e.g. github.com/cpfair/quran-tajweed, CC-BY-4.0) integrated properly —
 * not hand-marked, which risks misplacing a rule on live scripture.
 */
window.FATIHA_DEMO = {
  surah: { number: 1, name: "الفاتحة", nameEn: "Al-Fātiḥah", meaning: "The Opening" },

  ayahs: [
    { n: 1, ar: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      en: "In the name of Allah, the Most Gracious, the Most Merciful." },
    { n: 2, ar: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
      en: "All praise belongs to Allah, Lord of all the worlds." },
    { n: 3, ar: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      en: "The Most Gracious, the Most Merciful." },
    { n: 4, ar: "مَـٰلِكِ يَوْمِ ٱلدِّينِ",
      en: "Master of the Day of Judgement." },
    { n: 5, ar: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      en: "You alone we worship, and You alone we ask for help." },
    { n: 6, ar: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
      en: "Guide us upon the straight path." },
    { n: 7, ar: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
      en: "The path of those You have blessed \u2014 not of those who earn Your anger, nor of those who go astray." },
  ],

  // The genuine colour rules, straight from the source.
  tajweedLegend: [
    { hex:"#AAAAAA", ar:"همزة الوصل",   name:"Hamzat ul Waṣl",        note:"Silent hamza at the start of a word" },
    { hex:"#AAAAAA", ar:"حرف ساكن",     name:"Silent letter",          note:"A letter or vowel not pronounced" },
    { hex:"#AAAAAA", ar:"لام شمسية",    name:"Lām Shamsiyyah",         note:"Solar lām, assimilated into the next letter" },
    { hex:"#537FFF", ar:"مد عادي",      name:"Madd, normal",           note:"Standard two-vowel prolongation" },
    { hex:"#4050FF", ar:"مد جائز",      name:"Madd, permissible",      note:"Variable prolongation \u2014 two, four or six vowels" },
    { hex:"#000EBC", ar:"مد واجب",      name:"Madd, necessary",        note:"Required six-vowel prolongation" },
    { hex:"#2144C1", ar:"مد لازم",      name:"Madd, obligatory",       note:"Mandatory four to five vowel prolongation" },
    { hex:"#DD0008", ar:"قلقلة",        name:"Qalqalah",               note:"An emphatic echo on a letter carrying sukūn" },
    { hex:"#D500B7", ar:"إخفاء شفوي",   name:"Ikhfā Shafawī",          note:"Hidden articulation with mīm" },
    { hex:"#9400A8", ar:"إخفاء",        name:"Ikhfā",                  note:"Hidden articulation before certain letters" },
    { hex:"#58B800", ar:"إدغام شفوي",   name:"Idghām Shafawī",         note:"Assimilation with mīm" },
    { hex:"#26BFFD", ar:"إقلاب",        name:"Iqlāb",                  note:"Nūn/tanwīn converted to mīm before bā\u2019" },
    { hex:"#169777", ar:"إدغام بغنة",   name:"Idghām with Ghunnah",    note:"Assimilation with nasal resonance" },
    { hex:"#169200", ar:"إدغام بلا غنة", name:"Idghām without Ghunnah", note:"Assimilation without nasal resonance" },
    { hex:"#A1A1A1", ar:"إدغام متجانسين", name:"Idghām Mutajānisayn",  note:"Assimilation of letters sharing an articulation point" },
    { hex:"#FF7E1E", ar:"غنة",          name:"Ghunnah",                note:"Nasal resonance held for two vowel counts" },
  ],
};

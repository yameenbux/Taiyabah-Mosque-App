#!/usr/bin/env node
/* Build quran/athkar.js.
 *
 * The Qur'anic parts are not written here — they are lifted from the verified
 * sūrah files, so Āyat al-Kursī and the mu'awwidhāt in the athkar are the same
 * machine-checked text as in the Qur'an reader, in the same IndoPak script.
 *
 * The hadith athkar below are written out, with the collection named on each.
 * They are the widely known wordings, but wording varies between narrations
 * and printings: the imam should confirm this set before it is treated as
 * settled. The app says as much on the page.
 *
 *   node scripts/build-athkar.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const surah = n => JSON.parse(readFileSync(`quran/surahs/${n}.json`, "utf8"));
const verses = (n, from, to) => surah(n).verses.filter(v => v.n >= from && v.n <= (to ?? from));
const joinAr = vs => vs.map(v => v.ar).join(" ");

const AYAT_AL_KURSI = joinAr(verses(2, 255));
const IKHLAS = joinAr(verses(112, 1, 4));
const FALAQ  = joinAr(verses(113, 1, 5));
const NAS    = joinAr(verses(114, 1, 6));
const BAQARAH_END = joinAr(verses(2, 285, 286));

for (const [k, v] of Object.entries({ AYAT_AL_KURSI, IKHLAS, FALAQ, NAS, BAQARAH_END }))
  if (!v || v.length < 20) throw new Error(`${k} came out empty — is the Qur'an data built?`);

const MORNING_EVENING = [
  { ar: AYAT_AL_KURSI, en: "Allah — there is no god but He, the Ever-Living, the Sustainer of all. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth…",
    times: "Once, morning and evening", source: "Āyat al-Kursī · al-Baqarah 2:255",
    note: "Whoever recites it in the morning is protected until evening, and whoever recites it in the evening is protected until morning." },

  { ar: IKHLAS, en: "Say: He is Allah, the One. Allah, the Self-Sufficient. He begets not, nor is He begotten. And there is none comparable to Him.",
    times: "Three times", source: "Sūrah al-Ikhlāṣ · 112" },

  { ar: FALAQ, en: "Say: I seek refuge in the Lord of daybreak, from the evil of what He created, from the evil of darkness as it settles, from the evil of those who blow on knots, and from the evil of an envier when he envies.",
    times: "Three times", source: "Sūrah al-Falaq · 113" },

  { ar: NAS, en: "Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer who whispers in the breasts of mankind, from among the jinn and mankind.",
    times: "Three times", source: "Sūrah an-Nās · 114" },

  { ar: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    en: "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I hold to Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin — so forgive me, for none forgives sins but You.",
    times: "Once, morning and evening", source: "Ṣaḥīḥ al-Bukhārī",
    note: "Sayyid al-Istighfār — the finest way of seeking forgiveness." },

  { ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    en: "We have entered the morning and the dominion belongs to Allah. Praise be to Allah. There is no god but Allah alone, with no partner; His is the dominion and His is the praise, and He is able to do all things.",
    times: "Once", source: "Ṣaḥīḥ Muslim",
    note: "In the evening say “amsaynā wa amsal-mulku lillāh”." },

  { ar: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
    en: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
    times: "Once", source: "Jāmiʿ al-Tirmidhī · Sunan Abī Dāwūd",
    note: "In the evening the last words are “wa ilaykal-maṣīr” — and to You is the return." },

  { ar: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
    en: "I am content with Allah as my Lord, with Islam as my religion, and with Muḥammad (peace be upon him) as my Prophet.",
    times: "Three times", source: "Sunan Abī Dāwūd · Jāmiʿ al-Tirmidhī" },

  { ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    en: "In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.",
    times: "Three times", source: "Sunan Abī Dāwūd · Jāmiʿ al-Tirmidhī" },

  { ar: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    en: "Allah is sufficient for me; there is no god but He. Upon Him I rely, and He is the Lord of the mighty Throne.",
    times: "Seven times", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
    en: "O Allah, grant my body well-being. O Allah, grant my hearing well-being. O Allah, grant my sight well-being. There is no god but You.",
    times: "Three times", source: "Sunan Abī Dāwūd" },

  { ar: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    en: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    times: "Three times, in the evening", source: "Ṣaḥīḥ Muslim" },

  { ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    en: "Glory be to Allah, and praise be to Him.",
    times: "One hundred times", source: "Ṣaḥīḥ al-Bukhārī · Ṣaḥīḥ Muslim",
    note: "Whoever says it a hundred times in a day has his sins forgiven, though they be like the foam of the sea." },

  { ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    en: "There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.",
    times: "Ten times, or a hundred", source: "Ṣaḥīḥ al-Bukhārī · Ṣaḥīḥ Muslim" },

  { ar: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    en: "O Allah, send prayers and peace upon our Prophet Muḥammad.",
    times: "Ten times, morning and evening", source: "al-Muʿjam al-Awsaṭ · aṭ-Ṭabarānī" },

  { ar: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    en: "O Ever-Living, O Sustainer, by Your mercy I seek help. Put all my affairs in order, and do not leave me to myself for the blink of an eye.",
    times: "Once", source: "Sunan an-Nasā'ī (ʿAmal al-Yawm wa'l-Layla)" },
];

const AFTER_SALAH = [
  { ar: "أَسْتَغْفِرُ اللَّهَ (ثَلَاثًا) اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    en: "I seek Allah's forgiveness (three times). O Allah, You are Peace and from You comes peace. Blessed are You, Possessor of majesty and honour.",
    times: "Immediately after the salām", source: "Ṣaḥīḥ Muslim" },

  { ar: "سُبْحَانَ اللَّهِ ﴿٣٣﴾ الْحَمْدُ لِلَّهِ ﴿٣٣﴾ اللَّهُ أَكْبَرُ ﴿٣٣﴾ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    en: "Glory be to Allah (33), praise be to Allah (33), Allah is the Greatest (33), then: There is no god but Allah alone, with no partner; His is the dominion and His is the praise, and He is able to do all things.",
    times: "After every farḍ ṣalāh", source: "Ṣaḥīḥ Muslim",
    note: "This completes a hundred. Whoever says it has his sins forgiven, though they be like the foam of the sea." },

  { ar: AYAT_AL_KURSI,
    en: "Āyat al-Kursī — recited after every obligatory prayer.",
    times: "After every farḍ ṣalāh", source: "Sunan an-Nasā'ī · al-Baqarah 2:255",
    note: "Nothing stands between whoever recites it after each prayer and entering Paradise, except death." },

  { ar: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    en: "O Allah, help me to remember You, to thank You, and to worship You well.",
    times: "After every ṣalāh", source: "Sunan Abī Dāwūd · Sunan an-Nasā'ī" },

  { ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبُخْلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ، وَأَعُوذُ بِكَ مِنْ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ، وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا وَعَذَابِ الْقَبْرِ",
    en: "O Allah, I seek refuge in You from miserliness, from cowardice, from being returned to the most feeble age, from the trials of this world and from the punishment of the grave.",
    times: "After ṣalāh", source: "Ṣaḥīḥ al-Bukhārī" },
];

const SLEEP = [
  { ar: AYAT_AL_KURSI, en: "Āyat al-Kursī — recited on going to bed.",
    times: "Once", source: "Ṣaḥīḥ al-Bukhārī · al-Baqarah 2:255",
    note: "Whoever recites it on going to bed has a guardian from Allah, and no devil comes near him until morning." },

  { ar: BAQARAH_END, en: "The closing two verses of Sūrah al-Baqarah.",
    times: "Once", source: "Ṣaḥīḥ al-Bukhārī · al-Baqarah 2:285–286",
    note: "Whoever recites these two verses at night, they will suffice him." },

  { ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    en: "In Your name, O Allah, I die and I live.",
    times: "Once, on lying down", source: "Ṣaḥīḥ al-Bukhārī" },

  { ar: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    en: "O Allah, protect me from Your punishment on the Day You raise Your servants.",
    times: "Three times", source: "Sunan Abī Dāwūd · Jāmiʿ al-Tirmidhī" },

  { ar: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا، فَكَمْ مِمَّنْ لَا كَافِيَ لَهُ وَلَا مُؤْوِيَ",
    en: "Praise be to Allah who has fed us and given us drink, sufficed us and sheltered us — how many there are with none to suffice or shelter them.",
    times: "Once", source: "Ṣaḥīḥ Muslim" },
];

const data = {
  reviewNote: "Wording varies between narrations and printings. Confirm this set with the imam before treating it as settled.",
  quranNote: "Qur'anic passages here are the same verified IndoPak text used in the Qur'an reader.",
  sections: [
    { id: "morning-evening", title: "Morning & Evening",
      intro: "Recited once after Fajr and once after ʿAṣr — the two windows the sunnah sets aside for them.",
      items: MORNING_EVENING },
    { id: "after-salah", title: "After Every Ṣalāh",
      intro: "Said following each obligatory prayer, before rising from the place of prayer.",
      items: AFTER_SALAH },
    { id: "sleep", title: "Before Sleep",
      intro: "Said on going to bed, after settling for the night.",
      items: SLEEP },
  ],
};

const total = data.sections.reduce((n, s) => n + s.items.length, 0);
writeFileSync("quran/athkar.js",
  "/* Generated by scripts/build-athkar.mjs — edit that, not this.\n" +
  "   Qur'anic passages are lifted from the verified sūrah files. */\n" +
  "window.ATHKAR = " + JSON.stringify(data, null, 1) + ";\n");
console.log(`wrote quran/athkar.js — ${data.sections.length} sections, ${total} athkar`);

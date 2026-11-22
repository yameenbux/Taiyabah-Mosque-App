#!/usr/bin/env node
/* Build quran/athkar.js.
 *
 * The Qur'anic parts are not written here — they are lifted from the verified
 * sūrah files, so Āyat al-Kursī and the mu'awwidhāt in the athkar are the same
 * machine-checked text as in the Qur'an reader, in the same IndoPak script.
 *
 * The hadith athkar below are written out, with the collection named on each.
 * They are the widely known wordings, but wording varies between narrations
 * and printings, and settling which wording THIS masjid publishes is a
 * judgement for its ʿulamā rather than for whoever typed the file.
 *
 * The app used to say so on the page, which put a note meant for the masjid
 * in front of the congregation. That line is gone, and a real process stands
 * in its place: scripts/build-athkar-review.mjs exports every entry as a
 * sheet two ʿulamā sign, and scripts/check-athkar-approved.mjs fails the
 * build if an approved wording is later altered without a fresh signature.
 * See docs/athkar-approval-record.md.
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

/* Rebuilt from the masjid's own "Morning & Evening Adhkār" booklet, in the three
   parts the booklet itself keeps: read both morning and evening, read in the
   morning only, and read in the evening only. The Qur'anic texts are lifted from
   the verified sūrah files; the hadith wordings are written out to match the
   booklet, in one consistent tashkīl, and are a judgement for the ʿulamā to sign
   on the review sheet (none has been signed yet — see docs/athkar-approval-record.md). */
const BOTH = [
  { ar: AYAT_AL_KURSI, en: "Allah — there is no god but He, the Ever-Living, the Sustainer of all. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth…",
    times: "Once", source: "Āyat al-Kursī · al-Baqarah 2:255",
    note: "Whoever recites it in the morning is protected until evening, and whoever recites it in the evening is protected until morning." },

  { ar: IKHLAS, en: "Say: He is Allah, the One. Allah, the Self-Sufficient. He begets not, nor is He begotten. And there is none comparable to Him.",
    times: "Three times", source: "Sūrah al-Ikhlāṣ · 112" },

  { ar: FALAQ, en: "Say: I seek refuge in the Lord of daybreak, from the evil of what He created, from the evil of darkness as it settles, from the evil of those who blow on knots, and from the evil of an envier when he envies.",
    times: "Three times", source: "Sūrah al-Falaq · 113" },

  { ar: NAS, en: "Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer who whispers in the breasts of mankind, from among the jinn and mankind.",
    times: "Three times", source: "Sūrah an-Nās · 114" },

  { ar: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    en: "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I hold to Your covenant and promise as much as I am able. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin — so forgive me, for none forgives sins but You.",
    times: "Once", source: "Ṣaḥīḥ al-Bukhārī",
    note: "Sayyid al-Istighfār — the finest way of seeking forgiveness." },

  { ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ",
    en: "O Allah, I seek refuge in You from anxiety and grief, from incapacity and laziness, from cowardice and miserliness, and from being overcome by debt and overpowered by men.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي",
    en: "O Allah, I ask You for well-being in this world and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly life, my family and my wealth. O Allah, conceal my faults and calm my fears. O Allah, guard me from before me and behind me, from my right and my left, and from above me; and I seek refuge in Your greatness from being struck down from beneath me.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ",
    en: "O Allah, Knower of the unseen and the seen, Originator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that there is no god but You. I seek refuge in You from the evil of my own self, and from the evil of Satan and his call to associate others with You, and from bringing evil upon myself or dragging it to any Muslim.",
    times: "Once", source: "Jāmiʿ al-Tirmidhī" },

  { ar: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    en: "O Ever-Living, O Sustainer, by Your mercy I seek help. Put all my affairs in order, and do not leave me to myself for the blink of an eye.",
    times: "Once", source: "Sunan an-Nasā'ī (ʿAmal al-Yawm wa'l-Layla)" },

  { ar: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ",
    en: "O Allah, grant my body well-being. O Allah, grant my hearing well-being. O Allah, grant my sight well-being. There is no god but You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. There is no god but You.",
    times: "Three times", source: "Musnad Aḥmad" },

  { ar: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    en: "Allah is sufficient for me; there is no god but He. Upon Him I rely, and He is the Lord of the mighty Throne.",
    times: "Seven times", source: "Sunan Abī Dāwūd" },

  { ar: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ نَبِيًّا",
    en: "I am content with Allah as my Lord, with Islam as my religion, and with Muḥammad (peace be upon him) as my Prophet.",
    times: "Three times", source: "Jāmiʿ al-Tirmidhī" },

  { ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    en: "In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.",
    times: "Three times", source: "Jāmiʿ al-Tirmidhī" },

  { ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    en: "Glory be to Allah, and praise be to Him.",
    times: "One hundred times", source: "Ṣaḥīḥ Muslim",
    note: "Whoever says it a hundred times in a day has his sins forgiven, though they be like the foam of the sea." },

  { ar: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ",
    en: "Glory be to Allah, and praise be to Allah, and Allah is the Greatest.",
    times: "One hundred times", source: "Sunan an-Nasā'ī" },

  { ar: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    en: "There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.",
    times: "One hundred times", source: "Ṣaḥīḥ al-Bukhārī · Sunan an-Nasā'ī" },

  { ar: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
    en: "O Allah, send prayers upon Muḥammad and upon the family of Muḥammad.",
    times: "Ten times", source: "al-Muʿjam al-Awsaṭ · aṭ-Ṭabarānī" },
];

const MORNING = [
  { ar: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    en: "O Allah, whatever blessing has come to me this morning, or to any of Your creation, is from You alone, with no partner — so Yours is the praise and Yours is the thanks.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    en: "We have entered the morning upon the natural way of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muḥammad, and upon the faith of our father Ibrāhīm, who was upright, a Muslim, and not of those who associate others with Allah.",
    times: "Once", source: "Sunan an-Nasā'ī" },

  { ar: "أَصْبَحْتُ أُثْنِي عَلَيْكَ حَمْدًا، وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ",
    en: "This morning I praise You, and I bear witness that there is no god but Allah.",
    times: "Three times", source: "Sunan an-Nasā'ī" },

  { ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    en: "We have entered the morning and the dominion belongs to Allah. Praise be to Allah. There is no god but Allah alone, with no partner; His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this day and the good that follows it, and I seek refuge in You from the evil of this day and the evil that follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
    times: "Once", source: "Ṣaḥīḥ Muslim" },

  { ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ، فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ",
    en: "We have entered the morning and the dominion belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this day — its victory, its help, its light, its blessing and its guidance — and I seek refuge in You from the evil in it and the evil that follows it.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    en: "O Allah, this morning I call You to witness, and I call to witness the bearers of Your Throne, Your angels and all Your creation, that You are Allah — there is no god but You alone, with no partner — and that Muḥammad is Your servant and Messenger.",
    times: "Four times", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
    en: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
    times: "Once", source: "Jāmiʿ al-Tirmidhī" },

  { ar: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    en: "I seek Allah's forgiveness and I turn to Him in repentance.",
    times: "One hundred times", source: "al-Muʿjam al-Awsaṭ · aṭ-Ṭabarānī" },

  { ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
    en: "Glory and praise be to Allah, as many times as the number of His creation, as pleases Him, as the weight of His Throne and as the ink of His words.",
    times: "Three times", source: "Ṣaḥīḥ Muslim" },
];

const EVENING = [
  { ar: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    en: "O Allah, whatever blessing has come to me this evening, or to any of Your creation, is from You alone, with no partner — so Yours is the praise and Yours is the thanks.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ",
    en: "We have entered the evening upon the natural way of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muḥammad, and upon the faith of our father Ibrāhīm, who was upright, a Muslim, and not of those who associate others with Allah.",
    times: "Once", source: "Sunan an-Nasā'ī" },

  { ar: "أَمْسَيْتُ أُثْنِي عَلَيْكَ حَمْدًا، وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ",
    en: "This evening I praise You, and I bear witness that there is no god but Allah.",
    times: "Three times", source: "Sunan an-Nasā'ī" },

  { ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ",
    en: "We have entered the evening and the dominion belongs to Allah. Praise be to Allah. There is no god but Allah alone, with no partner; His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this night and the good that follows it, and I seek refuge in You from the evil of this night and the evil that follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
    times: "Once", source: "Ṣaḥīḥ Muslim" },

  { ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ، فَتْحَهَا وَنَصْرَهَا وَنُورَهَا وَبَرَكَتَهَا وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا",
    en: "We have entered the evening and the dominion belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this night — its victory, its help, its light, its blessing and its guidance — and I seek refuge in You from the evil in it and the evil that follows it.",
    times: "Once", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    en: "O Allah, this evening I call You to witness, and I call to witness the bearers of Your Throne, Your angels and all Your creation, that You are Allah — there is no god but You alone, with no partner — and that Muḥammad is Your servant and Messenger.",
    times: "Four times", source: "Sunan Abī Dāwūd" },

  { ar: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
    en: "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the return.",
    times: "Once", source: "Jāmiʿ al-Tirmidhī" },

  { ar: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    en: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    times: "Three times", source: "Sunan an-Nasā'ī" },
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
  quranNote: "Qur'anic passages here are the same verified IndoPak text used in the Qur'an reader.",
  sections: [
    { id: "morning-evening", title: "Morning & Evening",
      intro: "Read both in the morning, between Fajr and sunrise, and in the evening, between ʿAṣr and Maghrib.",
      items: BOTH },
    { id: "morning", title: "Morning only",
      intro: "Read in the morning only, between Fajr and sunrise.",
      items: MORNING },
    { id: "evening", title: "Evening only",
      intro: "Read in the evening only, between ʿAṣr and Maghrib.",
      items: EVENING },
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

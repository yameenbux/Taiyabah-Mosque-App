/**
 * Taiyabah Masjid — 40 Rabbanā duʿās
 * Copyright (c) 2026 Yameen Bux. All rights reserved. See LICENSE.md.
 *
 * CONTENT NOTE
 * The Arabic here is Qur'anic text — scripture, not anyone's intellectual
 * property. The verse references are facts. Neither is copyrightable.
 * Deliberately NOT included: any transliteration, English translation,
 * design or layout from the compilation this list was taken from — those
 * are that publisher's own creative work and are not reproduced here.
 *
 * VERIFIED
 * This Arabic was transcribed from page images, which is error-prone, so it
 * is now checked against the verified IndoPak text in quran/surahs/: every
 * entry must appear verbatim inside the āyah it cites, comparing letters and
 * ignoring the diacritics and pause marks that differ between printings. All
 * forty match. Re-run after any edit:
 *
 *     node scripts/verify-rabbanas.mjs
 *
 * The release check runs it too, so an edit that drifts from the Mus-haf
 * fails before it ships rather than after.
 *
 * Script: Indo-Pak, matching the compilation and what the community reads.
 *
 * Lazy-loaded — only fetched when someone opens this page, never part of
 * the main app bundle.
 */
window.RABBANAS = [
  { n:1,  ref:"Al-Baqarah 127", ar:"رَبَّنَا تَقَبَّلْ مِنَّا اِنَّكَ اَنْتَ السَّمِيْعُ الْعَلِيْمُ",
  en:"Our Lord, accept this from us. You are the All-Hearing, the All-Knowing." },
  { n:2,  ref:"Al-Baqarah 201", ar:"رَبَّنَآ اٰتِنَا فِى الدُّنْيَا حَسَنَةً وَّفِى الْاٰخِرَةِ حَسَنَةً وَّقِنَا عَذَابَ النَّارِ",
  en:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire." },
  { n:3,  ref:"Al-Baqarah 128", ar:"رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِنْ ذُرِّيَّتِنَآ اُمَّةً مُّسْلِمَةً لَّكَ وَاَرِنَا مَنَاسِكَنَا وَتُبْ عَلَيْنَا اِنَّكَ اَنْتَ التَّوَّابُ الرَّحِيْمُ",
  en:"Our Lord, make us both submit to You, and make of our descendants a people who submit to You. Show us our rites of worship, and turn to us in mercy. You are the Ever-Relenting, the Most Merciful." },
  { n:4,  ref:"Al-Baqarah 286", ar:"رَبَّنَا لَا تُؤَاخِذْنَآ اِنْ نَّسِيْنَآ اَوْ اَخْطَأْنَا",
  en:"Our Lord, do not take us to task if we forget or fall into error." },
  { n:5,  ref:"Al-Baqarah 286", ar:"رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَآ اِصْرًا كَمَا حَمَلْتَهٗ عَلَى الَّذِيْنَ مِنْ قَبْلِنَا",
  en:"Our Lord, do not lay upon us a burden like the one You laid upon those before us." },
  { n:6,  ref:"Al-Baqarah 286", ar:"رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهٖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا اَنْتَ مَوْلٰىنَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكٰفِرِيْنَ",
  en:"Our Lord, do not burden us with more than we can bear. Pardon us, forgive us, and have mercy on us. You are our Protector, so help us against those who reject faith." },
  { n:7,  ref:"Al-Baqarah 250", ar:"رَبَّنَآ اَفْرِغْ عَلَيْنَا صَبْرًا وَّثَبِّتْ اَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكٰفِرِيْنَ",
  en:"Our Lord, pour out patience upon us, make our steps firm, and help us against those who reject faith." },
  { n:8,  ref:"Āl ʿImrān 8",    ar:"رَبَّنَا لَا تُزِغْ قُلُوْبَنَا بَعْدَ اِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَّدُنْكَ رَحْمَةً اِنَّكَ اَنْتَ الْوَهَّابُ",
  en:"Our Lord, do not let our hearts turn away after You have guided us, and grant us mercy from Yourself. You are the Ever-Giving." },
  { n:9,  ref:"Āl ʿImrān 9",    ar:"رَبَّنَآ اِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَّا رَيْبَ فِيْهِ اِنَّ اللّٰهَ لَا يُخْلِفُ الْمِيْعَادَ",
  en:"Our Lord, You are the One who will gather all people for a Day of which there is no doubt. Allah does not fail in His promise." },
  { n:10, ref:"Āl ʿImrān 16",   ar:"رَبَّنَآ اِنَّنَآ اٰمَنَّا فَاغْفِرْ لَنَا ذُنُوْبَنَا وَقِنَا عَذَابَ النَّارِ",
  en:"Our Lord, we have believed, so forgive us our sins and protect us from the punishment of the Fire." },
  { n:11, ref:"Āl ʿImrān 53",   ar:"رَبَّنَآ اٰمَنَّا بِمَآ اَنْزَلْتَ وَاتَّبَعْنَا الرَّسُوْلَ فَاكْتُبْنَا مَعَ الشّٰهِدِيْنَ",
  en:"Our Lord, we believe in what You have sent down and we follow the Messenger, so count us among those who bear witness." },
  { n:12, ref:"Āl ʿImrān 147",  ar:"رَبَّنَا اغْفِرْ لَنَا ذُنُوْبَنَا وَاِسْرَافَنَا فِيْٓ اَمْرِنَا وَثَبِّتْ اَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكٰفِرِيْنَ",
  en:"Our Lord, forgive us our sins and the excesses we have committed, make our steps firm, and help us against those who reject faith." },
  { n:13, ref:"Āl ʿImrān 191",  ar:"رَبَّنَا مَا خَلَقْتَ هٰذَا بَاطِلًا سُبْحٰنَكَ فَقِنَا عَذَابَ النَّارِ",
  en:"Our Lord, You did not create all this without purpose. Glory be to You — protect us from the punishment of the Fire." },
  { n:14, ref:"Āl ʿImrān 192",  ar:"رَبَّنَآ اِنَّكَ مَنْ تُدْخِلِ النَّارَ فَقَدْ اَخْزَيْتَهٗ وَمَا لِلظّٰلِمِيْنَ مِنْ اَنْصَارٍ",
  en:"Our Lord, whoever You admit to the Fire, You have truly disgraced; and the wrongdoers will have no helpers." },
  { n:15, ref:"Āl ʿImrān 193",  ar:"رَبَّنَآ اِنَّنَا سَمِعْنَا مُنَادِيًا يُّنَادِيْ لِلْاِيْمَانِ اَنْ اٰمِنُوْا بِرَبِّكُمْ فَاٰمَنَّا",
  en:"Our Lord, we heard a caller calling to faith, “Believe in your Lord” — and we believed." },
  { n:16, ref:"Āl ʿImrān 193",  ar:"رَبَّنَا فَاغْفِرْ لَنَا ذُنُوْبَنَا وَكَفِّرْ عَنَّا سَيِّاٰتِنَا وَتَوَفَّنَا مَعَ الْاَبْرَارِ",
  en:"Our Lord, forgive us our sins, wipe away our bad deeds, and let us die among the righteous." },
  { n:17, ref:"Āl ʿImrān 194",  ar:"رَبَّنَا وَاٰتِنَا مَا وَعَدْتَّنَا عَلٰى رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيٰمَةِ اِنَّكَ لَا تُخْلِفُ الْمِيْعَادَ",
  en:"Our Lord, give us what You promised us through Your messengers, and do not disgrace us on the Day of Resurrection. You do not fail in Your promise." },
  { n:18, ref:"Al-Māʾidah 83",  ar:"رَبَّنَآ اٰمَنَّا فَاكْتُبْنَا مَعَ الشّٰهِدِيْنَ",
  en:"Our Lord, we believe, so count us among those who bear witness." },
  { n:19, ref:"Al-Aʿrāf 23",    ar:"رَبَّنَا ظَلَمْنَآ اَنْفُسَنَا وَاِنْ لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُوْنَنَّ مِنَ الْخٰسِرِيْنَ",
  en:"Our Lord, we have wronged ourselves. If You do not forgive us and have mercy on us, we shall surely be among the lost." },
  { n:20, ref:"Al-Māʾidah 114", ar:"رَبَّنَآ اَنْزِلْ عَلَيْنَا مَآئِدَةً مِّنَ السَّمَآءِ تَكُوْنُ لَنَا عِيْدًا لِّاَوَّلِنَا وَاٰخِرِنَا وَاٰيَةً مِّنْكَ وَارْزُقْنَا وَاَنْتَ خَيْرُ الرّٰزِقِيْنَ",
  en:"Our Lord, send down to us a table from heaven, to be a festival for the first of us and the last of us, and a sign from You. And provide for us — You are the best of providers." },
  { n:21, ref:"Al-Aʿrāf 47",    ar:"رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظّٰلِمِيْنَ",
  en:"Our Lord, do not place us among the wrongdoers." },
  { n:22, ref:"Al-Aʿrāf 89",    ar:"رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَاَنْتَ خَيْرُ الْفٰتِحِيْنَ",
  en:"Our Lord, decide between us and our people with truth. You are the best of those who decide." },
  { n:23, ref:"Al-Aʿrāf 126",   ar:"رَبَّنَآ اَفْرِغْ عَلَيْنَا صَبْرًا وَّتَوَفَّنَا مُسْلِمِيْنَ",
  en:"Our Lord, pour out patience upon us, and let us die in submission to You." },
  { n:24, ref:"Yūnus 85–86",    ar:"رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظّٰلِمِيْنَ ۞ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكٰفِرِيْنَ",
  en:"Our Lord, do not make us a trial for the wrongdoers, and save us by Your mercy from those who reject faith." },
  { n:25, ref:"Ibrāhīm 38",     ar:"رَبَّنَآ اِنَّكَ تَعْلَمُ مَا نُخْفِيْ وَمَا نُعْلِنُ وَمَا يَخْفٰى عَلَى اللّٰهِ مِنْ شَىْءٍ فِى الْاَرْضِ وَلَا فِى السَّمَآءِ",
  en:"Our Lord, You know what we hide and what we make known. Nothing on earth or in heaven is hidden from Allah." },
  { n:26, ref:"Ibrāhīm 40",     ar:"رَبَّنَا وَتَقَبَّلْ دُعَآءِ",
  en:"Our Lord, accept my prayer." },
  { n:27, ref:"Ibrāhīm 41",     ar:"رَبَّنَا اغْفِرْ لِيْ وَلِوَالِدَيَّ وَلِلْمُؤْمِنِيْنَ يَوْمَ يَقُوْمُ الْحِسَابُ",
  en:"Our Lord, forgive me, and my parents, and the believers, on the Day the reckoning comes." },
  { n:28, ref:"Al-Kahf 10",     ar:"رَبَّنَآ اٰتِنَا مِنْ لَّدُنْكَ رَحْمَةً وَّهَيِّئْ لَنَا مِنْ اَمْرِنَا رَشَدًا",
  en:"Our Lord, grant us mercy from Yourself, and guide us rightly in what lies before us." },
  { n:29, ref:"Ṭā Hā 45",       ar:"رَبَّنَآ اِنَّنَا نَخَافُ اَنْ يَّفْرُطَ عَلَيْنَآ اَوْ اَنْ يَّطْغٰى",
  en:"Our Lord, we fear that he will be harsh with us, or that he will go too far." },
  { n:30, ref:"At-Taḥrīm 11",   ar:"رَبِّ ابْنِ لِيْ عِنْدَكَ بَيْتًا فِى الْجَنَّةِ",
  en:"My Lord, build for me a home with You in Paradise." },
  { n:31, ref:"Al-Muʾminūn 109",ar:"رَبَّنَآ اٰمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَاَنْتَ خَيْرُ الرّٰحِمِيْنَ",
  en:"Our Lord, we believe, so forgive us and have mercy on us. You are the most merciful of all." },
  { n:32, ref:"Fāṭir 34",       ar:"رَبَّنَا لَغَفُوْرٌ شَكُوْرٌ",
  en:"Our Lord is indeed Most Forgiving, Most Appreciative." },
  { n:33, ref:"Al-Furqān 65–66",ar:"رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ اِنَّ عَذَابَهَا كَانَ غَرَامًا ۞ اِنَّهَا سَآءَتْ مُسْتَقَرًّا وَّمُقَامًا",
  en:"Our Lord, turn the punishment of Hell away from us. Its punishment is relentless; it is an evil place to settle and to stay." },
  { n:34, ref:"Al-Furqān 74",   ar:"رَبَّنَا هَبْ لَنَا مِنْ اَزْوَاجِنَا وَذُرِّيّٰتِنَا قُرَّةَ اَعْيُنٍ وَّاجْعَلْنَا لِلْمُتَّقِيْنَ اِمَامًا",
  en:"Our Lord, let our spouses and our children be a joy to our eyes, and make us an example to those who are mindful of You." },
  { n:35, ref:"Ghāfir 7",       ar:"رَبَّنَا وَسِعْتَ كُلَّ شَىْءٍ رَّحْمَةً وَّعِلْمًا فَاغْفِرْ لِلَّذِيْنَ تَابُوْا وَاتَّبَعُوْا سَبِيْلَكَ وَقِهِمْ عَذَابَ الْجَحِيْمِ",
  en:"Our Lord, Your mercy and Your knowledge encompass all things. Forgive those who repent and follow Your path, and protect them from the punishment of the Blaze." },
  { n:36, ref:"Ghāfir 8",       ar:"رَبَّنَا وَاَدْخِلْهُمْ جَنّٰتِ عَدْنِ الَّتِيْ وَعَدْتَّهُمْ وَمَنْ صَلَحَ مِنْ اٰبَآئِهِمْ وَاَزْوَاجِهِمْ وَذُرِّيّٰتِهِمْ اِنَّكَ اَنْتَ الْعَزِيْزُ الْحَكِيْمُ",
  en:"Our Lord, admit them to the Gardens of Eternity that You promised them, along with the righteous among their parents, their spouses and their children. You are the Almighty, the All-Wise." },
  { n:37, ref:"Al-Ḥashr 10",    ar:"رَبَّنَا اغْفِرْ لَنَا وَلِاِخْوَانِنَا الَّذِيْنَ سَبَقُوْنَا بِالْاِيْمَانِ وَلَا تَجْعَلْ فِيْ قُلُوْبِنَا غِلًّا لِّلَّذِيْنَ اٰمَنُوْا رَبَّنَآ اِنَّكَ رَءُوْفٌ رَّحِيْمٌ",
  en:"Our Lord, forgive us, and our brothers and sisters who came to faith before us, and leave no ill will in our hearts towards those who believe. Our Lord, You are Most Kind, Most Merciful." },
  { n:38, ref:"Al-Mumtaḥanah 4",ar:"رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَاِلَيْكَ اَنَبْنَا وَاِلَيْكَ الْمَصِيْرُ",
  en:"Our Lord, in You we put our trust, to You we turn, and to You is the final return." },
  { n:39, ref:"Al-Mumtaḥanah 5",ar:"رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِيْنَ كَفَرُوْا وَاغْفِرْ لَنَا رَبَّنَآ اِنَّكَ اَنْتَ الْعَزِيْزُ الْحَكِيْمُ",
  en:"Our Lord, do not make us a trial for those who reject faith, and forgive us. Our Lord, You are the Almighty, the All-Wise." },
  { n:40, ref:"At-Taḥrīm 8",    ar:"رَبَّنَآ اَتْمِمْ لَنَا نُوْرَنَا وَاغْفِرْ لَنَا اِنَّكَ عَلٰى كُلِّ شَىْءٍ قَدِيْرٌ",
  en:"Our Lord, perfect our light for us and forgive us. You have power over all things." },
];

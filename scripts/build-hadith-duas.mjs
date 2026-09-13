/* Taiyabah Masjid — extract the hadith duʿās from the primary Arabic text.

   WHY THIS EXISTS
   The everyday duʿās that come from hadith were the one part of the duʿā set
   we could not add safely: there was no machine-readable Arabic to lift them
   out of, and typing Arabic from memory has been wrong every single time it
   was tried here. It was wrong again while this file was being written —
   "بِكَلِمَاتِ اللَّهِ التَّامَّاتِ" is "التَّامَّةِ" in Abū Dāwūd, and a hand-typed needle
   found nothing at all.

   So nothing below is typed. Each duʿā names a collection, a hadith number
   and a span of words, and the Arabic is lifted verbatim out of that hadith.

       curl -o /tmp/ara-bukhari.json \
         https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-bukhari.min.json
       (and the same for muslim, abudawud, tirmidhi, ibnmajah, nasai, malik)
       node scripts/build-hadith-duas.mjs

   SOURCE   hadith-api (fawazahmed0), the ara-* editions
            https://github.com/fawazahmed0/hadith-api
   LICENCE  The Unlicense — public domain. The Arabic hadith text is a
            9th-century work and belongs to nobody.

   The editions are ~44 MB and are not committed. So that the duʿās can still
   be checked on a clean clone, this writes quran/duas-hadith-sources.json:
   the citation and a SHA-256 of the extracted Arabic for every duʿā. The
   release check holds quran/duas.js to those hashes without needing the
   source; scripts/verify-hadith-duas.mjs re-extracts from the source when it
   is present.

   WHAT WAS LEFT OUT, AND WHY
     * "When unable to sleep at night" — not in any of the six books. It comes
       through Ibn as-Sunni and is widely graded weak.
     * "Before removing clothing" — Jāmiʿ al-Tirmidhī 606, where Tirmidhī
       himself writes "وَإِسْنَادُهُ لَيْسَ بِذَاكَ الْقَوِيِّ" — its chain is not strong.
       The source flagged it; we are not going to ship past that.
     * The two garment duʿās — "Wearing new clothes" already in the app IS
       Abū Dāwūd 4023, so adding it again would be a duplicate.
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const SRC_DIR = process.argv[2] || "/tmp";
const OUT = "quran/duas-hadith-sources.json";

/* Collection name as it should read in the app, beside the key used to find
   the edition file. The app already cites these collections in this form. */
export const COLLECTIONS = {
  bukhari:  "Ṣaḥīḥ al-Bukhārī",
  muslim:   "Ṣaḥīḥ Muslim",
  abudawud: "Sunan Abī Dāwūd",
  tirmidhi: "Jāmiʿ al-Tirmidhī",
  ibnmajah: "Sunan Ibn Mājah",
  nasai:    "Sunan an-Nasā'ī",
  malik:    "al-Muwaṭṭa' · Mālik",
};

/* Each duʿā: which category it joins, its label, the plain English meaning,
   and where the Arabic comes from as [collection, hadith number, first word,
   last word] with 0-based word indices into that hadith.

   `cat` is the category id in quran/duas.js. Appending to an existing
   category is safe; inserting into one is not, because dua.<cat>.<n> keys
   are positional and every translation would shift by one. */
export const DUAS = [
  /* ---- appended to an existing category ---- */
  { cat:"hardship", label:"When something frightens you", tr:"Aʿūdhu bi-kalimātillāhit-tāmmati min ghaḍabihi wa sharri ʿibādihi wa min hamazātish-shayāṭīni wa an yaḥḍurūn",
    en:"I seek refuge in the perfect words of Allah from His anger, from the evil of His servants, from the promptings of the devils, and from their coming near me.",
    span:["abudawud", 3893, 32, 44],
    note:"The Prophet ﷺ taught these words to his companions for moments of fright." },

  /* ---- Health & Healing ---- */
  { cat:"health", label:"When you feel pain", tr:"Bismillāh. Aʿūdhu billāhi wa qudratihi min sharri mā ajidu wa uḥādhir",
    en:"In the name of Allah. I seek refuge in Allah and in His power from the evil of what I find and what I fear.",
    span:[["muslim", 5737, 61, 62], ["muslim", 5737, 69, 76]],
    note:"Place your hand where it hurts. Say “Bismillāh” three times, then the rest seven times." },
  { cat:"health", label:"Praying over someone who is ill", tr:"Adhhibil-bāsa Rabban-nās, ishfi Antash-Shāfī, lā shifā'a illā shifā'uk, shifā'an lā yughādiru saqamā",
    en:"Take away the harm, Lord of mankind, and heal — You are the Healer. There is no healing but Your healing, a healing that leaves no illness behind.",
    span:["abudawud", 3883, 98, 112] },
  { cat:"health", label:"For health and well-being", tr:"Allāhumma ʿāfinī fī badanī, Allāhumma ʿāfinī fī samʿī, Allāhumma ʿāfinī fī baṣarī, lā ilāha illā Ant",
    en:"O Allah, grant me well-being in my body. O Allah, grant me well-being in my hearing. O Allah, grant me well-being in my sight. There is no god but You.",
    span:["abudawud", 5090, 40, 55],
    note:"Said three times in the morning and three times in the evening." },

  /* ---- Marriage & Children ---- */
  { cat:"marriage", label:"Congratulating a newly-married couple", tr:"Bārakallāhu laka wa bāraka ʿalayka wa jamaʿa baynakumā fī khayr",
    en:"May Allah bless you, and send blessings upon you, and join you together in goodness.",
    span:["abudawud", 2130, 34, 42] },
  { cat:"marriage", label:"When you marry", tr:"Allāhumma innī as'aluka khayrahā wa khayra mā jabaltahā ʿalayh, wa aʿūdhu bika min sharrihā wa min sharri mā jabaltahā ʿalayh",
    en:"O Allah, I ask You for the good in her and the good of what You have made her inclined towards, and I seek refuge in You from the evil in her and the evil of what You have made her inclined towards.",
    span:["abudawud", 2160, 46, 62],
    note:"Said on marrying. A wife says the same, changing the pronouns." },
  { cat:"marriage", label:"Before a husband and wife come together", tr:"Bismillāh. Allāhumma jannibnash-shayṭāna wa jannibish-shayṭāna mā razaqtanā",
    en:"In the name of Allah. O Allah, keep the devil away from us, and keep the devil away from what You grant us.",
    span:["bukhari", 141, 37, 45] },
  { cat:"marriage", label:"Seeking Allah's protection for your children", tr:"Uʿīdhukumā bi-kalimātillāhit-tāmmati min kulli shayṭānin wa hāmmah, wa min kulli ʿaynin lāmmah",
    en:"I place you both in the protection of the perfect words of Allah, from every devil and every creeping thing, and from every harmful eye.",
    span:["abudawud", 4737, 33, 44],
    note:"The Prophet ﷺ said this over Ḥasan and Ḥusayn. For one child, say “Uʿīdhuka”." },

  /* ---- Death & Loss ---- */
  { cat:"death", label:"When you hear bad news or suffer a loss", tr:"Innā lillāhi wa innā ilayhi rājiʿūn. Allāhumma'jurnī fī muṣībatī wa akhlif lī khayran minhā",
    en:"To Allah we belong and to Him we return. O Allah, reward me in my affliction and give me something better than it in its place.",
    span:["muslim", 2126, 55, 67] },
  { cat:"death", label:"For someone who has died", tr:"Allāhumma-ghfir lahu warḥamhu wa ʿāfihi waʿfu ʿanhu, wa akrim nuzulahu wa wassiʿ mudkhalahu, waghsilhu bil-mā'i wath-thalji wal-barad, wa naqqihi minal-khaṭāyā kamā naqqaytath-thawbal-abyaḍa minad-danas, wa abdilhu dāran khayran min dārihi wa ahlan khayran min ahlihi wa zawjan khayran min zawjihi, wa adkhilhul-jannah, wa aʿidhhu min ʿadhābil-qabri aw min ʿadhābin-nār",
    en:"O Allah, forgive him and have mercy on him, keep him safe and pardon him, honour his arrival and make his entry wide. Wash him with water, snow and hail, and cleanse him of his sins as a white garment is cleansed of dirt. Give him a home better than his home, a family better than his family and a spouse better than his spouse. Admit him into the Garden, and protect him from the punishment of the grave and the punishment of the Fire.",
    span:["muslim", 2232, 43, 89],
    note:"The duʿā of the funeral prayer. For a woman, the pronouns change." },
  { cat:"death", label:"When visiting the graveyard", tr:"As-salāmu ʿalaykum ahlad-diyāri minal-mu'minīna wal-muslimīn, wa innā in shā'Allāhu la-lāḥiqūn. As'alullāha lanā wa lakumul-ʿāfiyah",
    en:"Peace be upon you, people of these dwellings, believers and Muslims. We will, if Allah wills, be joining you. I ask Allah for well-being for us and for you.",
    span:["muslim", 2257, 59, 75] },

  /* ---- appended to Food & Drink ---- */
  { cat:"food", label:"Over food or drink you are given",
    tr:"Allāhumma bārik lanā fīhi wa aṭʿimnā khayran minh",
    en:"O Allah, bless it for us and feed us with better than it.",
    span:["abudawud", 3730, 95, 101] },
  { cat:"food", label:"After drinking milk",
    tr:"Allāhumma bārik lanā fīhi wa zidnā minh",
    en:"O Allah, bless it for us and give us more of it.",
    span:["abudawud", 3730, 107, 112],
    note:"Milk alone has its own words: \u201cgive us more of it\u201d rather than \u201cbetter than it\u201d." },
  { cat:"food", label:"For the household that fed you",
    tr:"Afṭara ʿindakumuṣ-ṣā'imūn, wa akala ṭaʿāmakumul-abrār, wa ṣallat ʿalaykumul-malā'ikah",
    en:"May those who are fasting break their fast with you, may the righteous eat your food, and may the angels send blessings upon you.",
    span:["abudawud", 3854, 37, 45],
    note:"Said for your hosts. The Prophet ﷺ said it after eating at Saʿd ibn ʿUbādah's home." },

  /* ---- Ramadan ---- */
  { cat:"ramadan", label:"On sighting the new moon",
    tr:"Allāhumma ahlilhu ʿalaynā bil-yumni wal-īmāni was-salāmati wal-islām. Rabbī wa Rabbukallāh",
    en:"O Allah, bring it over us with blessing and faith, with safety and with Islam. My Lord and your Lord is Allah.",
    span:["tirmidhi", 3451, 43, 52],
    note:"Said on first seeing the crescent — of Ramaḍān or of any month." },
  { cat:"ramadan", label:"When someone picks a fight while you are fasting",
    tr:"Innī ṣā'im",
    en:"I am fasting.",
    span:["bukhari", 1894, 42, 43],
    note:"Said twice, and out loud. The fast is a shield: it is not answered in kind." },
  { cat:"ramadan", label:"On Laylat al-Qadr",
    tr:"Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī",
    en:"O Allah, You are most forgiving, and You love to forgive, so forgive me.",
    span:["ibnmajah", 3850, 33, 39],
    note:"ʿĀ'ishah asked what to say if she found Laylat al-Qadr. Jāmiʿ al-Tirmidhī records the same duʿā with “ʿafuwwun karīm”." },
];

/* Editorial marks in this edition: the bidi controls that fence a quotation,
   the ASCII quote inside them, and the full stop that closes a narration.
   Written as explicit escapes — a class typed with the literal characters is
   how the app's search normaliser ended up eating the Arabic alphabet. */
const MARKS = /[​-‏؜]/gu;
export const tidy = s => s
  .replace(MARKS, "")
  .replace(/"/g, "")
  .replace(/\s*\.\s*$/u, "")
  .replace(/\s+/gu, " ")
  .trim();

/* A letter must survive tidying. If this fails, the class above is eating
   Arabic and every duʿā below would ship truncated. */
export function assertTidySane() {
  const probe = "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u200f\"\u200f";
  const out = tidy(probe);
  const letters = (out.match(/[\u0621-\u064a]/gu) || []).length;
  if (letters < 5)
    throw new Error(`tidy() is destroying Arabic: ${letters} letters left of 5`);
  if (/["\u200e\u200f]/u.test(out))
    throw new Error("tidy() is leaving editorial marks in");
}

const cache = {};
const edition = k => (cache[k] ||= JSON.parse(
  readFileSync(`${SRC_DIR}/ara-${k}.json`, "utf8")).hadiths);

export function extract(col, num, from, to) {
  const h = edition(col).find(x => x.hadithnumber === num);
  if (!h) throw new Error(`${col} ${num} not found in the edition`);
  const words = String(h.text).replace(/\s+/g, " ").trim().split(" ");
  if (to >= words.length)
    throw new Error(`${col} ${num} has ${words.length} words, asked for ${to}`);
  return tidy(words.slice(from, to + 1).join(" "));
}

export const spansOf = d => (Array.isArray(d.span[0]) ? d.span : [d.span]);

export const arabicFor = d => spansOf(d).map(s => extract(...s)).join(" ");

/* The collection, with no hadith number. The number in the spans above is
   this EDITION's number, and hadith-api's Muslim numbering is not the one
   people cite: the funeral duʿā below is its 2232 and everyone else's 963.
   A citation that sends a reader to the wrong hadith is worse than no
   citation, so the app prints the collection — which is what every duʿā
   already in the app prints — and the edition number is kept in
   quran/duas-hadith-sources.json, labelled as the edition's own. */
export const srcOf = d => d.src ||
  [...new Set(spansOf(d).map(s => COLLECTIONS[s[0]]))].join(" · ");

export const sha = s => createHash("sha256").update(s).digest("hex").slice(0, 16);

if ((process.argv[1] || "").endsWith("build-hadith-duas.mjs")) {
  assertTidySane();
  const missing = [...new Set(DUAS.map(d => spansOf(d)[0][0]))]
    .filter(k => !existsSync(`${SRC_DIR}/ara-${k}.json`));
  if (missing.length) {
    console.error(`\nSource editions not found in ${SRC_DIR}: ${missing.join(", ")}\n`);
    console.error("Fetch them with:");
    console.error(`  for e in ${missing.join(" ")}; do curl -o ${SRC_DIR}/ara-$e.json \\`);
    console.error("    https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-$e.min.json; done\n");
    process.exit(1);
  }

  const esc = x => x.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const record = [];
  let cat = null;
  for (const d of DUAS) {
    const ar = arabicFor(d);
    if (!ar) throw new Error(`${d.label}: extracted nothing`);
    if (d.cat !== cat) { console.log(`\n    /* ---- ${d.cat} ---- */`); cat = d.cat; }
    console.log(`      { label: "${esc(d.label)}",`);
    console.log(`        ar: "${ar}",`);
    if (d.tr) console.log(`        tr: "${esc(d.tr)}",`);
    console.log(`        en: "${esc(d.en)}",`);
    if (d.note) console.log(`        note: "${esc(d.note)}",`);
    console.log(`        src: "${esc(srcOf(d))}" },`);
    record.push({
      cat: d.cat, label: d.label,
      ref: { editionSpans: spansOf(d),
                       note: "[collection, hadith number IN THIS EDITION, first word, last word]" },
      src: srcOf(d), sha: sha(ar),
    });
  }
  writeFileSync(OUT, JSON.stringify({
    note: "Provenance for the duʿās lifted out of primary text. Written by " +
          "scripts/build-hadith-duas.mjs; checked by scripts/verify-hadith-duas.mjs " +
          "and by the release check, which compares quran/duas.js against these hashes.",
    source: "hadith-api (fawazahmed0), ara-* editions — The Unlicense (public domain)",
    sourceUrl: "https://github.com/fawazahmed0/hadith-api",
    duas: record,
  }, null, 1) + "\n");
  console.error(`\n${record.length} duʿās extracted; provenance written to ${OUT}`);
}

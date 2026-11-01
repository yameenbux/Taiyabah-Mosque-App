# The strings that were drafted, and who read them

> **NINE STRINGS ADDED SINCE THE READING ARE NOT COVERED BY IT.** They are
> listed at the foot of this file under *Drafted after the reading*. They are
> the Hajj/ʿUmrah chooser's wording, and they went in with the journey split.
> Five were drafted; the other four were each built from strings that *were*
> read. Everything above that section is still as described below.

> **DONE — the reading has happened.** Every string listed here, the 97 in
> `lang/src/28-ramadan.json`, the Hajj strings in `lang/src/29-hajj.json` and
> the handful added since have been read and corrected by native speakers of
> Urdu, Gujarati and Arabic. Settings no longer warns the reader that the
> wording is unchecked, because it is not.
>
> The file stays because the question it answers has changed rather than gone
> away: not *what still needs reading* but *which strings were drafted rather
> than taken from the website, and therefore what was read*. Anyone asking who
> checked a wording starts here.

These thirteen are the strings in the app whose Urdu, Gujarati and Arabic were
**drafted rather than taken from the website**. Everything else the app says
was already translated for the web app and checked there.

They are held in `native/src/i18n/app-extra.json` as `"key": [Urdu, Gujarati, Arabic]`.
Change them there and run `npm run content`; do not edit `ur.json`, `gu.json` or
`ar.json`, which that command rewrites.

**If you add a string after this, it has not been read.** The packs fall back
to English for a missing key, so a gap degrades rather than breaks — but a new
drafted wording is a new drafted wording, and belongs in front of the same
readers before it is treated as finished.

---

### bukhari.nothing_matches

*Where it appears:* Ḥadīth → search box, when a search finds nothing

| | |
|---|---|
| **English** | Nothing matches that. |
| **Urdu** | کوئی نتیجہ نہیں ملا۔ |
| **Gujarati** | એવું કંઈ મળ્યું નહીં. |
| **Arabic** | لا توجد نتائج مطابقة. |

### bukhari.search_unavailable

*Where it appears:* Ḥadīth → search box, when the phone is offline

| | |
|---|---|
| **English** | Search needs a connection the first time. Try again when you are online. |
| **Urdu** | پہلی بار تلاش کے لیے انٹرنیٹ درکار ہے۔ آن لائن ہونے پر دوبارہ کوشش کریں۔ |
| **Gujarati** | પહેલી વાર શોધ માટે ઇન્ટરનેટ જરૂરી છે. ઑનલાઇન હો ત્યારે ફરી પ્રયાસ કરો. |
| **Arabic** | يحتاج البحث إلى اتصال في المرة الأولى. حاول مرة أخرى عند الاتصال بالإنترنت. |

### hallhire.agree_first

*Where it appears:* Hall Hire → the alert if you press Request before ticking the terms

| | |
|---|---|
| **English** | Please agree to the terms of hire before sending. |
| **Urdu** | بھیجنے سے پہلے کرایے کی شرائط سے اتفاق کریں۔ |
| **Gujarati** | મોકલતા પહેલાં ભાડાની શરતો સ્વીકારો. |
| **Arabic** | يرجى الموافقة على شروط الإيجار قبل الإرسال. |

### home.times_coming

*Where it appears:* Home → the prayer card while the times are still loading

| | |
|---|---|
| **English** | The masjid publishes one year at a time. Times appear here as soon as the new timetable is out — please check at the masjid meanwhile. |
| **Urdu** | مسجد ایک وقت میں ایک سال کا ٹائم ٹیبل شائع کرتی ہے۔ نیا ٹائم ٹیبل آتے ہی اوقات یہاں آ جائیں گے — اس دوران مسجد سے معلوم کر لیں۔ |
| **Gujarati** | મસ્જિદ એક સમયે એક વર્ષનું સમયપત્રક પ્રકાશિત કરે છે. નવું સમયપત્રક આવતાં જ સમય અહીં દેખાશે — ત્યાં સુધી મસ્જિદમાં પૂછી લો. |
| **Arabic** | ينشر المسجد جدول سنة واحدة في كل مرة. ستظهر المواقيت هنا فور صدور الجدول الجديد — وحتى ذلك الحين يرجى السؤال في المسجد. |

### mushaf.needs_signal

*Where it appears:* Qurʼan → muṣḥaf reader, when pages are not downloaded and there is no signal

| | |
|---|---|
| **English** | This page has not been read before, so it needs a connection the first time. Once read, it stays on the phone. |
| **Urdu** | یہ صفحہ پہلے نہیں پڑھا گیا، اس لیے پہلی بار انٹرنیٹ درکار ہے۔ ایک بار کھلنے کے بعد یہ فون میں محفوظ رہتا ہے۔ |
| **Gujarati** | આ પાનું પહેલાં વાંચ્યું નથી, તેથી પહેલી વાર ઇન્ટરનેટ જરૂરી છે. એક વાર ખૂલ્યા પછી તે ફોનમાં રહે છે. |
| **Arabic** | لم تُقرأ هذه الصفحة من قبل، لذا تحتاج إلى اتصال في المرة الأولى. وبعد فتحها تبقى محفوظة على الهاتف. |

### offline.still_works

*Where it appears:* Any screen → the grey bar along the top when the phone loses connection

| | |
|---|---|
| **English** | No connection. Prayer times, the Qurʼan, the adhkār and the qibla all still work. |
| **Urdu** | انٹرنیٹ نہیں ہے۔ نماز کے اوقات، قرآن، اذکار اور قبلہ پھر بھی کام کرتے ہیں۔ |
| **Gujarati** | ઇન્ટરનેટ નથી. નમાઝના સમય, કુરઆન, અઝકાર અને કિબલા હજી પણ કામ કરે છે. |
| **Arabic** | لا يوجد اتصال. مواقيت الصلاة والقرآن والأذكار والقبلة تعمل كلها. |

### sheet.beginning

*Where it appears:* Prayer Times → the sheet that opens on a prayer, the row for the start of its window

| | |
|---|---|
| **English** | Beginning |
| **Urdu** | آغاز |
| **Gujarati** | શરૂઆત |
| **Arabic** | البداية |

### sysprefs.appearance

*Where it appears:* System Preferences → the heading above Light / Dark

| | |
|---|---|
| **English** | Appearance |
| **Urdu** | ظاہری شکل |
| **Gujarati** | દેખાવ |
| **Arabic** | المظهر |

### sysprefs.choose_how_the_app_looks

*Where it appears:* System Preferences → the sentence under that heading

| | |
|---|---|
| **English** | Choose how the app looks. Light is the usual setting; dark is easier on the eyes at night. |
| **Urdu** | منتخب کریں کہ ایپ کیسی دکھے۔ عام طور پر ہلکا رنگ استعمال ہوتا ہے؛ رات کو گہرا رنگ آنکھوں کے لیے آسان ہے۔ |
| **Gujarati** | એપ કેવી દેખાય તે પસંદ કરો. સામાન્ય રીતે આછો રંગ વપરાય છે; રાત્રે ઘેરો રંગ આંખો માટે સરળ છે. |
| **Arabic** | اختر شكل التطبيق. الوضع الفاتح هو المعتاد، والوضع الداكن أرفق بالعينين ليلًا. |

### sysprefs.dark

*Where it appears:* System Preferences → Appearance, the dark option

| | |
|---|---|
| **English** | Dark |
| **Urdu** | گہرا |
| **Gujarati** | ઘેરો |
| **Arabic** | داكن |

### sysprefs.light

*Where it appears:* System Preferences → Appearance, the light option

| | |
|---|---|
| **English** | Light |
| **Urdu** | ہلکا |
| **Gujarati** | આછો |
| **Arabic** | فاتح |

### times.monthly_timetable

*Where it appears:* Prayer Times → the button that opens the whole year, month by month

| | |
|---|---|
| **English** | Monthly timetable |
| **Urdu** | ماہانہ ٹائم ٹیبل |
| **Gujarati** | માસિક સમયપત્રક |
| **Arabic** | الجدول الشهري |

### alerts.masjid_will_send

*Where it appears:* Notifications → under the card, followed by a list of the
categories the masjid will send to this phone. It is read back from the
masjid's own server rather than from the switches, so it is the line that
tells somebody their choice actually took effect.

| | |
|---|---|
| **English** | The masjid has your choices and will send you: |
| **Urdu** | مسجد کے پاس آپ کی پسند محفوظ ہے۔ آپ کو یہ بھیجا جائے گا: |
| **Gujarati** | મસ્જિદ પાસે તમારી પસંદગી સચવાયેલી છે. તમને આ મોકલવામાં આવશે: |
| **Arabic** | المسجد لديه اختياراتك وسيُرسل إليك: |

---

## Drafted after the reading

The reading recorded above happened before the Hajj section split into two
journeys. These nine strings came with that split, so **no native speaker has
read five of them.** They are not wrong as far as the drafter could tell, and
they are not checked, and those are different things.

They sit in `app-extra.json` like the rest, as `"key": [Urdu, Gujarati, Arabic]`.

**`hajj.published_by_taiyabah` is the exception and does not need re-reading.**
It is `hajj.published_by_the_masjid` — which was read and corrected — with the
clause naming the Daʿwah Academy deleted, because the trustee asked that only
Taiyabah Masjid appear anywhere a reader can see. Nothing else about the
sentence moved. The key is new only because a key owns its translation in
three languages, so editing the English under the old key would have left
Urdu, Gujarati and Arabic still naming the Academy.

### hajj.plan_your_umrah

*Where it appears:* Hajj & ʿUmrah → the chooser, the ʿUmrah card

| | |
|---|---|
| **English** | Plan your journey: ʿUmrah |
| **Urdu** | اپنے سفر کی تیاری: عمرہ |
| **Gujarati** | તમારી મુસાફરીની તૈયારી: ઉમરાહ |
| **Arabic** | خَطِّطْ لِرِحْلَتِك: الْعُمْرَة |

### hajj.plan_your_hajj

*Where it appears:* Hajj & ʿUmrah → the chooser, the Hajj card

| | |
|---|---|
| **English** | Plan your journey: Hajj |
| **Urdu** | اپنے سفر کی تیاری: حج |
| **Gujarati** | તમારી મુસાફરીની તૈયારી: હજ |
| **Arabic** | خَطِّطْ لِرِحْلَتِك: الْحَجّ |

### hajj.choose_the_journey

*Where it appears:* Hajj & ʿUmrah → the chooser, the line above the two cards

| | |
|---|---|
| **English** | Choose the journey you are making. The packing, the heat and the paperwork are the same for both. |
| **Urdu** | منتخب کیجیے کہ آپ کون سا سفر کر رہے ہیں۔ سامان، گرمی اور کاغذات دونوں کے لیے ایک جیسے ہیں۔ |
| **Gujarati** | તમે કઈ મુસાફરી કરી રહ્યા છો તે પસંદ કરો. સામાન, ગરમી અને કાગળકામ બંને માટે સરખાં છે. |
| **Arabic** | اخْتَرِ الرِّحْلَةَ الَّتِي تُؤَدِّيهَا. أَمَّا الْحَقِيبَةُ وَالْحَرُّ وَالْأَوْرَاقُ فَهِيَ نَفْسُهَا فِي كِلْتَيْهِمَا. |

### hajj.the_rites_in_order

*Where it appears:* Hajj & ʿUmrah → the chooser, under the ʿUmrah card's title

| | |
|---|---|
| **English** | The rites in order, iḥrām, and the duʿās |
| **Urdu** | مناسک بالترتیب، احرام، اور دعائیں |
| **Gujarati** | મનાસિક ક્રમ પ્રમાણે, ઇહરામ, અને દુઆઓ |
| **Arabic** | الْمَنَاسِكُ بِتَرْتِيبِهَا، وَالْإِحْرَام، وَالْأَدْعِيَة |

### hajj.the_case_the_heat

*Where it appears:* Hajj & ʿUmrah → the chooser, under the Hajj card's title

| | |
|---|---|
| **English** | The case, the heat, the paperwork and coming home |
| **Urdu** | سامان، گرمی، کاغذات اور واپسی |
| **Gujarati** | સામાન, ગરમી, કાગળકામ અને ઘરે પાછા ફરવું |
| **Arabic** | الْحَقِيبَة، وَالْحَرّ، وَالْأَوْرَاق، وَالْعَوْدَة |

### hajj.published_by_taiyabah

*Where it appears:* Hajj & ʿUmrah → the foot of each journey's branch list

*This is the cut-down one. It was read as `hajj.published_by_the_masjid`.*

| | |
|---|---|
| **English** | Published by Taiyabah Masjid. For your own case, ask the ʿulamā. |
| **Urdu** | طیبہ مسجد کی جانب سے شائع کردہ۔ اپنے مخصوص مسئلے کے لیے علماء سے رجوع کیجیے۔ |
| **Gujarati** | તૈયબા મસ્જિદ દ્વારા પ્રકાશિત. તમારા પોતાના પ્રશ્ન માટે ઉલમાને પૂછો. |
| **Arabic** | تَنْشُرُهُ مَسْجِدُ طَيِّبَة. وَلِمَسْأَلَتِكَ الْخَاصَّةِ اسْأَلِ الْعُلَمَاء. |

### hajj.back_to_hajj_umrah, hajj.umrah_short, hajj.hajj_short

*Where they appear:* Hajj & ʿUmrah → the sheet header, once a journey is
chosen — the back control, and the title that names the journey.

*Derived, not drafted, and listed here only so the count is honest.* The back
label is an arrow plus `marriage.hajj_umrah`, which was read. The two journey
names are the nouns already standing inside `hajj.plan_your_umrah` and
`hajj.plan_your_hajj` above, lifted out unchanged.

| | Urdu | Gujarati | Arabic |
|---|---|---|---|
| **← Hajj / Umrah** | ← حج / عمرہ | ← હજ / ઉમરહ | ← الحج / العمرة |
| **ʿUmrah** | عمرہ | ઉમરાહ | الْعُمْرَة |
| **Hajj** | حج | હજ | الْحَجّ |

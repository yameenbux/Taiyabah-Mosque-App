# Twelve strings needing a native speaker — app 2.0.1

These twelve are the only strings in the app whose Urdu, Gujarati and Arabic were
**drafted rather than taken from the website**. Everything else the app says was
already translated for the web app and checked. Please read these twelve and
correct anything that reads wrongly — the meaning matters more than the wording.

They are held in `native/src/i18n/app-extra.json` as `"key": [Urdu, Gujarati, Arabic]`.
Change them there and run `npm run content`; do not edit `ur.json`, `gu.json` or
`ar.json`, which that command rewrites.

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

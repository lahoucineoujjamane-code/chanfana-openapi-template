# 🚀 نشر «طبيب الأعشاب» على Google Play — دليل خطوة بخطوة

كل ما يحتاجه المتجر جاهز في هذا المجلد. الخطوات المعلَّمة بـ 👤 تتطلب حسابك الشخصي ولا يمكن لأحد غيرك القيام بها.

| الملف | الاستعمال في Play Console |
|---|---|
| `listing-ar.txt` / `listing-fr.txt` / `listing-en.txt` | الاسم، الوصف القصير، الوصف الكامل لكل لغة |
| `graphics/app-icon-512.png` | أيقونة التطبيق (512×512) |
| `graphics/feature-graphic-1024x500.png` | صورة الغلاف (Feature graphic) |
| `screenshots/ar-*.png`, `fr-*.png`, `en-*.png` | لقطات الهاتف لكل لغة (1080×1920) |
| `../PRIVACY.md` | سياسة الخصوصية (رابطها أدناه) |

---

## 1) 👤 إنشاء حساب مطوّر
1. ادخل إلى https://play.google.com/console/signup بحساب Gmail.
2. اختر **حساب شخصي (Personal)**، وادفع رسوم التسجيل لمرة واحدة (25 دولاراً).
3. أكمل **التحقق من الهوية** (بطاقة التعريف) والتحقق من رقم الهاتف. قد يستغرق ذلك من ساعات إلى أيام.

> ⚠️ **شرط مهم للحسابات الشخصية الجديدة:** قبل النشر للعموم يجب إجراء **اختبار مغلق (Closed testing)** بمشاركة **12 مختبراً على الأقل** لمدة **14 يوماً متواصلة**، ثم تقديم طلب «الوصول إلى الإنتاج». جهّز 12 شخصاً (عائلة، أصدقاء) لديهم حسابات Gmail وهواتف أندرويد.

## 2) 👤 إضافة مفتاح الرفع إلى GitHub (مرة واحدة)
أرسلت إليك ملفات المفتاح بشكل خاص. **احفظها في مكان آمن (Google Drive مثلاً) — إذا ضاع المفتاح لا يمكن تحديث التطبيق إلا بطلب استبدال من Google.**

في المستودع على GitHub: **Settings ← Secrets and variables ← Actions ← New repository secret**، وأضف 4 أسرار:

| الاسم (Name) | القيمة (Secret) |
|---|---|
| `TABIB_KEYSTORE_BASE64` | محتوى الملف `TABIB_KEYSTORE_BASE64.txt` كاملاً |
| `TABIB_KEYSTORE_PASSWORD` | كلمة المرور من `passwords.txt` |
| `TABIB_KEY_PASSWORD` | نفس كلمة المرور |
| `TABIB_KEY_ALIAS` | `tabib` |

ثم: **Actions ← «طبيب الأعشاب — بناء تطبيق أندرويد» ← Run workflow** واختر الفرع `claude/comprehensive-medicine-app-6fe258`. بعد انتهاء البناء نزّل **tabib-al-aashab-aab-google-play** من Artifacts وفكّ الضغط لتحصل على `tabib-al-aashab.aab`.

> ملاحظة: بعد هذه الخطوة تصبح ملفات APK أيضاً موقّعة بالمفتاح الجديد، فإذا كنت ثبّت نسخة APK سابقاً احذفها مرة واحدة.

## 3) 👤 إنشاء التطبيق في Play Console
**Create app**:
- اسم التطبيق: `طبيب الأعشاب: الطب والأعشاب`
- اللغة الافتراضية: العربية (ar)
- App / Free (مجاني)
- وافق على الإقرارات.

## 4) صفحة المتجر (Grow ← Store presence ← Main store listing)
- انسخ الاسم والوصف القصير والكامل من `listing-ar.txt`.
- ارفع الأيقونة وصورة الغلاف ولقطات `ar-*.png` (من 2 إلى 8 لقطات).
- **Add translations ←** الفرنسية (fr-FR) والإنجليزية (en-US) وانسخ من `listing-fr.txt` و`listing-en.txt` مع لقطات `fr-*` و`en-*`.
- الفئة (Category): **Medical** أو **Health & Fitness** (أنصح بـ Medical لأنه موسوعة طبية).
- البريد الإلكتروني للتواصل: بريدك.

## 5) محتوى التطبيق (Policy ← App content) — الإجابات الجاهزة
| القسم | الإجابة |
|---|---|
| **Privacy policy** | الرابط: `https://github.com/lahoucineoujjamane-code/chanfana-openapi-template/blob/claude/comprehensive-medicine-app-6fe258/medicine-app/PRIVACY.md` (بعد دمج الفرع في main استبدل اسم الفرع بـ `main`) |
| **Ads** | No, my app does not contain ads |
| **App access** | All functionality is available without special access |
| **Content rating** | الفئة: Reference, News, or Educational — أجب «No» على كل أسئلة العنف والمحتوى الجنسي والقمار والمخدرات غير المشروعة والتواصل بين المستخدمين |
| **Target audience** | 18 سنة فأكثر (18+) — لتجنّب قيود تطبيقات الأطفال |
| **Data safety** | Does your app collect or share any of the required user data types? **No** (التطبيق لا يتصل بالإنترنت ولا يجمع بيانات) |
| **Advertising ID** | No |
| **Government apps** | No |
| **Financial features** | My app doesn't provide any financial features |
| **Health apps** | اختر: **Medical reference and education** (مرجع وتثقيف طبي) — و**Symptom checker** إن ظهر خياره |
| **News apps** | No |

> التطبيق يحتوي على تنبيه طبي واضح في الوصف وداخل كل صفحة، وهو ما تطلبه سياسة Google للتطبيقات الصحية.

## 6) رفع الملف والاختبار
1. **Testing ← Internal testing ← Create new release**: ارفع `tabib-al-aashab.aab`، ووافق على **Play App Signing** (الإعداد الافتراضي). أضف بريدك كمختبر وجرّب التثبيت من المتجر.
2. **Testing ← Closed testing ← Create track**: ارفع نفس الملف، أضف قائمة بريد الـ12 مختبراً، وأرسل لهم رابط الانضمام. يجب أن يبقوا مشتركين **14 يوماً**.
3. بعد 14 يوماً: **Dashboard ← Apply for production** وأجب عن أسئلة الاختبار.
4. بعد الموافقة: **Production ← Create new release** ← ارفع آخر AAB ← **Send for review**. المراجعة تستغرق عادة من يوم إلى 7 أيام.

## 7) (اختياري) رفع التحديثات تلقائياً من GitHub
بعد أول رفع يدوي، يمكن لسير العمل رفع كل نسخة جديدة تلقائياً كمسودة على مسار الاختبار الداخلي:
1. في https://console.cloud.google.com أنشئ مشروعاً، فعّل **Google Play Android Developer API**، ثم أنشئ **Service account** ونزّل مفتاحه بصيغة **JSON**.
2. في Play Console: **Users and permissions ← Invite new users** ← بريد حساب الخدمة ← امنحه صلاحية إدارة الإصدارات لهذا التطبيق.
3. في GitHub أضف السر `PLAY_SERVICE_ACCOUNT_JSON` بمحتوى ملف JSON كاملاً.
بعدها كل دفع (push) يبني النسخة ويرفعها تلقائياً، وتنشرها أنت بضغطة من Play Console.

---
### ⚠️ قبل النشر
- استبدل `CONTACT_EMAIL` في `PRIVACY.md` و`www/privacy.html` ببريد التواصل الذي تريد أن يظهر للعموم.
- اسم الحزمة `com.tabib.herbs` نهائي بعد أول رفع ولا يمكن تغييره. إذا رفض Play الاسم لأنه مستعمل، غيّر `applicationId` في `android/app/build.gradle.kts` (مثل `com.tabibalaashab.app`) وفي سير العمل.

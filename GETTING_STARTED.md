# 🚀 الخطوات الأولى - DWAP BSC Token

## في 5 دقائق فقط!

### 1️⃣ التثبيت (2 دقائق)

```bash
# انسخ الفولدر
cd DWAP_BSC_BEP20

# ثبت الاعتماديات
npm install

# أنسخ ملف الإعدادات
cp .env.example .env

# حرر .env بمفاتيحك
# (استخدم محرر نصوص أو nano .env)
```

### 2️⃣ الاختبار (2 دقائق)

```bash
# تجميع العقود
npm run compile

# تشغيل الاختبارات
npm run test

# إذا كل شيء ✅، تابع للخطوة التالية
```

### 3️⃣ النشر (1 دقيقة)

#### على Testnet (للتطوير)
```bash
npm run deploy:testnet
```

#### على Mainnet (للإطلاق الفعلي)
```bash
npm run deploy
```

---

## ماذا سيحدث بعد النشر؟

```
✅ نشر DWAP_Token
✅ نشر DWAP_Governor
✅ نشر DWAP_Timelock
✅ نشر DWAP_BurnController
✅ إعداد الأدوار والصلاحيات
✅ حفظ العناوين في ملف
```

---

## الملفات المهمة للقراءة

| الملف | المدة | الهدف |
|------|-------|-------|
| QUICK_REFERENCE.md | 5 دقائق | نظرة عامة سريعة |
| README.md | 10 دقائق | المزيد من التفاصيل |
| DOCUMENTATION_AR.md | 30 دقيقة | دليل شامل |
| FAQ_AR.md | 15 دقيقة | إجابات الأسئلة |

---

## الأوامر السريعة

```bash
# العرض والمعلومات
npm run info                    # عرض معلومات التوكن

# النشر والتحقق
npm run deploy:testnet         # نشر على Testnet
npm run deploy                 # نشر على Mainnet
npm run verify                 # تحقق من العقود

# الاختبار والتطوير
npm run compile                # تجميع
npm run test                   # اختبارات
npm run coverage               # تقرير التغطية
npm run flatten                # تسطيح العقود
```

---

## أول شيء بعد النشر

✅ **احفظ هذه البيانات:**
```
- جميع العناوين (من الـ output)
- Private key (بشكل آمن!)
- Transaction hashes
- Deployment time
```

✅ **تحقق من العقود:**
```bash
npx hardhat run scripts/info.js --network bsc
```

✅ **أضف السيولة:**
```
1. استخدم Pancakeswap أو منصة أخرى
2. أضف DWAP/BNB pair
3. أعلن عن الإطلاق
```

---

## 📸 إضافة لوجو التوكن

### الطريقة السريعة (بعد النشر)

1. **ارفع الصورة على Pinata.cloud**
   - سجّل حساب مجاني
   - ارفع صورة 256x256 بكسل
   - احصل على CID

2. **حدث العقد**
   ```bash
   # في DWAP_Token.sol، استبدل:
   LOGO_IPFS = "ipfs://[CID هنا]"
   LOGO_URI = "https://gateway.pinata.cloud/ipfs/[CID هنا]"
   ```

3. **اختبر اللوجو**
   ```javascript
   // في console
   await token.getLogoURI()  // يرجع رابط الصورة
   await token.getTokenInfo() // جميع معلومات التوكن
   ```

### مثال عملي
```
CID من Pinata: QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T

في العقد:
LOGO_IPFS = "ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T"
LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T"
```

**اقرأ المزيد**: `LOGO_SETUP_GUIDE.md` و `HOW_TO_GET_IPFS_URL.md`

---

## خريطة الطريق التالية

```
اليوم      → نشر على Testnet
أسبوع 1   → اختبارات وظائفية
أسبوع 2   → تدقيق أمني
أسبوع 3   → نشر على Mainnet
أسبوع 4   → إضافة السيولة
الشهر 2   → ترويج وحملات
```

---

## نصائح مهمة ⚠️

1. **Testnet أولاً**: دائماً اختبر على Testnet قبل Mainnet
2. **احفظ المفاتيح**: احفظ private key بشكل آمن (استخدم Vault أو محرك تشفير)
3. **تحقق من الأرصدة**: تأكد من وجود BNB كافي للنشر
4. **الأمان أولاً**: راجع الكود بعناية قبل الإطلاق
5. **الدعم متاح**: تواصل مع الفريق عند أي مشكلة

---

## الأخطاء الشائعة وحلولها

| الخطأ | السبب | الحل |
|------|------|------|
| `OutOfMemory` | ذاكرة ناقصة | زد حجم Node: `node --max-old-space-size=4096` |
| `Network Error` | لا اتصال | تحقق من RPC URL و internet |
| `Insufficient Balance` | أموال ناقصة | أضف BNB للمحفظة |
| `Invalid Private Key` | مفتاح خاطئ | تحقق من `.env` |
| `Compilation Failed` | خطأ في الكود | تحقق من الأخطاء والرسائل |

---

## أسئلة سريعة

**س: كم يستغرق النشر؟**  
ج: 5-10 دقائق على Mainnet

**س: كم تكلفة النشر؟**  
ج: ~0.5-1 BNB حسب أسعار الغاز

**س: هل يمكن نشر مرة أخرى؟**  
ج: نعم، على عناوين مختلفة

**س: كيف أحصل على تعليقات أمنية؟**  
ج: استخدم أدوات مثل Slither أو اطلب من متخصصين

---

## الموارد المفيدة

- [Hardhat Docs](https://hardhat.org/docs)
- [OpenZeppelin Docs](https://docs.openzeppelin.com)
- [Solidity Docs](https://docs.soliditylang.org)
- [BSC Docs](https://docs.binance.org)

---

## التواصل والدعم

أي سؤال؟
1. تحقق من `FAQ_AR.md`
2. اقرأ `DOCUMENTATION_AR.md`
3. شاهد `INTEGRATION_GUIDE.js` للأمثلة
4. تواصل مع الفريق

---

## ماذا بعد الإطلاق؟

```
✅ مراقبة النشاط
✅ دعم المجتمع
✅ إضافة السيولة
✅ ترويج العملة
✅ شراكات جديدة
✅ التوسع للسلاسل الأخرى
```

---

## 🎉 مبروك!

أنت الآن جاهز لإطلاق DWAP Token على BSC!

**تذكر:**
- تطور بسرعة
- اختبر بعناية
- أطلق بثقة
- تطور باستمرار

---

**آخر تحديث**: 16 أبريل 2026  
**الإصدار**: 1.0.0  
**حالة الاستعداد**: ✅ 100%

> حظاً موفقاً! 🚀

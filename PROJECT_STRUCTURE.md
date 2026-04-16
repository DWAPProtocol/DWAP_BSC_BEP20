# DWAP BSC BEP20 Token Project Structure

## المجلدات والملفات

```
DWAP_BSC_BEP20/
├── contracts/                      # عقود Solidity
│   ├── DWAP_Token.sol             # عقد التوكن الأساسي (BEP20)
│   ├── DWAP_BurnController.sol    # عقد التحكم في الحرق
│   ├── DWAP_Governor.sol          # عقد الحوكمة (DAO)
│   ├── DWAP_Timelock.sol          # عقد تأخير التنفيذ
│   ├── Proxies.sol                # بروكسيات UUPS
│   └── EXAMPLES_AND_GUIDE.sol     # أمثلة وأدلة
│
├── scripts/
│   ├── deploy.js                  # سكريبت النشر الرئيسي
│   └── info.js                    # سكريبت عرض المعلومات
│
├── test/
│   └── DWAP.test.js              # اختبارات Hardhat
│
├── deployments/
│   └── bsc-testnet.json          # عناوين آخر نشر على Testnet
│
├── artifacts/                      # عقود مترجمة محلياً (غير مرفوعة إلى Git)
├── cache/                          # ملفات التخزين المؤقت محلياً (غير مرفوعة إلى Git)
├── .tools/                         # أدوات محلية مؤقتة مثل Node portable (غير مرفوعة إلى Git)
│
├── hardhat.config.js              # إعدادات Hardhat
├── package.json                   # الاعتماديات والنصوص
├── .env.example                   # مثال على متغيرات البيئة
├── .env                          # متغيرات البيئة (لا ينسخ مع Git)
├── .gitignore                    # ملفات Git المتجاهلة
├── config.js                     # ملف الإعدادات
├── README.md                     # التوثيق الإنجليزية
├── DOCUMENTATION_AR.md           # التوثيق العربية
└── PROJECT_STRUCTURE.md          # هذا الملف
```

## ملفات مهمة

### العقود (contracts/)

**DWAP_Token.sol**
- عقد BEP20 الأساسي مع Governance و Burning
- 1 مليار توكن إجمالي العرض
- قابل للترقية عبر UUPS Proxy
- دعم التفويض والتصويت

**DWAP_BurnController.sol**
- إدارة عملية الحرق
- حدود يومية قابلة للتكوين
- تتبع إحصائيات الحرق
- قابل للترقية

**DWAP_Governor.sol**
- تطبيق OpenZeppelin Governor
- الحوكمة اللامركزية للـ DAO
- المعاملات:
  - تأخير التصويت: 48 ساعة
  - فترة التصويت: 1 أسبوع
  - النصاب: 4%
  - الموافقة: 50%+

**DWAP_Timelock.sol**
- تأخير 2 يوم قبل التنفيذ
- منع الإجراءات الفورية
- نظام الأدوار والصلاحيات

**Proxies.sol**
- UUPS Proxy لـ DWAP Token
- UUPS Proxy لـ Burn Controller
- تفعيل الترقية الآمنة

### السكريبتات (scripts/)

**deploy.js**
- نشر جميع العقود
- إعداد الأدوار والصلاحيات
- حفظ عناوين التوزيع المؤقتة
- الخطوات التالية

### ملفات النشر (deployments/)

**bsc-testnet.json**
- عناوين العقود المنشورة على BSC Testnet
- عنوان الناشر
- وقت النشر
- مناسب للرفع على GitHub كمرجع ثابت

**info.js**
- عرض معلومات التوكن
- معاملات الحوكمة
- معلومات Timelock

### الاختبارات (test/)

**DWAP.test.js**
- اختبار التوكن الأساسي
- اختبار الحرق
- اختبار التصويت
- اختبار Burn Controller

## الخطوات السريعة

### 1. الإعداد الأولي
```bash
# تثبيت الاعتماديات
npm install

# نسخ ملف الإعدادات
cp .env.example .env

# تحرير .env بمعلوماتك
nano .env  # أو استخدم محرر آخر
```

### 2. التطوير والاختبار
```bash
# تجميع العقود
npm run compile

# تشغيل الاختبارات
npm run test

# عرض تغطية الاختبارات
npm run coverage
```

### 3. النشر
```bash
# نشر على BSC Testnet
npm run deploy:testnet

# نشر على BSC Mainnet
npm run deploy
```

### 4. التحقق والمعلومات
```bash
# عرض معلومات التوزيع
npx hardhat run scripts/info.js --network bsc

# التحقق من العقود على BscScan
npm run verify -- <ADDRESS> "<CONSTRUCTOR_ARGS>"
```

## متغيرات البيئة (.env)

```bash
# شبكة RPC
BSC_RPC_URL=https://bsc-dataseed1.binance.org:443
BSC_TESTNET_RPC_URL=https://bsc-testnet-rpc.publicnode.com

# مفتاح النشر الخاص
PRIVATE_KEY=0x...

# مفتاح التحقق
BSCSCAN_API_KEY=...

# المالك الأولي
INITIAL_OWNER=0x...
```

## المعاملات الرئيسية

| المعامل | القيمة | الوحدة |
|---------|--------|--------|
| Max Supply | 1,000,000,000 | توكن |
| Initial Supply | 1,000,000,000 | توكن |
| Decimals | 18 | - |
| Voting Delay | 172,800 | ثانية (48 ساعة) |
| Voting Period | 604,800 | ثانية (7 أيام) |
| Proposal Threshold | 1 | توكن |
| Quorum | 4 | % |
| Timelock Delay | 172,800 | ثانية (2 يوم) |

## الأمان والتدقيق

- ✅ عقود OpenZeppelin معايرة
- ✅ نمط UUPS الآمن للترقية
- ✅ Timelock للحماية من الهجمات
- ✅ نظام تحكم قائم على الأدوار
- ⚠️ يتطلب تدقيقًا أمنيًا إضافيًا قبل الإطلاق على الشبكة الرئيسية

## المساهمة

عند إضافة ميزات جديدة:

1. نسخ فرع (Branch) جديد
2. تطوير الميزة
3. إضافة الاختبارات
4. فتح طلب سحب (PR)
5. مراجعة وتوافق

## الدعم

للمساعدة أو الأسئلة:
1. تحقق من التوثيق
2. شاهد الأمثلة في `EXAMPLES_AND_GUIDE.sol`
3. شغل الاختبارات للتأكد من الفهم
4. تواصل مع فريق التطوير

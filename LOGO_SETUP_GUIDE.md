# 📸 كيفية إضافة لوجو DWAP Token

## 🚀 الخطوات البسيطة

### 1. رفع الصورة على Pinata.cloud

1. **سجّل حساب** على [Pinata.cloud](https://pinata.cloud)
2. **ارفع الصورة** (PNG أو JPG، حجم 256x256 بكسل)
3. **احصل على CID** من لوحة التحكم

### 2. تحديث العقد

بعد رفع الصورة، ستحصل على:

```
CID: QmYourActualCIDHere123456789
HTTPS URL: https://gateway.pinata.cloud/ipfs/QmYourActualCIDHere123456789
IPFS URL: ipfs://QmYourActualCIDHere123456789
```

**استبدل في `DWAP_Token.sol`:**

```solidity
// في السطر 38-39
string public constant LOGO_IPFS = "ipfs://QmYourActualCIDHere123456789";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYourActualCIDHere123456789";
```

### 3. اختبار اللوجو

بعد النشر، يمكنك استدعاء:

```javascript
// في console أو script
const logoIPFS = await token.getLogoIPFS();     // "ipfs://QmYourCID"
const logoURI = await token.getLogoURI();       // "https://gateway.pinata.cloud/ipfs/QmYourCID"
const info = await token.getTokenInfo();         // جميع المعلومات
```

---

## 📋 مواصفات الصورة المثالية

- **الحجم**: 256x256 بكسل
- **التنسيق**: PNG مع خلفية شفافة
- **الحجم**: أقل من 1MB
- **الجودة**: عالية الدقة

---

## 🔄 تحديث اللوجو لاحقاً

إذا أردت تغيير اللوجو:

1. **ارفع الصورة الجديدة** على Pinata
2. **احصل على CID الجديد**
3. **انشر عقد جديد** (upgrade) مع CID الجديد
4. **أو أضف دالة** لتحديث اللوجو (إذا أردت)

---

## 💡 نصائح مهمة

- **IPFS لا مركزي**: اللوجو سيكون متاح دائماً
- **Gateway**: استخدم pinata.cloud أو ipfs.io
- **MetaMask**: سيعرض اللوجو تلقائياً
- **BscScan**: يدعم عرض اللوجو من URI

---

## 🎯 مثال عملي

```javascript
// بعد رفع الصورة
CID = "bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae"

// في العقد
LOGO_IPFS = "ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae"
LOGO_URI = "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae"

// في MetaMask
// Add Token → DWAP → Logo will appear automatically
```

---

## 🔍 أين تجد الـ IPFS URL؟

**في Pinata.cloud:**

1. **بعد رفع الصورة**، اضغط على الصورة
2. **ستجد:**
   - **CID**: `QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T`
   - **HTTPS**: `https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T`
   - **IPFS**: `ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T`

**الـ IPFS URL = `ipfs://` + CID**

---

**جاهز للاختبار!** 🚀

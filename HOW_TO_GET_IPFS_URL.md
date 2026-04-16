# 🔍 كيف تحصل على IPFS URL من Pinata

## 📋 الخطوات البسيطة

### 1. بعد رفع الصورة على Pinata

ستجد هذه المعلومات:

```
✅ CID: QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
✅ HTTPS URL: https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
❓ IPFS URL: مفقود؟
```

### 2. كيف تصنع IPFS URL بنفسك

**الصيغة البسيطة:**
```
IPFS URL = "ipfs://" + CID
```

**مثال:**
```
CID = QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
IPFS URL = ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
```

### 3. في لوحة Pinata

إذا كنت في لوحة Pinata، اضغط على الصورة وستجد:

- **CID**: مباشرة
- **Gateway URL**: HTTPS
- **IPFS URL**: مش موجود؟ اصنعه بنفسك!

---

## 🎯 مثال كامل

### ما ستحصل عليه من Pinata:
```
CID: QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
Gateway: https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
```

### ما تصنعه بنفسك:
```
IPFS URL: ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
```

### في العقد:
```solidity
string public constant LOGO_IPFS = "ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T";
```

---

## 💡 ملاحظة مهمة

**Pinata لا تعرض IPFS URL مباشرة**، لكنها سهلة التصنيع:

```
ipfs:// + CID = IPFS URL ✅
```

---

**الآن عرفت!** 🚀
# 🔧 سكريبت تحديث CID اللوجو

## 📋 كيفية تحديث CID في العقد

### 1. افتح DWAP_Token.sol

```bash
# في مجلد contracts
nano DWAP_Token.sol
```

### 2. ابحث عن هذه الأسطر (حوالي السطر 38-39)

```solidity
string public constant LOGO_IPFS = "ipfs://QmYourCIDHere";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYourCIDHere";
```

### 3. استبدل بالـ CID الحقيقي

```solidity
// مثال:
string public constant LOGO_IPFS = "ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T";
```

### 4. احفظ الملف وأعد النشر

```bash
npm run compile
npm run deploy:testnet  # أو deploy للـ mainnet
```

---

## 🎯 مثال كامل

### قبل التحديث:
```solidity
string public constant LOGO_IPFS = "ipfs://QmYourCIDHere";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/QmYourCIDHere";
```

### بعد التحديث:
```solidity
string public constant LOGO_IPFS = "ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
```

---

## ⚠️ ملاحظات مهمة

- **CID مختلف عن HTTPS URL**
- **IPFS URL = `ipfs://` + CID**
- **HTTPS URL تأتي من Pinata مباشرة**
- **بعد التحديث، أعد النشر**

---

## 🚀 بعد النشر الجديد

```javascript
// اختبر اللوجو الجديد
const logoIPFS = await token.getLogoIPFS();
console.log(logoIPFS); // ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T
```

---

**جاهز للتحديث!** 🚀
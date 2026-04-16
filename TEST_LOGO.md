# 🧪 اختبار سريع للوجو DWAP Token

## 📋 اختبار اللوجو بعد النشر

### 1. افتح Hardhat Console

```bash
npx hardhat console --network bscTestnet
```

### 2. احصل على عقد DWAP Token

```javascript
// استبدل بالعنوان الحقيقي بعد النشر
const tokenAddress = "0xYourTokenAddressHere";
const DWAPToken = await ethers.getContractFactory("DWAP_Token");
const token = DWAPToken.attach(tokenAddress);
```

### 3. اختبر دوال اللوجو

```javascript
// اختبار IPFS URL
const logoIPFS = await token.getLogoIPFS();
console.log("IPFS Logo:", logoIPFS);

// اختبار HTTPS URL
const logoURI = await token.getLogoURI();
console.log("HTTPS Logo:", logoURI);

// اختبار جميع المعلومات
const tokenInfo = await token.getTokenInfo();
console.log("Token Info:", tokenInfo);
```

### 4. النتيجة المتوقعة

```javascript
IPFS Logo: ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae
HTTPS Logo: https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae
Token Info: [
  "DWAP Token",           // name
  "DWAP",                 // symbol
  18n,                    // decimals
  1000000000000000000000000000n, // totalSupply
  "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae", // logoURI
  "https://dwap-token.com", // website
  "DWAP is a governance token..." // description
]
```

---

## 🎯 كيفية التحقق من أن اللوجو يعمل

### في MetaMask
1. **Add Token** → Custom Token
2. **أدخل عنوان DWAP Token**
3. **اضغط Add** → سيظهر اللوجو تلقائياً

### في BscScan
1. **اذهب لعقد DWAP Token**
2. **اضغط على Contract** → Read Contract
3. **استدعِ `getLogoURI()`** → ستحصل على رابط الصورة

---

## 🔧 إذا لم يظهر اللوجو

### المشاكل الشائعة:

1. **CID خاطئ**
   ```
   ❌ LOGO_IPFS = "ipfs://wrongCID"
   ✅ LOGO_IPFS = "ipfs://QmYwAPJzv5CZsnAzt7HbkPqZGfFefTByebodF4yUCqxm1T"
   ```

2. **لم يتم تحديث العقد**
   ```
   تأكد من إعادة النشر بعد تحديث CID
   ```

3. **صورة كبيرة جداً**
   ```
   تأكد من أن الصورة أقل من 1MB
   ```

---

## 🚀 اختبار كامل

```javascript
// نسخ ولصق هذا الكود في console
const testLogo = async () => {
  const tokenAddress = "0xYourTokenAddressHere";
  const DWAPToken = await ethers.getContractFactory("DWAP_Token");
  const token = DWAPToken.attach(tokenAddress);

  console.log("🧪 Testing DWAP Token Logo...");

  const logoIPFS = await token.getLogoIPFS();
  const logoURI = await token.getLogoURI();
  const tokenInfo = await token.getTokenInfo();

  console.log("✅ IPFS Logo:", logoIPFS);
  console.log("✅ HTTPS Logo:", logoURI);
  console.log("✅ Token Info:", tokenInfo);

  console.log("🎉 Logo test completed!");
};

testLogo();
```

---

**جاهز للاختبار!** 🚀
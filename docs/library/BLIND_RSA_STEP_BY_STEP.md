# Blind RSA Signatures - Complete System Flow (Corrected)

**Purpose**: Step-by-step explanation following **actual code execution order** with **concrete data types**

**Library**: @cloudflare/blindrsa-ts | **Variant**: RSABSSA-SHA384-PSS-Randomized

---

## System Phases (Correct Order)

```
Phase 0: Admin Creates Campaign → Generate Key Pairs
Phase 1: Student Login → Blind Token Signature
Phase 2: Student Completes Survey → Encrypt Responses
Phase 3: Student Submits → Blind Receipt Signature
Phase 4: Student Claims → Verify Receipt
```

---

## PHASE 0: Campaign Creation - Key Pair Generation

**Location**: `server/src/services/campaign.service.ts:87-171`

### Step 0.1: Generate Blind Signature Key Pair

**Code** (campaign.service.ts:96-101):
```typescript
const blindSuite = RSABSSA.SHA384.PSS.Randomized();
const { privateKey: blindSignaturePrivateKey, publicKey: blindSignaturePublicKey } =
  await blindSuite.generateKey({
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1])
  });
```

**What is `generateKey()`?**
- Calls WebCrypto API: `crypto.subtle.generateKey()`
- Generates RSA key pair using **probabilistic algorithm**

**Input Parameters**:
```javascript
{
  modulusLength: 2048,              // Key size in bits
  publicExponent: [1, 0, 1]         // = 65537 in decimal
}
```

**What is `publicExponent: [1, 0, 1]`?**
- Uint8Array representation of number 65537
- Calculation: `1×256² + 0×256¹ + 1×256⁰ = 65536 + 0 + 1 = 65537`
- Why 65537? Common choice (prime number, efficient for modular exponentiation)

**Output - What do these keys look like?**

```javascript
// Type: CryptoKey (WebCrypto object)
blindSignaturePrivateKey = {
  type: "private",
  extractable: true,
  algorithm: {
    name: "RSA-PSS",
    modulusLength: 2048,
    publicExponent: Uint8Array(3) [1, 0, 1],
    hash: { name: "SHA-384" }
  },
  usages: ["sign"]
}

blindSignaturePublicKey = {
  type: "public",
  extractable: true,
  algorithm: {
    name: "RSA-PSS",
    modulusLength: 2048,
    publicExponent: Uint8Array(3) [1, 0, 1],
    hash: { name: "SHA-384" }
  },
  usages: ["verify"]
}
```

**Note**: The actual key material (n, d, p, q) is **inside** the CryptoKey object, not directly accessible

### Step 0.2: Export Keys to Store in Database

**Code** (campaign.service.ts:117-120):
```typescript
const blindPrivateKey = await webcrypto.subtle.exportKey('pkcs8', blindSignaturePrivateKey);
const blindPublicKey = await webcrypto.subtle.exportKey('spki', blindSignaturePublicKey);
```

**What is `exportKey()`?**
- Converts CryptoKey object → binary format (ArrayBuffer)
- `'pkcs8'`: Private Key format (PKCS #8)
- `'spki'`: Public Key format (SubjectPublicKeyInfo)

**Output - What do exported keys look like?**

```javascript
// Type: ArrayBuffer
blindPrivateKey = ArrayBuffer(1214)
// Binary data (not human-readable):
// [0x30, 0x82, 0x04, 0xbb, 0x02, 0x01, 0x00, ...]
// Length: ~1214 bytes for 2048-bit RSA private key

blindPublicKey = ArrayBuffer(294)
// Binary data:
// [0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, ...]
// Length: ~294 bytes for 2048-bit RSA public key
```

**What is PKCS #8 / SPKI format?**
- Industry-standard binary encoding for keys
- Contains: algorithm identifier + actual key data
- Structure: ASN.1 DER encoding (complex nested format)

### Step 0.3: Convert to Base64 for Database Storage

**Code** (campaign.service.ts:138-141):
```typescript
Buffer.from(blindPublicKey).toString('base64'),
Buffer.from(encryptionPublicKeyExported).toString('base64'),
Buffer.from(blindPrivateKey).toString('base64'),
```

**What is `Buffer.from().toString('base64')`?**

**Step-by-step**:
```javascript
// Step 1: ArrayBuffer → Buffer (Node.js)
Buffer.from(blindPublicKey)
// Result: Buffer containing same binary data

// Step 2: Buffer → Base64 string
.toString('base64')
// Result: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw3..."
```

**What is Base64?**
- Encoding scheme: converts binary → ASCII text
- Uses 64 characters: A-Z, a-z, 0-9, +, /
- Every 3 bytes → 4 characters
- Example:
  ```
  Binary:  [0x4D, 0x61, 0x6E]  (3 bytes = "Man" in ASCII)
  Base64:  "TWFu"              (4 characters)
  ```

**Final stored value** (campaign.service.ts:138):
```javascript
// Stored in PostgreSQL as TEXT
blind_signature_public_key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw3G..."
// Length: ~392 characters (base64 encoding of 294 bytes)
```

### Step 0.4: Generate Encryption Key Pair (Separate!)

**Code** (campaign.service.ts:104-114):
```typescript
const { privateKey: encryptionPrivateKey, publicKey: encryptionPublicKey } =
  await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",           // Different algorithm!
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",            // Different hash!
    },
    true,
    ["encrypt", "decrypt"]        // Different purpose!
  );
```

**Why TWO key pairs?**

| Key Pair | Algorithm | Hash | Purpose | Used In |
|----------|-----------|------|---------|---------|
| **Blind Signature Keys** | RSA-PSS | SHA-384 | Sign blinded tokens/receipts | Phase 1 & 3 |
| **Encryption Keys** | RSA-OAEP | SHA-256 | Encrypt/decrypt survey responses | Phase 2 |

**Different algorithms for different security properties!**

---

## PHASE 1: Student Login - Blind Token Signature

**Location**: `client/src/app/login/student/page.tsx` (not shown but similar flow)

### Step 1.1: Server Sends Public Keys to Client

**What client receives**:
```javascript
{
  blindSignaturePublicKey: "MIIBIjANBgkqhkiG9w0BAQE...",  // base64 string
  encryptionPublicKey: "MIIBIjANBgkqhkiG9w0BAQE..."      // base64 string
}
```

### Step 1.2: Student Enters Token

**User Input**:
```javascript
token = "abc123def456"  // string, 12 characters
```

### Step 1.3: Convert Token String to Bytes

**Code** (blindSignatures.ts:196):
```typescript
const tokenMessage = new TextEncoder().encode(token);
```

**What is `TextEncoder`?**
- Browser/Node.js API for text → bytes conversion
- Uses UTF-8 encoding by default

**What is UTF-8?**
- Character encoding standard
- ASCII characters (a-z, 0-9) = 1 byte each
- Special characters may be 2-4 bytes

**Example - Character by Character**:
```javascript
token = "abc123def456"

// Step 1: Each character → UTF-8 code point
'a' → 0x61 (97 decimal)
'b' → 0x62 (98 decimal)
'c' → 0x63 (99 decimal)
'1' → 0x31 (49 decimal)
'2' → 0x32 (50 decimal)
'3' → 0x33 (51 decimal)
'd' → 0x64 (100 decimal)
'e' → 0x65 (101 decimal)
'f' → 0x66 (102 decimal)
'4' → 0x34 (52 decimal)
'5' → 0x35 (53 decimal)
'6' → 0x36 (54 decimal)

// Step 2: Result
tokenMessage = Uint8Array(12) [97, 98, 99, 49, 50, 51, 100, 101, 102, 52, 53, 54]
```

**Type**: `Uint8Array(12)` - Array of 12 unsigned 8-bit integers (bytes)

### Step 1.4: Prepare Message (Add Random Prefix)

**Code** (blindrsa.js:29-32):
```javascript
prepare(msg) {
  const msg_prefix_len = this.params.prepareType;  // = 32
  const msg_prefix = crypto.getRandomValues(new Uint8Array(msg_prefix_len));
  return joinAll([msg_prefix, msg]);
}
```

**Input**: `tokenMessage` = 12 bytes

**Step 1.4a: Generate Random Prefix**:
```javascript
// Create empty array
new Uint8Array(32)
// Result: [0, 0, 0, 0, ..., 0]  (32 zeros)

// Fill with random values
crypto.getRandomValues(...)
// Result: [183, 42, 255, 17, 90, 234, 12, 88, ...]  (32 random bytes)
```

**What is `crypto.getRandomValues()`?**
- Browser/Node.js cryptographic random number generator
- Uses OS entropy sources (hardware RNG, mouse movement, keyboard timing, etc.)
- Each call produces **different** random values
- Range: 0-255 for each byte

**Step 1.4b: Concatenate Arrays**:
```javascript
joinAll([msg_prefix, msg])

// Input arrays:
msg_prefix = [183, 42, 255, ..., 67]      (32 bytes)
msg        = [97, 98, 99, ..., 54]        (12 bytes)

// Output:
preparedMsg = [183, 42, 255, ..., 67, 97, 98, 99, ..., 54]  (44 bytes)
```

**Type**: `Uint8Array(44)` - 32 random + 12 token = 44 bytes total

### Step 1.5: Import Public Key from Base64

**Code** (blindSignatures.ts:95-125):
```typescript
static async importPublicKey(keyData: string, keyType: 'blindSignature'): Promise<CryptoKey> {
  // Step 1: Decode base64 to binary
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  // Step 2: Import into WebCrypto
  return await window.crypto.subtle.importKey(
    "spki",
    binaryKey,
    { name: "RSA-PSS", hash: "SHA-384" },
    true,
    ["verify"]
  );
}
```

**What is `atob()`?**
- "ASCII to Binary"
- Decodes base64 string → binary string

**Example**:
```javascript
// Input (base64):
keyData = "TWFu"

// Step 1: atob() decodes to binary string
atob("TWFu") = "Man"  // (string with 3 characters)

// Step 2: Convert each character to byte value
Uint8Array.from("Man", c => c.charCodeAt(0))
// 'M'.charCodeAt(0) = 77
// 'a'.charCodeAt(0) = 97
// 'n'.charCodeAt(0) = 110
// Result: Uint8Array(3) [77, 97, 110]
```

**For actual public key**:
```javascript
keyData = "MIIBIjANBgkqhkiG9w0BAQE..."  (392 chars)
  ↓ atob()
binaryString = (binary data, 294 characters)
  ↓ Uint8Array.from()
binaryKey = Uint8Array(294) [48, 130, 1, 34, 48, 13, ...]
  ↓ importKey()
publicKey = CryptoKey { type: "public", algorithm: { name: "RSA-PSS", ... } }
```

### Step 1.6: Call Blind Function

**Code** (blindrsa.js:52-93):
```typescript
async blind(publicKey, msg) {
  // Extract n, e from public key
  const { jwkKey, modulusLengthBytes: kLen } = await this.extractKeyParams(publicKey, 'public');
  const n = sjcl.bn.fromBits(...);
  const e = sjcl.bn.fromBits(...);

  // PSS encode
  const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);

  // Convert to big integer
  const m = os2ip(encoded_msg);

  // Generate random blinding factor
  const r = random_integer_uniform(n, kLen);

  // Compute inverse
  const inv = r.inverseMod(n);

  // Compute x = r^e mod n
  const x = rsavp1(pk, r);

  // Blind: z = m * x mod n
  const z = m.mulmod(x, n);

  // Convert to bytes
  const blindedMsg = i2osp(z, kLen);

  return { blindedMsg, inv };
}
```

I'll continue with the remaining phases showing encryption and TextEncoder usage...

---

## PHASE 2: Survey Response Encryption

### Step 2.1: Format Answer String

**Code** (client survey page, line 166-171):
```typescript
const answersArray = [5, 4, 3, 5, 4, ...];  // 25 numbers (1-5)
const answerString = formatAnswerString(
  survey.id,        // "550e8400-e29b-41d4-a716-446655440000"
  survey.courseCode, // "CS101"
  survey.teacherId,  // "t123"
  answersArray       // [5, 4, 3, 5, 4, ...]
);
```

**What is `formatAnswerString()`?**
```typescript
function formatAnswerString(surveyId, courseCode, teacherId, answers) {
  return `${surveyId}|${courseCode}|${teacherId}|${answers.join('')}`;
}
```

**Result**:
```javascript
answerString = "550e8400-e29b-41d4-a716-446655440000|CS101|t123|5435421354..."
// Type: string
// Length: ~100 characters
```

### Step 2.2: Convert Answer String to Bytes

**Code** (blindSignatures.ts:82):
```typescript
const encoder = new TextEncoder();
const data = encoder.encode(answer);
```

**Character-by-character breakdown**:
```javascript
answerString = "550e8400|CS101|t123|54354..."

// TextEncoder converts each character to UTF-8 byte:
'5' → 53
'5' → 53
'0' → 48
'e' → 101
'8' → 56
'4' → 52
'0' → 48
'0' → 48
'|' → 124
'C' → 67
'S' → 83
'1' → 49
'0' → 48
'1' → 49
... and so on

// Result:
data = Uint8Array(100) [53, 53, 48, 101, 56, 52, 48, 48, 124, 67, 83, 49, 48, 49, ...]
```

### Step 2.3: Encrypt with RSA-OAEP

**Code** (blindSignatures.ts:85-91):
```typescript
return await window.crypto.subtle.encrypt(
  {
    name: "RSA-OAEP"
  },
  publicKey,      // Encryption public key from Phase 0
  data            // Uint8Array from Step 2.2
);
```

**Output**:
```javascript
encryptedAnswer = ArrayBuffer(256)  // 256 bytes for 2048-bit RSA
// Binary ciphertext (random-looking bytes):
// [0x8f, 0x23, 0xb7, 0x4a, ...]
```

**This encrypted data is stored in database** - only admin with private key can decrypt!

---

## Summary: Complete Data Flow

```
PHASE 0 (Server):
  Generate RSA keys
    → CryptoKey objects
    → Export to ArrayBuffer (PKCS#8/SPKI format)
    → Convert to base64 string
    → Store in PostgreSQL

PHASE 1 (Client):
  Token string "abc123"
    → TextEncoder → Uint8Array(6) [97, 98, 99, 49, 50, 51]
    → Add 32 random bytes → Uint8Array(38)
    → PSS encode → Uint8Array(255)
    → Convert to big integer → sjcl.bn
    → Blind with r → sjcl.bn
    → Convert to bytes → Uint8Array(256)
    → Send to server

PHASE 2 (Client):
  Answer string "surveyId|course|teacher|54354..."
    → TextEncoder → Uint8Array(~100)
    → RSA-OAEP encrypt → ArrayBuffer(256)
    → Store in sessionStorage
```

**Key Insight**:
- **TextEncoder** = string → bytes (UTF-8 encoding)
- **Base64** = binary → ASCII text (for storage/transmission)
- **Keys** generated once at campaign creation, distributed to clients

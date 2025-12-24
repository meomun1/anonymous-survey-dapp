# Blind RSA Signatures - Complete Protocol Walkthrough

**Purpose**: Step-by-step explanation of @cloudflare/blindrsa-ts with **actual data types** and **concrete examples**

**Variant**: RSABSSA-SHA384-PSS-Randomized (RFC-9474 compliant)

---

## Protocol Overview

```
Setup:    Server generates key pair → distributes public key
Step 1:   Client prepares and blinds message → sends blinded_msg
Step 2:   Server signs blinded_msg → returns blind_sig
Step 3:   Client unblinds → obtains final signature
Step 4:   Anyone verifies signature with public key
```

---

## Data Types Reference

| Type | Description | Example Size |
|------|-------------|--------------|
| **string** | JavaScript text | Variable |
| **Uint8Array** | Array of bytes (0-255) | Variable |
| **ArrayBuffer** | Raw memory buffer | Variable |
| **CryptoKey** | WebCrypto key object | N/A (opaque) |
| **sjcl.bn** | Big integer (for RSA math) | 2048 bits |

---

## SETUP: Generate Server Key Pair

### Code (from README.md:90-96)

```typescript
const suite = RSABSSA.SHA384.PSS.Randomized();
const { privateKey, publicKey } = await suite.generateKey({
    publicExponent: Uint8Array.from([1, 0, 1]),
    modulusLength: 2048,
});
```

### Input Parameters Explained

**publicExponent: `Uint8Array.from([1, 0, 1])`**

What is this?
- Creates array: `Uint8Array(3) [1, 0, 1]`
- Represents number: `1×256² + 0×256¹ + 1×256⁰ = 65536 + 0 + 1 = 65537`
- Why 65537? Standard choice (Fermat prime F₄ = 2¹⁶ + 1), efficient for operations

**modulusLength: `2048`**
- Key size in bits
- Results in 256-byte (2048-bit) RSA operations

### What `generateKey()` Actually Does

**Internal process** (calls WebCrypto API):
```typescript
crypto.subtle.generateKey({
  name: "RSA-PSS",
  modulusLength: 2048,
  publicExponent: Uint8Array([1, 0, 1]),
  hash: "SHA-384"
}, true, ["sign", "verify"])
```

**What happens**:
1. Generate two random large primes p and q (~1024 bits each)
2. Compute n = p × q (the modulus, ~2048 bits)
3. Compute φ(n) = (p-1)(q-1)
4. Public exponent e = 65537 (given)
5. Compute private exponent d where e×d ≡ 1 (mod φ(n))

### Output - Key Structure

**privateKey** (CryptoKey object):
```javascript
{
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
```

**Internal data** (not directly visible, accessed via exportKey):
- **n**: modulus (~617 decimal digits)
- **e**: public exponent (65537)
- **d**: private exponent (~617 decimal digits)
- **p, q**: prime factors (~309 decimal digits each)
- **dP, dQ, qInv**: CRT parameters (optimization)

**publicKey** (CryptoKey object):
```javascript
{
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

**Internal data**:
- **n**: modulus (same as private key)
- **e**: public exponent (65537)

**Server distributes publicKey to clients** (via API, config, etc.)

---

## STEP 1 (Client): Prepare and Blind Message

### Step 1.1: Start with Original Message

**Code** (README.md:109):
```typescript
const msgString = 'Alice and Bob';
```

**Type**: `string` (13 characters)

### Step 1.2: Convert String to Bytes

**Code** (README.md:110):
```typescript
const message = new TextEncoder().encode(msgString);
```

**What is `TextEncoder`?**
- Browser/Node.js built-in API
- Converts JavaScript string → UTF-8 encoded bytes
- UTF-8: Variable-length encoding (ASCII chars = 1 byte, others = 2-4 bytes)

**Character-by-character conversion**:
```javascript
msgString = 'Alice and Bob'

// Each character → UTF-8 byte value:
'A' → 65   (0x41)
'l' → 108  (0x6C)
'i' → 105  (0x69)
'c' → 99   (0x63)
'e' → 101  (0x65)
' ' → 32   (0x20)
'a' → 97   (0x61)
'n' → 110  (0x6E)
'd' → 100  (0x64)
' ' → 32   (0x20)
'B' → 66   (0x42)
'o' → 111  (0x6F)
'b' → 98   (0x62)

// Result:
message = Uint8Array(13) [65, 108, 105, 99, 101, 32, 97, 110, 100, 32, 66, 111, 98]
```

**Type**: `Uint8Array(13)` - 13 bytes

### Step 1.3: Prepare Message (Add Random Prefix)

**Code** (README.md:111):
```typescript
const preparedMsg = suite.prepare(message);
```

**What happens inside `prepare()`** (blindrsa.js:29-32):
```typescript
prepare(msg) {
  const msg_prefix_len = this.params.prepareType;  // = 32 for Randomized variant
  const msg_prefix = crypto.getRandomValues(new Uint8Array(msg_prefix_len));
  return joinAll([msg_prefix, msg]);
}
```

**Step-by-step**:

**1. Determine prefix length**:
```javascript
this.params.prepareType = PrepareType.Randomized = 32  // (from blindrsa.js:8)
```

**2. Generate random prefix**:
```javascript
// Create empty array with 32 slots
new Uint8Array(32)
// Result: [0, 0, 0, 0, ..., 0]  (32 zeros)

// Fill with cryptographically secure random values
crypto.getRandomValues(...)
// Result: [183, 42, 255, 17, 90, 234, 12, 88, 201, 43, 167, 22, ...]  (32 random bytes)
```

**What is `crypto.getRandomValues()`?**
- WebCrypto API function
- Generates cryptographically secure random numbers
- Sources: OS entropy pool (hardware RNG, system events, etc.)
- Each byte: random value 0-255
- **Different every time** - critical for security!

**3. Concatenate prefix + message**:
```javascript
joinAll([msg_prefix, msg])

// Input:
msg_prefix = [183, 42, 255, 17, ..., 22]     (32 bytes)
msg        = [65, 108, 105, 99, ..., 98]     (13 bytes)

// Output:
preparedMsg = [183, 42, 255, 17, ..., 22, 65, 108, 105, 99, ..., 98]  (45 bytes)
```

**What is `joinAll()`?** (util.js:36-48)
- Concatenates multiple Uint8Arrays into one
- Creates new array, copies data sequentially

**Type**: `Uint8Array(45)` - 32 random prefix + 13 message = 45 bytes

**Why add random prefix?**
- Prevents deterministic signatures (same message → different blinded values)
- Defeats dictionary attacks
- RFC-9474 requirement for Randomized variant

### Step 1.4: Blind the Prepared Message

**Code** (README.md:112):
```typescript
const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
```

**What happens inside `blind()`** (blindrsa.js:52-93):

**Step 1.4a: Extract key parameters**:
```typescript
const { jwkKey, modulusLengthBits, modulusLengthBytes: kLen, hash } =
  await this.extractKeyParams(publicKey, 'public');

const n = sjcl.bn.fromBits(sjcl.codec.base64url.toBits(jwkKey.n));
const e = sjcl.bn.fromBits(sjcl.codec.base64url.toBits(jwkKey.e));
```

**What is JWK (JSON Web Key)?**
- Standard format for representing cryptographic keys
- Exported from CryptoKey object

**Example JWK structure**:
```json
{
  "kty": "RSA",
  "n": "xGOr-H7A-wiuZZms...bPZL8kw",    // Modulus (base64url, ~344 chars)
  "e": "AQAB",                           // Exponent (base64url, = 65537)
  "alg": "PS384",
  "ext": true
}
```

**Conversion process**:
```javascript
// 1. Export CryptoKey to JWK format
jwkKey = await crypto.subtle.exportKey('jwk', publicKey);

// 2. jwkKey.n is base64url string → decode to bits → convert to big integer
jwkKey.n = "xGOr-H7A..."
  → sjcl.codec.base64url.toBits(...)
  → array of 32-bit integers
  → sjcl.bn.fromBits(...)
  → big integer n

// 3. Same for e
jwkKey.e = "AQAB"  // base64url encoding of [1, 0, 1]
  → decode → big integer 65537
```

**Result**:
```javascript
n = sjcl.bn (huge number, 2048 bits, ~617 decimal digits)
e = sjcl.bn (small number, 65537)
kLen = 256  // bytes (2048 bits ÷ 8)
```

**Step 1.4b: EMSA-PSS-ENCODE**:
```typescript
const opts = { sLen: this.params.saltLength, hash: 'SHA-384' };
const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);
```

**What is EMSA-PSS-ENCODE?**
- **E**ncoding **M**ethod for **S**ignatures with **A**ppendix - **P**robabilistic **S**ignature **S**cheme
- RFC-8017 standard padding scheme for RSA signatures
- Transforms variable-length message → fixed-length encoded value

**Process**:
```
1. Hash message with SHA-384 → mHash (48 bytes)
2. Generate random salt (sLen bytes, typically 48 for SHA-384)
3. Hash again: H = Hash(0x00...00 || mHash || salt)
4. Generate mask using MGF1: maskedDB = DB ⊕ MGF1(H)
5. Combine: encoded_msg = maskedDB || H || 0xbc
```

**Input**: `preparedMsg` (45 bytes)

**Output**: `encoded_msg` (255 bytes for 2048-bit RSA)

**Why 255 bytes?**
- RSA modulus is 2048 bits = 256 bytes
- PSS requires leading bit = 0, so max value is 2047 bits = 255.875 bytes
- Library uses 255 bytes (2040 bits)

**Type**: `Uint8Array(255)`

**Step 1.4c: Convert to big integer**:
```typescript
const m = os2ip(encoded_msg);
```

**What is `os2ip()`?** (util.js:21-23)
- **O**ctet **S**tring **to** **I**nteger **P**rimitive
- Converts byte array → big integer (big-endian)

**How it works**:
```javascript
// Example with small array:
bytes = [0x01, 0x02, 0x03]

// Conversion:
result = 0x01 × 256² + 0x02 × 256¹ + 0x03 × 256⁰
       = 1 × 65536 + 2 × 256 + 3 × 1
       = 65536 + 512 + 3
       = 66051
```

**For our 255-byte encoded_msg**:
```javascript
m = sjcl.bn (huge number, up to 2040 bits, ~614 decimal digits)
```

**Step 1.4d: Check coprimality**:
```typescript
const c = is_coprime(m, n);
if (!c) {
  throw new Error('invalid input');
}
```

**What is coprime?**
- Two numbers are coprime if gcd(m, n) = 1
- Ensures m and n share no common factors
- Required for blinding to work correctly
- Very unlikely to fail with random m

**Step 1.4e: Generate random blinding factor**:
```typescript
const r = random_integer_uniform(n, kLen);
```

**What does this do?**
- Generates random big integer: 1 < r < n
- Uses rejection sampling (generate random bytes, convert to integer, retry if ≥ n)

**Result**:
```javascript
r = sjcl.bn (random number, ~2048 bits, ~617 decimal digits)
```

**This is the "blinding factor" - the secret that creates unlinkability!**

**Step 1.4f: Compute modular inverse**:
```typescript
let inv;
try {
  inv = i2osp(r.inverseMod(n), kLen);
} catch (e) {
  throw new Error(`blinding error: ${e.toString()}`);
}
```

**What is `r.inverseMod(n)`?**
- Finds r⁻¹ such that: r × r⁻¹ ≡ 1 (mod n)
- Uses Extended Euclidean Algorithm

**Example with small numbers**:
```javascript
n = 11
r = 3

// Find r⁻¹ where (3 × r⁻¹) mod 11 = 1
// Try values: 3×1=3, 3×2=6, 3×3=9, 3×4=12 mod 11 = 1 ✓
// So r⁻¹ = 4

// Verify: (3 × 4) mod 11 = 12 mod 11 = 1 ✓
```

**What is `i2osp()`?** (util.js:24-31)
- **I**nteger **to** **O**ctet **S**tring **P**rimitive
- Converts big integer → byte array (big-endian, fixed length)

**Result**:
```javascript
inv = Uint8Array(256)  // 256 bytes representing r⁻¹
```

**Step 1.4g: Compute x = r^e mod n**:
```typescript
const x = rsavp1(pk, r);
```

**What is `rsavp1()`?**
- **RSA** **V**erification **P**rimitive (RFC-8017)
- Computes: x = r^e mod n
- Uses modular exponentiation

**Mathematical operation**:
```javascript
x = (r^65537) mod n
```

**Why compute r^e?**
- This creates the "blinding mask"
- Will be multiplied with message to blind it

**Result**:
```javascript
x = sjcl.bn (huge number, < n)
```

**Step 1.4h: Blind the message**:
```typescript
const z = m.mulmod(x, n);
```

**What is `mulmod()`?**
- Modular multiplication: (m × x) mod n

**Mathematical operation**:
```javascript
z = (m × x) mod n
  = (m × r^e) mod n     // This is the BLINDED message!
```

**Critical insight**:
- Server will sign z to get z^d
- z^d = (m × r^e)^d = m^d × r^(e×d) = m^d × r  (since e×d ≡ 1 in RSA)
- Later multiply by r⁻¹ to get m^d (valid signature!)

**Result**:
```javascript
z = sjcl.bn (huge number, < n)
```

**Step 1.4i: Convert to bytes**:
```typescript
const blindedMsg = i2osp(z, kLen);
```

**Result**:
```javascript
blindedMsg = Uint8Array(256)  // 256 bytes
// Looks like random data: [0x8f, 0x23, 0xb7, 0x4a, ...]
```

### Step 1.5: Send to Server

**Client sends**: `blindedMsg` (Uint8Array, 256 bytes)

**Client keeps secret**: `inv` (Uint8Array, 256 bytes) and `preparedMsg` (Uint8Array, 45 bytes)

**Server CANNOT determine**:
- Original message
- Original preparedMsg
- What the blinded value represents

---

## STEP 2 (Server): Sign Blinded Message

**Code** (README.md:122):
```typescript
const blindSignature = await suite.blindSign(privateKey, blindedMsg);
```

**What happens inside `blindSign()`** (blindrsa.js:95-120):

**Step 2.1: Convert bytes to integer**:
```typescript
const m = os2ip(blindMsg);
```

**Result**:
```javascript
m = sjcl.bn (represents z = blinded message)
```

**Step 2.2: Sign with private key**:
```typescript
const s = rsasp1(sk, m);
```

**What is `rsasp1()`?**
- **RSA** **S**igning **P**rimitive (RFC-8017)
- Computes: s = m^d mod n
- Uses private exponent d

**Mathematical operation**:
```javascript
s = m^d mod n
  = (z)^d mod n
  = (m × r^e)^d mod n
  = m^d × (r^e)^d mod n
  = m^d × r^(e×d) mod n
  = m^d × r mod n        // because e×d ≡ 1 (mod φ(n)) in RSA
```

**Result**:
```javascript
s = sjcl.bn (blind signature on z)
```

**Step 2.3: Verify signature (self-check)**:
```typescript
const mp = rsavp1(pk, s);
if (!m.equals(mp)) {
  throw new Error('signing failure');
}
```

**What this does**:
- Computes s^e mod n (should equal m if signature is valid)
- Ensures private key operation worked correctly

**Step 2.4: Convert to bytes and return**:
```typescript
return i2osp(s, kLen);
```

**Result**:
```javascript
blindSignature = Uint8Array(256)  // 256 bytes
```

**Server sends**: `blindSignature` to client

---

## STEP 3 (Client): Finalize (Unblind) Signature

**Code** (README.md:132):
```typescript
const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);
```

**What happens inside `finalize()`** (blindrsa.js:122-151):

**Step 3.1: Convert blind signature to integer**:
```typescript
const z = os2ip(blindSig);
```

**Result**:
```javascript
z = sjcl.bn (represents s_blind = m^d × r)
```

**Step 3.2: Convert inverse to integer**:
```typescript
const rInv = os2ip(inv);
```

**Result**:
```javascript
rInv = sjcl.bn (represents r⁻¹)
```

**Step 3.3: Unblind - THE MAGIC STEP!**:
```typescript
const s = z.mulmod(rInv, n);
```

**Mathematical operation**:
```javascript
s = (z × rInv) mod n
  = (s_blind × r⁻¹) mod n
  = (m^d × r × r⁻¹) mod n
  = (m^d × (r × r⁻¹)) mod n
  = (m^d × 1) mod n              // because r × r⁻¹ ≡ 1 (mod n)
  = m^d mod n                    // VALID RSA-PSS SIGNATURE!
```

**This is the KEY insight**:
- Blind signature (m^d × r) multiplied by r⁻¹
- The r factors cancel out: r × r⁻¹ = 1
- Left with m^d = valid signature on original message!

**Result**:
```javascript
s = sjcl.bn (valid RSA-PSS signature on preparedMsg)
```

**Step 3.4: Convert to bytes**:
```typescript
const sig = i2osp(s, kLen);
```

**Step 3.5: Verify signature automatically**:
```typescript
const algorithm = { name: 'RSA-PSS', saltLength: this.params.saltLength };
if (!(await crypto.subtle.verify(algorithm, publicKey, sig, msg))) {
  throw new Error('invalid signature');
}
```

**What this does**:
- Uses WebCrypto API to verify signature
- Ensures unblinding worked correctly
- Throws error if signature invalid

**Step 3.6: Return final signature**:
```typescript
return sig;
```

**Result**:
```javascript
signature = Uint8Array(256)  // 256 bytes - VALID SIGNATURE!
```

---

## STEP 4: Verify Signature (Anyone)

**Code** (README.md:142):
```typescript
const isValid = await suite.verify(publicKey, signature, preparedMsg); // true
```

**What happens inside `verify()`** (blindrsa.js:162-163):
```typescript
verify(publicKey, signature, message) {
  return crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: this.params.saltLength },
    publicKey,
    signature,
    message
  );
}
```

**What WebCrypto `verify()` does**:
1. Convert signature bytes to integer: s
2. Compute: m' = s^e mod n (using public key)
3. Decode m' using PSS decoding
4. Compare decoded hash with Hash(message)
5. Return true if match, false otherwise

**Result**: `true` (signature is valid)

---

## Summary: Complete Data Flow

```
SETUP (Server):
  Generate key pair
    → privateKey (CryptoKey: n, e, d)
    → publicKey (CryptoKey: n, e)

STEP 1 (Client):
  "Alice and Bob" (string, 13 chars)
    → TextEncoder.encode()
    → Uint8Array(13) [65, 108, 105, 99, ...]
    → suite.prepare() adds 32 random bytes
    → Uint8Array(45) [random..., 65, 108, 105, ...]
    → suite.blind() with publicKey
      → PSS encode → Uint8Array(255)
      → Convert to big integer m
      → Generate random r
      → Compute r⁻¹ (inverse)
      → Compute x = r^e mod n
      → Blind: z = m × x mod n
      → Convert to bytes
    → blindedMsg: Uint8Array(256)
    → inv: Uint8Array(256) [kept secret]

STEP 2 (Server):
  blindedMsg: Uint8Array(256)
    → Convert to integer z
    → Sign: s_blind = z^d mod n
    → Convert to bytes
    → blindSignature: Uint8Array(256)

STEP 3 (Client):
  blindSignature: Uint8Array(256)
    → Convert to integer s_blind
    → Unblind: s = s_blind × r⁻¹ mod n
    → Convert to bytes
    → Verify automatically
    → signature: Uint8Array(256) [VALID!]

STEP 4 (Anyone):
  signature + preparedMsg + publicKey
    → crypto.subtle.verify()
    → true ✓
```

---

## Key Insights

1. **TextEncoder** converts string → UTF-8 bytes (character-by-character)
2. **Random prefix (32 bytes)** makes each blinding unique
3. **PSS encoding** pads message to fixed 255 bytes
4. **Big integers (sjcl.bn)** for all RSA math operations
5. **Blinding**: multiply message by r^e (hides content)
6. **Server signs** without seeing original message
7. **Unblinding**: multiply by r⁻¹ (removes blinding)
8. **Result**: valid RSA-PSS signature on original message

**Mathematical guarantee**: Server **cannot** determine what it signed!

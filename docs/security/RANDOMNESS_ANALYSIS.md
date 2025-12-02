████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
█                                                                                                                  █
█                          RANDOMNESS ANALYSIS: Why Data Differs Each Time                                        █
█                          Deep Dive into Sources of Randomness                                                   █
█                                                                                                                  █
████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

📋 OVERVIEW

From the same-answer-demo.ts, we saw that even with IDENTICAL answerString,
most cryptographic values are DIFFERENT between Alice and Bob:

✅ SAME:  answerString, commitment
❌ DIFF:  token, preparedMsg, inv, blindedMsg, blindSignature, signature, encryptedAnswer

But WHY are they different? Let's trace the source of randomness in each step...


========================================================================================================================
SOURCE 1: crypto.randomBytes() - Token Generation
========================================================================================================================

📍 WHERE: Admin token generation
📝 CODE:  const token = crypto.randomBytes(32).toString('hex');

🔍 WHAT HAPPENS:
   • crypto.randomBytes(32) generates 32 random bytes using Node.js CSPRNG
   • CSPRNG = Cryptographically Secure Pseudo-Random Number Generator
   • On Linux: reads from /dev/urandom (kernel entropy pool)
   • On Windows: uses CryptGenRandom
   • .toString('hex') converts to 64 hex characters

📊 DEMONSTRATION:
   Token 1: d1613357728539897a529a1b231585c0c429afa384b2c2002eb4b8eae2b4ae8f
   Token 2: 0f571d5832359bc2b97363c7aef0580b705de446af98f08736e02d7a84ea9704
   Same?    NO

💡 WHY DIFFERENT:
   • Each call to crypto.randomBytes() uses fresh kernel entropy
   • Collision probability: ~2^-128 (astronomically unlikely)
   • Purpose: Unique identifier for each student


========================================================================================================================
SOURCE 2: suite.prepare() - Random Prefix in preparedMsg
========================================================================================================================

📍 WHERE: BlindRSA.prepare(msg) in @cloudflare/blindrsa-ts
📝 CODE:  const preparedMsg = suite.prepare(messageBytes);

🔍 LIBRARY SOURCE CODE (@cloudflare/blindrsa-ts/lib/src/blindrsa.js):

   prepare(msg) {
       const msg_prefix_len = this.params.prepareType;  // 32 for Randomized
       const msg_prefix = crypto.getRandomValues(new Uint8Array(msg_prefix_len));
       return joinAll([msg_prefix, msg]);
   }

🔍 WHAT HAPPENS:
   • RSABSSA.SHA384.PSS.Randomized() sets prepareType = PrepareType.Randomized = 32
   • crypto.getRandomValues() generates 32 RANDOM bytes (Web Crypto API)
   • preparedMsg = [32 random bytes] + commitment
   • Result: Even same commitment → different preparedMsg!

📊 DEMONSTRATION:
   Input commitment (same):  633131633861636436336632343534303762646666386531666465393934313839633038332e2e2e...
   preparedMsg 1:            d3cbb84731adb4f95f8520b091c0630946fca2b7bf46fed739671f5a4f66a4a26331316338616364...
   preparedMsg 2:            269e99fa774f25adf24a5c229440b395c0276b43968a7ff030e94755b5ebd8586331316338616364...
   Same?                     NO

💡 WHY DIFFERENT:
   • 32-byte random prefix is regenerated each time
   • Uses browser/Node.js crypto.getRandomValues() (Web Crypto API)
   • Format: preparedMsg = [32 random bytes] + [64 hex commitment]
   • Total size: 32 + 64 = 96 bytes

🔐 PRIVACY BENEFIT:
   • Server cannot build "commitment dictionary" from preparedMsg
   • Same commitment looks completely different after prepare()


========================================================================================================================
SOURCE 3: suite.blind() - Random Blinding Factor (inv)
========================================================================================================================

📍 WHERE: BlindRSA.blind(publicKey, preparedMsg) in @cloudflare/blindrsa-ts
📝 CODE:  const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);

🔍 LIBRARY SOURCE CODE (@cloudflare/blindrsa-ts/lib/src/blindrsa.js):

   async blind(publicKey, msg) {
       // ... extract key params ...
       const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);
       const m = os2ip(encoded_msg);
       
       // 6. r = random_integer_uniform(1, n)  ← RANDOM GENERATION HERE!
       const r = random_integer_uniform(n, kLen);
       
       // 7. inv = inverse_mod(r, n)
       let inv;
       try {
           inv = i2osp(r.inverseMod(n), kLen);  // Store inverse for unblinding
       } catch (e) {
           throw new Error(`blinding error: ${e.toString()}`);
       }
       
       // 9. x = RSAVP1(pk, r)  // x = r^e mod n
       const x = rsavp1(pk, r);
       
       // 10. z = m * x mod n    // Blind the message
       const z = m.mulmod(x, n);
       
       // 11. blinded_msg = int_to_bytes(z, modulus_len)
       const blindedMsg = i2osp(z, kLen);
       
       return { blindedMsg, inv };
   }

🔍 LIBRARY SOURCE CODE (util.js - random_integer_uniform):

   export function random_integer_uniform(n, kLen) {
       const MAX_NUM_TRIES = 128;
       for (let i = 0; i < MAX_NUM_TRIES; i++) {
           // Generate random bytes using Web Crypto API
           const r = os2ip(crypto.getRandomValues(new Uint8Array(kLen)));
           if (!(r.greaterEquals(n) || r.equals(0))) {
               return r;  // Returns uniformly random r where 1 <= r < n
           }
       }
       throw new Error('reached maximum tries for random integer generation');
   }

🔍 WHAT HAPPENS:
   1. Generate random blinding factor r using crypto.getRandomValues()
   2. r is chosen uniformly at random from [1, n) where n is RSA modulus
   3. Compute inv = r^(-1) mod n (modular inverse for unblinding later)
   4. Compute x = r^e mod n (raise r to public exponent e)
   5. Compute blindedMsg = m * x mod n (multiply message by x)

📐 MATH:
   • r = random integer where 1 <= r < n (2048-bit modulus → ~256 bytes)
   • inv = r^(-1) mod n  (multiplicative inverse)
   • x = r^e mod n       (e = 65537, public exponent)
   • blindedMsg = m * r^e mod n

💡 WHY DIFFERENT:
   • Random r is generated fresh each time via crypto.getRandomValues()
   • Each r value produces different:
     - inv (the modular inverse r^(-1) mod n)
     - blindedMsg (m * r^e mod n)
   • Even same m (prepared message) → different blindedMsg!

🔐 PRIVACY BENEFIT:
   • Blind Signature Unlinkability:
     Server sees: blindedMsg = m * r^e mod n
     Server signs: blindSig = (m * r^e)^d mod n = m^d * r mod n
     Client unblinds: sig = blindSig * inv = m^d * r * r^(-1) = m^d mod n
   • Server CANNOT link blindedMsg to final signature!
   • Random r makes correlation computationally infeasible


========================================================================================================================
SOURCE 4: emsa_pss_encode() - PSS Salt in Blind Signature
========================================================================================================================

📍 WHERE: Inside BlindRSA.blind() before blinding
📝 CODE:  const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);

🔍 WHAT IS PSS?
   • PSS = Probabilistic Signature Scheme
   • RSA-PSS adds RANDOM SALT to message before signing
   • Salt length: 48 bytes (for SHA-384, defined in RSABSSA spec)

🔍 EMSA-PSS-ENCODE ALGORITHM (RFC 8017):
   1. mHash = Hash(M)           // Hash the message
   2. salt = random(sLen)       // Generate RANDOM salt! ← SOURCE OF RANDOMNESS
   3. M' = [8 zeros] || mHash || salt
   4. H = Hash(M')              // Hash with salt included
   5. DB = PS || 0x01 || salt   // Construct data block
   6. dbMask = MGF(H, ...)      // Mask generation function
   7. maskedDB = DB ⊕ dbMask
   8. EM = maskedDB || H || 0xbc

💡 WHY DIFFERENT:
   • PSS salt is generated randomly each time (48 bytes)
   • Uses crypto.getRandomValues() inside emsa_pss_encode()
   • Same preparedMsg → different encoded_msg due to random salt
   • This affects:
     - m (the integer representation of encoded_msg)
     - blindedMsg (depends on m)
     - blindSignature (depends on blindedMsg)
     - final signature (depends on blindSignature)

🔐 SECURITY BENEFIT:
   • Prevents signature forgery attacks
   • Same message → different signatures (probabilistic)
   • Protects against chosen message attacks


========================================================================================================================
SOURCE 5: RSA-OAEP Padding - Random Seed in Encryption
========================================================================================================================

📍 WHERE: crypto.subtle.encrypt() for answer encryption
📝 CODE:  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data);

🔍 WHAT IS OAEP?
   • OAEP = Optimal Asymmetric Encryption Padding
   • RSA-OAEP adds RANDOM SEED to plaintext before encryption
   • Seed length: 32 bytes (for SHA-256 hash)

🔍 OAEP ENCODING ALGORITHM (RFC 8017):
   1. seed = random(hLen)       // Generate RANDOM seed! ← SOURCE OF RANDOMNESS
   2. DB = lHash || PS || 0x01 || M  // Data block with message M
   3. dbMask = MGF(seed, k - hLen - 1)
   4. maskedDB = DB ⊕ dbMask
   5. seedMask = MGF(maskedDB, hLen)
   6. maskedSeed = seed ⊕ seedMask
   7. EM = 0x00 || maskedSeed || maskedDB
   8. c = RSAEP(EM)  // c = EM^e mod n

📊 DEMONSTRATION:
   Plaintext (same):  survey-cs101|CS101|teacher-001|54321
   Encrypted 1:       34cd8e5db06aa1bf66b2b0268ce0bc29b247bf4b2c842e167b36c8d973f442a7bb9ee90c07990a7f...
   Encrypted 2:       4e074d83bb2f68fb2f20c1a389b786c847b7afef99f1c4c91a1b41b26d0f233dcc904420bd773a15...
   Same?              NO

💡 WHY DIFFERENT:
   • OAEP seed is generated randomly each encryption (32 bytes for SHA-256)
   • Uses browser/Node.js crypto implementation (Web Crypto API)
   • Same plaintext → completely different ciphertext
   • Encryption is NON-DETERMINISTIC

🔐 SECURITY BENEFIT:
   • IND-CPA Security: Indistinguishability under Chosen-Plaintext Attack
   • Attacker cannot tell if two ciphertexts encrypt same plaintext
   • Prevents pattern analysis (e.g., "commitment dictionary attack")
   • Semantic security: No information leaks from ciphertext


========================================================================================================================
SUMMARY TABLE: Sources of Randomness
========================================================================================================================

┌───────────────────────┬────────────────────────────────┬──────────────┬────────────────────────────────────────────────┐
│ Variable              │ Source of Randomness           │ Size         │ Impact                                         │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ token                 │ crypto.randomBytes(32)         │ 32 bytes     │ Unique student identifier                      │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ preparedMsg           │ crypto.getRandomValues(32)     │ 32 bytes     │ Random prefix added by suite.prepare()         │
│                       │ (in suite.prepare())           │ prefix       │ Same commitment → diff preparedMsg             │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ encoded_msg (PSS)     │ crypto.getRandomValues(48)     │ 48 bytes     │ PSS salt in emsa_pss_encode()                  │
│                       │ (in emsa_pss_encode())         │ salt         │ Same preparedMsg → diff encoded_msg            │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ inv (blinding factor) │ crypto.getRandomValues(256)    │ ~256 bytes   │ Random r, then inv = r^(-1) mod n              │
│                       │ (in random_integer_uniform())  │ (2048-bit)   │ Different r → different inv                    │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ blindedMsg            │ Derived from random r          │ 256 bytes    │ blindedMsg = m * r^e mod n                     │
│                       │ (suite.blind())                │              │ Random r → different blindedMsg                │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ blindSignature        │ Derived from blindedMsg        │ 256 bytes    │ Server signs: (m * r^e)^d = m^d * r mod n      │
│                       │ (server blindSign())           │              │ Different blindedMsg → different blindSig      │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ signature (final)     │ Derived from blindSig + inv    │ 256 bytes    │ sig = blindSig * inv = m^d mod n               │
│                       │ (client finalize())            │              │ Different inv → different final sig            │
├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤
│ encryptedAnswer       │ crypto OAEP seed (32 bytes)    │ 32 bytes     │ RSA-OAEP random seed                           │
│                       │ (Web Crypto API)               │ seed         │ Same plaintext → diff ciphertext               │
└───────────────────────┴────────────────────────────────┴──────────────┴────────────────────────────────────────────────┘


========================================================================================================================
KEY INSIGHTS
========================================================================================================================

1️⃣  DETERMINISTIC vs PROBABILISTIC:
   ✅ DETERMINISTIC (always same):
      • commitment = SHA256(answerString)  ← No randomness
   
   ❌ PROBABILISTIC (different each time):
      • preparedMsg (32-byte random prefix)
      • encoded_msg (48-byte PSS salt)
      • inv (random blinding factor r)
      • blindedMsg (depends on random r)
      • signatures (depends on PSS salt + r)
      • encryptedAnswer (32-byte OAEP seed)

2️⃣  RANDOMNESS API:
   • Node.js:  crypto.randomBytes()         → Uses kernel CSPRNG (/dev/urandom)
   • Browser:  crypto.getRandomValues()     → Web Crypto API (uses OS CSPRNG)
   • Both are cryptographically secure (unpredictable)

3️⃣  LAYERED RANDOMNESS:
   Same answerString gets randomness added at MULTIPLE layers:
   
   answerString (input)
        ↓
   commitment = SHA256(answerString)  ← Deterministic
        ↓
   preparedMsg = [32 random bytes] + commitment  ← Random layer 1
        ↓
   encoded_msg = EMSA_PSS(preparedMsg + 48-byte salt)  ← Random layer 2
        ↓
   blindedMsg = encoded_msg * r^e mod n  ← Random layer 3 (random r)
        ↓
   signature = (blindedMsg^d * inv) mod n  ← Depends on all layers

4️⃣  WHY SO MUCH RANDOMNESS?
   • preparedMsg randomness: Prevents commitment dictionary attack
   • PSS salt randomness:    Prevents signature forgery
   • Blinding factor r:      Provides unlinkability (server cannot correlate)
   • OAEP seed randomness:   Provides IND-CPA security (semantic security)
   
   Each layer serves a DIFFERENT security purpose!

5️⃣  PRIVACY GUARANTEE:
   Even if Alice and Bob submit IDENTICAL answers:
   • Server sees different blindedMsg (cannot detect same commitment)
   • Server sees different signatures (PSS salt + blinding factor)
   • Blockchain sees different encrypted answers (OAEP seed)
   • Server CANNOT link students to responses!


========================================================================================================================
END OF RANDOMNESS ANALYSIS
========================================================================================================================

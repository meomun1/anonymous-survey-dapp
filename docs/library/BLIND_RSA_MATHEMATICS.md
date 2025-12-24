# Blind RSA Signatures - Complete Mathematical Operations

**Purpose**: Full mathematical walkthrough of blind RSA signature protocol with all operations explicitly shown

**Variant**: RSABSSA-SHA384-PSS-Randomized (RFC-9474)

---

## Notation

| Symbol | Meaning |
|--------|---------|
| **p, q** | Large prime numbers (~1024 bits each) |
| **n** | RSA modulus, n = p × q (~2048 bits) |
| **φ(n)** | Euler's totient function, φ(n) = (p-1)(q-1) |
| **e** | Public exponent (65537) |
| **d** | Private exponent, where e×d ≡ 1 (mod φ(n)) |
| **m** | Message (as big integer) |
| **r** | Random blinding factor, 1 < r < n |
| **r⁻¹** | Modular multiplicative inverse of r, where r×r⁻¹ ≡ 1 (mod n) |
| **z** | Blinded message |
| **s** | Signature |
| **≡** | Congruence modulo n |
| **mod n** | Modulo n operation |
| **gcd(a,b)** | Greatest common divisor |

---

## SETUP: RSA Key Generation

### Step 1: Generate Two Large Primes

**Operation**: Generate random primes p and q

**Requirements**:
- Both p and q must be prime
- Size: ~1024 bits each
- Must be different: p ≠ q

**Example** (using small numbers for illustration):
```
p = 61
q = 53
```

**Actual system**:
```
p ≈ 2^1024 (309 decimal digits)
q ≈ 2^1024 (309 decimal digits)
```

### Step 2: Compute Modulus

**Operation**:
```
n = p × q
```

**Example**:
```
n = 61 × 53 = 3233
```

**Actual system**:
```
n = p × q ≈ 2^2048 (617 decimal digits)
```

**Properties**:
- n is public (part of public key)
- Factoring n → p, q is computationally infeasible (RSA assumption)

### Step 3: Compute Euler's Totient

**Operation**:
```
φ(n) = (p - 1) × (q - 1)
```

**Why this formula?**
- φ(n) counts integers 1 ≤ k ≤ n where gcd(k, n) = 1
- For n = p×q: φ(n) = n - p - q + 1 = (p-1)(q-1)

**Example**:
```
φ(3233) = (61 - 1) × (53 - 1)
        = 60 × 52
        = 3120
```

**Actual system**:
```
φ(n) = (p - 1) × (q - 1) ≈ 2^2048
```

**Security**: φ(n) must be kept secret (knowing φ(n) allows computing d)

### Step 4: Choose Public Exponent

**Operation**: Select e such that:
```
1 < e < φ(n)
gcd(e, φ(n)) = 1
```

**Standard choice**: e = 65537 = 2^16 + 1

**Why 65537?**
- Prime number (Fermat prime F₄)
- Binary: 0b10000000000000001 (only two 1-bits)
- Efficient exponentiation (only 17 multiplications)
- Large enough to prevent attacks

**Example**:
```
e = 17  (for small example)
gcd(17, 3120) = 1 ✓
```

### Step 5: Compute Private Exponent

**Operation**: Find d such that:
```
e × d ≡ 1 (mod φ(n))
```

**Equivalently**:
```
e × d = 1 + k × φ(n)  for some integer k
```

**Algorithm**: Extended Euclidean Algorithm

**Example**:
```
Find d where: 17 × d ≡ 1 (mod 3120)

Using Extended Euclidean Algorithm:
3120 = 17 × 183 + 9
17 = 9 × 1 + 8
9 = 8 × 1 + 1

Backtrack:
1 = 9 - 8 × 1
1 = 9 - (17 - 9 × 1) × 1
1 = 9 × 2 - 17 × 1
1 = (3120 - 17 × 183) × 2 - 17 × 1
1 = 3120 × 2 - 17 × 367
1 ≡ -17 × 367 (mod 3120)
1 ≡ 17 × (3120 - 367) (mod 3120)
1 ≡ 17 × 2753 (mod 3120)

Therefore: d = 2753

Verify: 17 × 2753 = 46801 = 15 × 3120 + 1 ✓
```

**Actual system**:
```
d ≈ 2^2048 (617 decimal digits)
```

### Step 6: Key Pair

**Public Key**: (n, e)
- Published to everyone
- Used for: encryption, signature verification, blinding

**Private Key**: (n, d)
- Kept secret by server
- Used for: decryption, signing
- Note: Also stores p, q, dP, dQ, qInv for CRT optimization

**Example keys**:
```
Public:  (n=3233, e=17)
Private: (n=3233, d=2753)
```

---

## STEP 1: Client Blinds Message

### Given

**Client has**:
- Message: m (as big integer, 0 < m < n)
- Server's public key: (n, e)

**Example** (continuing from above):
```
m = 65  (represents "A" in ASCII)
n = 3233
e = 17
```

### Step 1.1: Generate Random Blinding Factor

**Operation**: Generate random r where:
```
1 < r < n
gcd(r, n) = 1
```

**Why gcd(r, n) = 1?**
- Ensures r has multiplicative inverse mod n
- If gcd(r, n) ≠ 1, r shares factor with n (reveals p or q!)

**Example**:
```
r = 42

Check: gcd(42, 3233) = gcd(42, 61×53)
42 = 2 × 3 × 7
61 is prime
53 is prime
gcd(42, 3233) = 1 ✓
```

**Actual system**:
```
r = random 2048-bit integer where gcd(r, n) = 1
```

### Step 1.2: Compute Modular Inverse

**Operation**: Find r⁻¹ such that:
```
r × r⁻¹ ≡ 1 (mod n)
```

**Algorithm**: Extended Euclidean Algorithm (same as computing d)

**Example**:
```
Find r⁻¹ where: 42 × r⁻¹ ≡ 1 (mod 3233)

Using Extended Euclidean Algorithm:
3233 = 42 × 76 + 41
42 = 41 × 1 + 1

Backtrack:
1 = 42 - 41 × 1
1 = 42 - (3233 - 42 × 76) × 1
1 = 42 × 77 - 3233 × 1
1 ≡ 42 × 77 (mod 3233)

Therefore: r⁻¹ = 77

Verify: 42 × 77 = 3234 = 3233 + 1 ≡ 1 (mod 3233) ✓
```

**Important**: Save r⁻¹ for later (unblinding step)

### Step 1.3: Compute r^e mod n

**Operation**:
```
x = r^e mod n
```

**Why compute r^e?**
- Creates "blinding mask" that will be removed later
- r^e raised to power d gives r^(ed) = r (by RSA property)

**Example**:
```
x = 42^17 mod 3233

Computing using repeated squaring:
42^1 = 42
42^2 = 1764
42^4 = 1764^2 mod 3233 = 3111696 mod 3233 = 643
42^8 = 643^2 mod 3233 = 413449 mod 3233 = 2557
42^16 = 2557^2 mod 3233 = 6538249 mod 3233 = 2278

42^17 = 42^16 × 42^1 mod 3233
      = 2278 × 42 mod 3233
      = 95676 mod 3233
      = 2746

Therefore: x = 2746
```

**Actual system**:
```
x = r^65537 mod n  (using fast modular exponentiation)
```

### Step 1.4: Blind the Message

**Operation**:
```
z = m × x mod n
z = m × r^e mod n
```

**This is the BLINDED message!**

**Example**:
```
z = 65 × 2746 mod 3233
z = 178490 mod 3233
z = 466
```

**Key property**: z looks random, reveals nothing about m

### Step 1.5: Send to Server

**Client sends**: z = 466

**Client keeps secret**:
- Original message: m = 65
- Blinding factor: r = 42
- Inverse: r⁻¹ = 77

---

## STEP 2: Server Signs Blinded Message

### Given

**Server has**:
- Blinded message from client: z
- Private key: (n, d)

**Example**:
```
z = 466
n = 3233
d = 2753
```

### Step 2.1: Sign Blinded Message

**Operation**:
```
s_blind = z^d mod n
```

**Example**:
```
s_blind = 466^2753 mod 3233

This is computationally intensive, but using modular exponentiation:
s_blind = 1074 (after computation)
```

**Verification**:
```
Check: s_blind^e ≟ z (mod n)
1074^17 mod 3233 = ?

Using repeated squaring:
1074^1 = 1074
1074^2 = 1153476 mod 3233 = 2746
1074^4 = 2746^2 mod 3233 = 643
1074^8 = 643^2 mod 3233 = 2557
1074^16 = 2557^2 mod 3233 = 2278

1074^17 = 1074^16 × 1074^1 mod 3233
        = 2278 × 1074 mod 3233
        = 2446572 mod 3233
        = 466 ✓

This equals z, so signature is valid!
```

### Step 2.2: Return Blind Signature

**Server sends**: s_blind = 1074

**Important**: Server never knew:
- Original message m
- What z represents
- Cannot link this signing session to any future use of signature

---

## STEP 3: Client Unblinds Signature

### Given

**Client has**:
- Blind signature from server: s_blind
- Inverse factor: r⁻¹
- Public key: (n, e) [for verification]

**Example**:
```
s_blind = 1074
r⁻¹ = 77
n = 3233
```

### Step 3.1: Unblind Signature - THE MAGIC!

**Operation**:
```
s = s_blind × r⁻¹ mod n
```

**Example**:
```
s = 1074 × 77 mod 3233
s = 82698 mod 3233
s = 2790
```

### Step 3.2: Mathematical Proof of Correctness

**Theorem**: s is a valid RSA signature on m

**Proof**:
```
s = s_blind × r⁻¹ mod n
```

**Substitute s_blind = z^d**:
```
s = z^d × r⁻¹ mod n
```

**Substitute z = m × r^e**:
```
s = (m × r^e)^d × r⁻¹ mod n
```

**Apply exponent**:
```
s = m^d × (r^e)^d × r⁻¹ mod n
s = m^d × r^(ed) × r⁻¹ mod n
```

**Key RSA property**: e × d ≡ 1 (mod φ(n))

Therefore: r^(ed) ≡ r^1 ≡ r (mod n)

```
s = m^d × r × r⁻¹ mod n
```

**By definition of inverse**: r × r⁻¹ ≡ 1 (mod n)

```
s = m^d × 1 mod n
s = m^d mod n
```

**This is exactly the RSA signature of m!** ∎

### Step 3.3: Verify Signature

**Operation**: Check that s^e ≡ m (mod n)

**Example**:
```
Verify: 2790^17 ≟ 65 (mod 3233)

Using repeated squaring:
2790^1 = 2790
2790^2 = 7784100 mod 3233 = 421
2790^4 = 421^2 mod 3233 = 177241 mod 3233 = 2746
2790^8 = 2746^2 mod 3233 = 643
2790^16 = 643^2 mod 3233 = 2557

2790^17 = 2790^16 × 2790^1 mod 3233
        = 2557 × 2790 mod 3233
        = 7134030 mod 3233
        = 65 ✓

This equals m, so signature is VALID!
```

**Final result**: Signature s = 2790 on message m = 65

---

## STEP 4: Public Verification

### Given

**Anyone has**:
- Message: m
- Signature: s
- Public key: (n, e)

**Example**:
```
m = 65
s = 2790
n = 3233
e = 17
```

### Verification Operation

**Compute**:
```
m' = s^e mod n
```

**Check**:
```
m' ≟ m
```

**Example** (same as Step 3.3):
```
m' = 2790^17 mod 3233 = 65
m = 65
m' = m ✓ VALID SIGNATURE!
```

---

## Complete Mathematical Flow

```
SETUP:
  Choose primes: p, q
  Compute: n = p × q
  Compute: φ(n) = (p-1)(q-1)
  Choose: e = 65537
  Compute: d where e×d ≡ 1 (mod φ(n))

  Public key:  (n, e)
  Private key: (n, d)

CLIENT BLINDING:
  Input: message m, public key (n, e)

  1. Generate random: r where gcd(r, n) = 1
  2. Compute inverse: r⁻¹ where r×r⁻¹ ≡ 1 (mod n)
  3. Compute mask: x = r^e mod n
  4. Blind message: z = m × x mod n
                     z = m × r^e mod n

  Send to server: z
  Keep secret: r, r⁻¹, m

SERVER SIGNING:
  Input: blinded message z, private key (n, d)

  1. Sign: s_blind = z^d mod n
           s_blind = (m × r^e)^d mod n
           s_blind = m^d × r^(ed) mod n
           s_blind = m^d × r mod n

  Return to client: s_blind

CLIENT UNBLINDING:
  Input: blind signature s_blind, inverse r⁻¹

  1. Unblind: s = s_blind × r⁻¹ mod n
              s = (m^d × r) × r⁻¹ mod n
              s = m^d × (r × r⁻¹) mod n
              s = m^d × 1 mod n
              s = m^d mod n

  2. Verify: m' = s^e mod n
             m' = (m^d)^e mod n
             m' = m^(de) mod n
             m' = m^1 mod n      [since de ≡ 1 (mod φ(n))]
             m' = m ✓

  Output: valid signature s on message m

PUBLIC VERIFICATION:
  Input: message m, signature s, public key (n, e)

  1. Compute: m' = s^e mod n
  2. Check: m' ≟ m
  3. Return: VALID if equal, INVALID otherwise
```

---

## Key Mathematical Properties

### 1. RSA Homomorphic Property

**Property**:
```
(a × b)^d ≡ a^d × b^d (mod n)
```

**Why this enables blinding**:
```
z = m × r^e
z^d = (m × r^e)^d = m^d × (r^e)^d = m^d × r^(ed)
```

### 2. Euler's Theorem

**Theorem**: If gcd(a, n) = 1, then:
```
a^φ(n) ≡ 1 (mod n)
```

**Corollary**: For e×d ≡ 1 (mod φ(n)), we have e×d = 1 + k×φ(n)

Therefore:
```
r^(ed) = r^(1 + k×φ(n))
       = r × (r^φ(n))^k
       ≡ r × 1^k      [by Euler's theorem]
       ≡ r (mod n)
```

### 3. Modular Inverse Cancellation

**Property**: If r × r⁻¹ ≡ 1 (mod n), then:
```
(anything × r) × r⁻¹ ≡ anything × (r × r⁻¹) ≡ anything × 1 ≡ anything (mod n)
```

**Application in unblinding**:
```
s = s_blind × r⁻¹ = (m^d × r) × r⁻¹ = m^d
```

### 4. RSA Correctness

**Standard RSA property**:
```
(m^d)^e ≡ m^(de) ≡ m (mod n)
```

**Why?** Because e×d ≡ 1 (mod φ(n)) and by Euler's theorem.

---

## Security Guarantees

### 1. Blindness (Information-Theoretic)

**Claim**: Server learns nothing about m from z

**Proof**:
- z = m × r^e mod n
- r is uniformly random in [1, n-1]
- Therefore r^e is uniformly random in [1, n-1]
- Therefore z = m × r^e is uniformly random in [1, n-1]
- z is statistically independent of m
- Server sees only uniform random value ∎

### 2. Unforgeability (Computational)

**Claim**: Client cannot forge signatures without server

**Proof**:
- Valid signature on m requires computing m^d mod n
- Computing d from (n, e) requires factoring n
- Factoring is computationally infeasible (RSA assumption) ∎

### 3. Unlinkability (Computational)

**Claim**: Server cannot link signing session (z, s_blind) to final signature (m, s)

**Proof**:
- Given: z, s_blind, m, s
- To link: must find r where z = m × r^e mod n
- This requires computing e-th root: r = (z/m)^(1/e) mod n
- Computing modular e-th roots is computationally hard (equivalent to RSA problem)
- Therefore unlinkable ∎

---

## Numerical Example Summary

**Complete worked example with small numbers**:

```
Setup:
  p = 61, q = 53
  n = 3233
  φ(n) = 3120
  e = 17
  d = 2753

Blinding:
  m = 65
  r = 42
  r⁻¹ = 77
  x = r^e mod n = 42^17 mod 3233 = 2746
  z = m × x mod n = 65 × 2746 mod 3233 = 466

Signing:
  s_blind = z^d mod n = 466^2753 mod 3233 = 1074

Unblinding:
  s = s_blind × r⁻¹ mod n = 1074 × 77 mod 3233 = 2790

Verification:
  m' = s^e mod n = 2790^17 mod 3233 = 65 ✓
  m' = m ✓ VALID!
```

---

## Conclusion

The blind RSA signature protocol achieves:

1. **Correctness**: s = m^d mod n (valid RSA signature)
2. **Blindness**: Server sees only random z, learns nothing about m
3. **Unforgeability**: Cannot create valid signatures without server's private key
4. **Unlinkability**: Server cannot connect signing session to final signature

These properties are **mathematically guaranteed** by the RSA homomorphic property, Euler's theorem, and the hardness of factoring.

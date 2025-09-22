[![NPM](https://img.shields.io/npm/v/@cloudflare/blindrsa-ts?style=plastic)](https://www.npmjs.com/package/@cloudflare/blindrsa-ts) [![NPM](https://img.shields.io/npm/l/@cloudflare/blindrsa-ts?style=plastic)](LICENSE.txt)

[![NPM](https://nodei.co/npm/@cloudflare/blindrsa-ts.png)](https://www.npmjs.com/package/@cloudflare/blindrsa-ts)

# Blind RSA Implementation

This repository contains a TypeScript implementation of the Blind RSA signature scheme, which provides unlinkable digital signatures while maintaining the security properties of standard RSA-PSS signatures.

## Overview

Blind RSA allows a client to obtain a signature on a message without revealing the message content to the signer. The signer cannot link the blind signature to the original message, providing privacy and unlinkability while still producing valid RSA-PSS signatures.

## Mathematical Operations

### Complete Protocol Flow

The blind RSA protocol consists of five main phases:

#### 1. Message Preparation Phase

**Input**: Original message string `msgString`

**Steps**:
1. **Text Encoding**:
   ```
   message = TextEncoder.encode(msgString)  // UTF-8 encoding
   ```

2. **Message Preparation**:
   ```
   preparedMsg = prepare(message)
   ```
   
   Where `prepare()` does:
   - **Deterministic mode** (`PrepareType.Deterministic = 0`): No prefix added
   - **Randomized mode** (`PrepareType.Randomized = 32`): Adds 32 random bytes prefix
   
   For `RSABSSA_SHA384_PSS_Randomized`:
   ```
   preparedMsg = random_prefix || message  // 32 random bytes + original message
   ```

#### 2. Blinding Phase (Client Side)

**Input**: `preparedMsg`, public key `(n, e)`

**Steps**:
1. **EMSA-PSS Encoding** (SHA-384, 48-byte salt):
   ```
   encoded_msg = EMSA-PSS-ENCODE(preparedMsg, emBits, { hash: 'SHA-384', sLen: 48 })
   ```

2. **Integer Conversion**:
   ```
   m = OS2IP(encoded_msg)
   ```

3. **Blinding Factor Generation**:
   ```
   r ∈ [1, n-1]  // random uniform
   ```

4. **Inverse Calculation**:
   ```
   r⁻¹ = r^(-1) mod n
   ```

5. **Blinding Factor Encryption**:
   ```
   x = r^e mod n
   ```

6. **Message Blinding**:
   ```
   z = m · x mod n = m · r^e mod n
   ```

**Output**: `(blindedMsg = z, inv = r⁻¹)`

#### 3. Blind Signing Phase (Signer Side)

**Input**: `z`, private key `(n, d)`

**Steps**:
1. **Blind Signature Generation**:
   ```
   s' = z^d mod n = (m · r^e)^d mod n = m^d · r mod n
   ```

**Output**: Blind signature `s'`

#### 4. Unblinding Phase (Client Side)

**Input**: `s'`, `r⁻¹`, `n`

**Steps**:
1. **Signature Unblinding**:
   ```
   s = s' · r⁻¹ mod n = (m^d · r) · r⁻¹ mod n = m^d mod n
   ```

**Output**: Final signature `s`

#### 5. Verification Phase

**Input**: `s`, `preparedMsg`, public key `(n, e)`

**Steps**:
1. **Standard RSA-PSS Verification** (SHA-384, 48-byte salt):
   ```
   m' = s^e mod n = (m^d)^e mod n = m mod n
   ```

2. **Message Recovery and Verification**:
   - Decode: `EM = I2OSP(m', emLen)`
   - Apply EMSA-PSS-VERIFY to `EM` and `preparedMsg` with SHA-384 and 48-byte salt

### Mathematical Correctness Proof

The protocol works because:

1. **RSA Property**: `(m^d)^e ≡ m^(d·e) ≡ m mod n` (since `d·e ≡ 1 mod φ(n)`)

2. **Blinding Correctness**:
   ```
   z = m · r^e mod n
   s' = z^d mod n = (m · r^e)^d mod n = m^d · r^(e·d) mod n = m^d · r mod n
   s = s' · r⁻¹ mod n = (m^d · r) · r⁻¹ mod n = m^d · (r · r⁻¹) mod n = m^d · 1 mod n = m^d mod n
   ```

3. **Final Verification**:
   ```
   m' = s^e mod n = (m^d)^e mod n = m mod n
   ```

## Implementation Details

### Key Components

- **RSABSSA Class**: Main implementation of the blind RSA protocol with RFC-9474 compliant variants
- **PrepareType Enum**: Defines preparation modes (Deterministic/Randomized)
- **EMSA-PSS Encoding**: RFC-compliant message encoding for RSA-PSS with SHA-384 and 48-byte salt
- **SJCL Integration**: Uses Stanford Javascript Crypto Library for big number operations

### Preparation Modes

1. **Deterministic** (`PrepareType.Deterministic = 0`):
   - No random prefix added
   - Same message always produces same prepared message
   - Useful for deterministic protocols

2. **Randomized** (`PrepareType.Randomized = 32`):
   - Adds 32 random bytes prefix
   - Same message produces different prepared messages
   - Enhances privacy and prevents replay attacks
   - **Used in RSABSSA_SHA384_PSS_Randomized variant**

### Security Properties

- **Unlinkability**: The signer cannot link the blind signature to the original message
- **Unforgeability**: Only the legitimate signer can produce valid blind signatures
- **Correctness**: The final signature is mathematically equivalent to a direct RSA-PSS signature
- **Privacy**: The signer never sees the original message content

## Usage Example

```typescript
import { RSABSSA } from './src/index.js';

// Create blind RSA instance using RSABSSA-SHA384-PSS-Randomized variant
const suite = RSABSSA.SHA384.PSS.Randomized();

// Generate key pair
const { privateKey, publicKey } = await suite.generateKey({
    publicExponent: Uint8Array.from([1, 0, 1]),
    modulusLength: 2048,
});

// Client: Prepare and blind message
const msgString = 'Alice and Bob';
const message = new TextEncoder().encode(msgString);
const preparedMsg = suite.prepare(message);
const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);

// Server: Blind sign
const blindSignature = await suite.blindSign(privateKey, blindedMsg);

// Client: Unblind and verify
const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);

// Verify signature
const isValid = await suite.verify(publicKey, signature, preparedMsg);
console.log(`Signature is valid? ${isValid}`);
```

### Available Variants

The library supports multiple variants as defined in RFC-9474:

```typescript
import { RSABSSA } from './src/index.js';

// SHA-384 with PSS padding (48-byte salt)
const pssRandomized = RSABSSA.SHA384.PSS.Randomized();        // RSABSSA-SHA384-PSS-Randomized
const pssDeterministic = RSABSSA.SHA384.PSS.Deterministic();  // RSABSSA-SHA384-PSS-Deterministic

// SHA-384 with PSSZero padding (0-byte salt)
const pssZeroRandomized = RSABSSA.SHA384.PSSZero.Randomized();        // RSABSSA-SHA384-PSSZERO-Randomized
const pssZeroDeterministic = RSABSSA.SHA384.PSSZero.Deterministic();  // RSABSSA-SHA384-PSSZERO-Deterministic
```

### Platform Optimizations

For platforms that support native RSA-RAW operations (like Cloudflare Workers), you can enable optimizations:

```typescript
// Enable native RSA-RAW support for better performance
const suite = RSABSSA.SHA384.PSS.Randomized({ supportsRSARAW: true });
```

## API Reference

### BlindRSA Class

#### Constructor
```typescript
constructor(params: BlindRSAParams & BlindRSAPlatformParams)
```

#### Methods

- `prepare(msg: Uint8Array): Uint8Array` - Prepare message with optional random prefix
- `blind(publicKey: CryptoKey, msg: Uint8Array): Promise<BlindOutput>` - Blind a message
- `blindSign(privateKey: CryptoKey, blindMsg: Uint8Array): Promise<Uint8Array>` - Sign a blinded message
- `finalize(publicKey: CryptoKey, msg: Uint8Array, blindSig: Uint8Array, inv: Uint8Array): Promise<Uint8Array>` - Unblind and verify signature
- `verify(publicKey: CryptoKey, signature: Uint8Array, message: Uint8Array): Promise<boolean>` - Verify a signature
- `generateKey(algorithm: RsaHashedKeyGenParams): Promise<CryptoKeyPair>` - Generate RSA key pair

### Types

```typescript
interface BlindRSAParams {
    name: string;
    hash: string;
    saltLength: number;
    prepareType: PrepareType;
}

interface BlindRSAPlatformParams {
    supportsRSARAW: boolean;
}

type BlindOutput = {
    blindedMsg: Uint8Array;
    inv: Uint8Array;
};

enum PrepareType {
    Deterministic = 0,
    Randomized = 32,
}
```

## Installation

```bash
npm install blindrsa-ts
```

## Building

```bash
npm run build
```

## Testing

```bash
npm test
```

## License

Apache-2.0 License - see LICENSE file for details.

## References

- [RFC 9474: Blind RSA Signatures](https://www.rfc-editor.org/rfc/rfc9474)
- [RFC 3447: RSA-PSS](https://www.rfc-editor.org/rfc/rfc3447)
- [Stanford Javascript Crypto Library (SJCL)](https://github.com/bitwiseshiftleft/sjcl)
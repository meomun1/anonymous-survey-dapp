# Cryptographic System Overview

This project implements an anonymous survey system using a combination of modern cryptographic techniques and blockchain technology. The core cryptographic components and their roles are as follows:

## 1. One-Time Use Tokens
- **Purpose:** Restricts survey participation to authorized students and prevents double submissions.
- **How it works:**
  - The school generates a unique, random token for each student and distributes it (e.g., via email).
  - Only students with a valid token can access and participate in the survey.
  - Upon use, the token is validated and marked as used, preventing reuse.

## 2. Blind Signatures (RSA-PSS)
- **Purpose:** Enables the school to sign a student's survey participation without learning the content of the response or linking the signature to the student.
- **How it works:**
  - The student prepares their answer and blinds it using the school's public key.
  - The school signs the blinded message, producing a blind signature.
  - The student unblinds the signature, obtaining a valid signature on their original answer.
  - This signature can be verified by anyone using the school's public key, but cannot be linked to the student's identity.

## 3. Commitment Scheme (SHA-256)
- **Purpose:** Provides a cryptographic commitment to each student's answer, allowing later verification that the answer was included in the published results without revealing the answer itself.
- **How it works:**
  - The student computes a SHA-256 hash of their answer (the commitment).
  - All commitments are published on-chain and included in a Merkle tree for efficient batch verification.

## 4. Response Encryption (RSA-OAEP)
- **Purpose:** Ensures that student answers are confidential and can only be decrypted by the school.
- **How it works:**
  - The student's answer is encrypted in the browser using the school's RSA-OAEP public key.
  - The encrypted answer is submitted to the blockchain.
  - Only the school, with the corresponding private key, can decrypt the responses after the survey closes.

## 5. Merkle Tree Proofs
- **Purpose:** Allows anyone to efficiently verify that a particular commitment (answer) is included in the set of published survey results.
- **How it works:**
  - All commitments are used as leaves in a Merkle tree.
  - The Merkle root is published on-chain.
  - Anyone can request a Merkle proof for a specific answer and verify its inclusion using the root.

## 6. Blockchain Integration (Solana)
- **Purpose:** Provides immutable, transparent storage for commitments and encrypted answers, and enables public verifiability of survey results.
- **How it works:**
  - Commitments and encrypted answers are stored in a Solana smart contract.
  - The Merkle root and survey metadata are published on-chain.
  - Anyone can audit the published data for integrity and completeness.

## Security Goals
- **Anonymity:** The school cannot link survey responses to student identities.
- **Confidentiality:** Only the school can decrypt and read student answers.
- **Integrity:** All published results can be publicly verified for completeness and correctness.
- **Transparency:** The system enables public auditing of survey results without compromising student privacy.

---

## Potential Weaknesses and Attack Vectors

1. **Token Interception or Replay:**
   - If tokens are intercepted (e.g., via compromised email), an attacker could submit a response as another student. If tokens are not properly invalidated after use, they could be reused for multiple submissions.

2. **Blind Signature Forgery:**
   - If the blind signature protocol is implemented incorrectly or weak keys are used, attackers could forge signatures and submit unauthorized responses.

3. **Hash Collision Attacks:**
   - If a weak hash function is used for commitments or Merkle trees, attackers could find collisions and submit fraudulent responses that match legitimate commitments.

4. **Encryption Weakness:**
   - If RSA-OAEP is not implemented correctly or uses insufficient key length, encrypted answers could be exposed to unauthorized parties.

5. **On-Chain Data Exposure:**
   - All commitments and encrypted answers are stored on-chain and are publicly accessible. Advances in cryptanalysis or quantum computing could compromise confidentiality in the future.

6. **Merkle Tree Manipulation:**
   - If the Merkle tree is not constructed or verified correctly, the school could omit certain responses from the published results, undermining verifiability.

7. **Smart Contract Vulnerabilities:**
   - Bugs in the smart contract could allow attackers to bypass participation limits, corrupt data, or otherwise compromise survey integrity.

8. **Key Management Risks:**
   - If the school's private keys are leaked or compromised, all past and future survey data could be decrypted or forged.

---

This README summarizes the cryptographic architecture, workflow, and potential security considerations of the anonymous survey system implemented in this project. 


# Anonymous Survey System Using Blockchain and Cryptography

## Table of Contents
- [Overview](#overview)
- [Cryptographic Techniques Used](#cryptographic-techniques-used)
- [Detailed Operation Process](#detailed-operation-process)
  - [I. System Setup (School Side)](#i-system-setup-school-side)
  - [II. Token Distribution (School Side)](#ii-token-distribution-schoolside)
  - [III. Student Authentication and Survey Submission](#iii-student-authentication-and-survey-submission)
  - [IV. School Signs Blinded Message](#iv-school-signs-blinded-message)
  - [V. Student Finalizes Signature and Submits to Blockchain](#v-student-finalizes-signature-and-submits-to-blockchain)
  - [VI. School Processes Survey Submissions](#vi-school-processes-survey-submissions)
  - [VII. School Publishes Survey Results](#vii-school-publishes-survey-results-with-merkle-proof)
  - [VIII. Verifying Survey Results (Public)](#viii-verifying-survey-results-public)
- [Why Blockchain?](#why-blockchain)
- [Security Features](#security-features)
- [Example: How Answer Commitments Work](#example-how-answer-commitments-work)
- [References](#references)

## Overview

This anonymous survey system is designed to collect feedback from students while ensuring privacy and verifiability. The system uses blockchain technology and modern cryptographic techniques to ensure that:

- Students can provide honest feedback without fear of identification
- Schools can verify participation without knowing who submitted which response
- Students can verify their own response signatures independently
- The public can verify survey results without compromising student privacy
- All operations are transparent and verifiable on the blockchain
- Individual student responses are encrypted on the blockchain and only accessible to the school

For detailed system architecture and design, please refer to [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

## Quick Start

### Prerequisites
- Node.js 16+
- Rust 1.70+
- Solana CLI 1.16+
- PostgreSQL 13+

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd anonymous-survey-dapp

# Setup blockchain
cd blockchain/anonymous-survey
anchor build
anchor deploy

# Setup backend server
cd ../../server
npm install
npm run migrate
npm run dev

# Setup client
cd ../client
npm install
npm run dev
```

For detailed setup instructions, see:
- [Blockchain README](./blockchain/README.md)
- [Server README](./server/README.md)
- [Client README](./client/README.md)

## System Architecture

The system consists of three main components:

1. **School Backend Server** - Handles token management, blind signatures, and transaction signing
2. **Solana Smart Contract** - Stores survey metadata, commitments, and verifies results
3. **Client Application** - Provides user interface for students and administrators

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │◄──►│  School Backend  │◄──►│ Solana Program  │
│                 │    │                  │    │                 │
│ • Student UI    │    │ • Token Mgmt     │    │ • Survey Data   │
│ • Admin UI      │    │ • Blind Sigs     │    │ • Commitments   │
│ • Crypto Ops    │    │ • TX Signing     │    │ • Verification  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

For detailed architecture, see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).

## Cryptographic Techniques Used

1. **Blind Signatures** - For creating anonymous participation tickets
2. **Hash-based Commitments** - To ensure process integrity
3. **Public-key Encryption** - For encrypting survey data
4. **One-time Tokens** - To ensure each student participates only once

## Detailed Operation Process

### I. System Setup (School Side)

```javascript
// 1. School creates survey through admin interface
// 2. Server automatically generates RSA key pairs during survey creation

// Backend automatically generates blind signature key pair
const suite = RSABSSA.SHA384.PSS.Randomized();
const { privateKey: blindSignaturePrivateKey, publicKey: blindSignaturePublicKey } = await suite.generateKey({
  publicExponent: Uint8Array.from([1, 0, 1]), // 65537
  modulusLength: 2048,
});

// Backend automatically generates encryption key pair
const { privateKey: encryptionPrivateKey, publicKey: encryptionPublicKey } = 
  await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

// 3. Server automatically saves keys to database during survey creation
await prisma.survey.create({
  data: {
    title: "Event Feedback Survey",
    description: "Anonymous feedback for recent event",
    blindSignaturePrivateKey: Buffer.from(await crypto.subtle.exportKey('pkcs8', blindSignaturePrivateKey)),
    blindSignaturePublicKey: Buffer.from(await crypto.subtle.exportKey('spki', blindSignaturePublicKey)),
    encryptionPrivateKey: Buffer.from(await crypto.subtle.exportKey('pkcs8', encryptionPrivateKey)),
    encryptionPublicKey: Buffer.from(await crypto.subtle.exportKey('spki', encryptionPublicKey)),
    isPublished: false
  }
});

// 4. Server generates unique tokens mapped to students and saves to database
const studentTokens = new Map();
for (const student of students) {
  const token = generateSecureToken(); // Cryptographically secure random token
  studentTokens.set(token, {
    studentId: student.id,
    used: false
  });
}

// 5. Survey question is defined during creation and stored in database
surveyID = "SURVEY_EVENT_FEEDBACK_2025"
survey_question = {
  id: "Q1",
  text: "What do you think about the event?"
};

// 6. Server automatically creates survey on blockchain with public keys
await program.methods
  .createSurvey(
    surveyID,
    survey_question.text,
    "Survey description",
    blindSignaturePublicKey,
    encryptionPublicKey
  )
  .accounts({
    survey: surveyPda,
    authority: schoolWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### II. Token Distribution (SchoolSide)

```javascript
// 1. School backend distributes tokens to students via email
for (const [token, data] of studentTokens) {
  const student = students.find(s => s.id === data.studentId);
  
  // 2. Send email with token and survey link
  await sendEmail({
    to: student.email,
    subject: "Survey Participation Token",
    body: `
      Dear ${student.name},
      
      You have been invited to participate in the ${surveyID} survey.
      Your unique participation token is: ${token}
      
      Please use this token to access the survey at: ${surveyURL}
      
      Note: This token can only be used once and is required to participate.
      Do not share this token with anyone.
    `
  });
}
```

### III. Student Authentication and Survey Submission

```javascript
// 1. Student receives their unique token (e.g., via email) 
const studentToken = "received_token";

// 2. Student enter their token to the survey system (CLIENT) and mark the token as used (SERVER)

// 3. Student enter their answer then client will generate blinded message and send to school
const surveyAnswer = "Student's text response"; // The actual survey answer as string
const encodedMessage = new TextEncoder().encode(surveyAnswer);
const preparedMsg = suite.prepare(encodedMessage);
const { blindedMsg, inv } = await suite.blind(blindSignaturePublicKey, preparedMsg);

// 4. Client will encrypt the answer using school's encryption public key from database, the answer will later be stored in the blockchain
const encryptedAnswer = await window.crypto.subtle.encrypt(
  {
    name: "RSA-OAEP"
  },
  encryptionPublicKey,  // Using encryption public key
  new TextEncoder().encode(surveyAnswer)  // Must encode string to Uint8Array for encryption
);

// 5. Client will generate commitment for verification, then commitment will later be stored in the blockchain
const answerCommitment = hash(surveyAnswer);

// 6. Client will send blinded message to school for signing
send_to_school({
  blindedMsg
});
```

### IV. School Signs Blinded Message

```javascript
// 1. School receives blinded message (SERVER)

// 2. School signs the blinded message without knowing its contents (SERVER)
const blindSignature = await suite.blindSign(SchoolPrivateKeys.blindSignature, blindedMsg);

// 3. School returns the blind signature to student (SERVER)
return blindSignature;
```

### V. Student Finalizes Signature and Submits to Blockchain

```javascript
// 1. Client will receive blind signature from school (CLIENT)

// 2. Client will finalize the signature to get valid signature on original message (CLIENT)
const signature = await suite.finalize(blindSignaturePublicKey, preparedMsg, blindSignature, inv);

// 3. Client will verify the signature is valid (CLIENT)
const isValid = await suite.verify(blindSignaturePublicKey, signature, preparedMsg);
if (!isValid) {
  throw new Error("Invalid signature");
}

// 4. Client will create submission object, send to blockchain, mark token as conpleted  (CLIENT)
const submission = {
  encryptedAnswer,
  commitment: answerCommitment,
  surveyID: "SURVEY_EVENT_FEEDBACK_2025",
  timestamp: Date.now()
};

// 5. Client downloads the proof to student's device
const studentProof = {
  preparedMsg,
  signature,
  surveyAnswer,
};


```

### VI. School Processes Survey Submissions

```javascript
// 1. School fetches complete survey information from blockchain (SERVER)
const submissions = await program.account.survey.fetch(surveyPda);

// 2. School processes each submission (SERVER)
for (const submission of submissions) {
  // Decrypt the encrypted answer using encryption private key
  const decryptedAnswer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    SchoolPrivateKeys.encryption,  // Using encryption private key
    submission.encryptedAnswer
  );
  
  // Store the answer to database
  await prisma.surveyResponse.create({
    data: {
      surveyID: surveyID,
      answer: new TextDecoder().decode(decryptedAnswer),
      commitment: submission.commitment,
      timestamp: submission.timestamp
    }
  });
}
```

### VII. School Publishes Survey Results with Merkle Proof

```javascript
// 1. School calls instruction publish_results in smart contract (SERVER)
await program.methods
  .publishResults()
  .accounts({
    survey: surveyPda,
    authority: schoolWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
  
// 2. Smart contract will generate merkle root and publish to blockchain (SMART CONTRACT)
// 3. Encrypted answers are cleared from blockchain to free up space (SMART CONTRACT)
// 4. Survey is marked as published (SMART CONTRACT)
```

### VIII. Verifying Survey Results (Public) ( FOR PEOPLE )

```javascript
// 1. Query survey information from blockchain  (CLIENT)
const surveyAccount = await program.account.survey.fetch(surveyPda);

// 2. Get all commitments from survey information (CLIENT)
const allCommitments = surveyAccount.commitments;

// 3. Create Merkle tree from all commitments (CLIENT)
const verificationTree = createMerkleTreeFromCommitments(allCommitments);
const verificationRoot = verificationTree.getRoot();

// 4. Compare roots
if (Buffer.compare(verificationRoot, surveyAccount.merkleRoot) === 0) {
  console.log("Survey results are verified and accurate");
  console.log("Total responses:", surveyAccount.totalResponses);
  console.log("Survey is published:", surveyAccount.isPublished);
} else {
  console.log("Warning: Survey results may have been tampered with");
}

// 5. Verify individual submissions if needed (CLIENT)
function verifySubmission(commitment) {
  const proof = verificationTree.getProof(commitment);
  return verificationTree.verifyProof(commitment, proof, surveyAccount.merkleRoot);
}
```

## Why Blockchain?

1. **Privacy Protection**:
   - Student responses are encrypted before being stored on the blockchain
   - Only the school can decrypt the responses using their private key
   - Individual responses remain private while being stored on the blockchain

2. **Blockchain Benefits**:
   - Immutable storage of encrypted responses
   - Transparent verification of participation
   - Decentralized storage of survey data
   - No need for school to maintain a separate database

3. **Verifiable Results**:
   - Merkle tree built from student commitments provides cryptographic proof
   - Public can verify results by checking commitment Merkle root
   - School cannot manipulate results without detection

4. **Maintained Anonymity**:
   - Blind signatures still ensure anonymous participation
   - School cannot link responses to specific students
   - Token system prevents multiple submissions

## Security Features

- **Anonymity**: School cannot identify which survey belongs to which student
- **Integrity**: Each student can only participate in the survey once
- **Security**: Survey data is encrypted and only the school can decrypt it
- **Transparency**: Process is conducted on blockchain, verifiable and traceable
- **Verifiability**: Survey results are publicly verifiable through commitment Merkle proofs
- **Tamper Resistance**: School cannot modify or hide survey results without detection
- **Privacy**: Individual student responses remain private on the blockchain

## References

- [Blind Signature - Wikipedia](https://en.wikipedia.org/wiki/Blind_signature)
- [Commitment Scheme - Wikipedia](https://en.wikipedia.org/wiki/Commitment_scheme)
- [Public-key Cryptography - Wikipedia](https://en.wikipedia.org/wiki/Public-key_cryptography)

### Example: How Answer Commitments Work

Let's say we have a simple survey with 3 students rating an event from 1-5:

```javascript
// 1. Student submissions
const submissions = [
  {
    student: "A",
    answers: "2 1 3", // Space-separated answers
    commitment: hash("2 1 3") // Hash of the entire answer string
  },
  {
    student: "B",
    answers: "1 2 1",
    commitment: hash("1 2 1")
  },
  {
    student: "C",
    answers: "1 1 2",
    commitment: hash("1 1 2")
  }
];

// 2. School publishes results
const publishedResults = {
  totalResponses: 3,
  answerDistribution: {
    "1": 4, // Total count of answer "1" across all questions
    "2": 3, // Total count of answer "2" across all questions
    "3": 1, // Total count of answer "3" across all questions
    "4": 0,
    "5": 0
  },
  proof: {
    commitmentRoot: generateMerkleRoot(submissions.map(s => s.commitment))
  }
};

// 3. Anyone can verify the results
function verifyResults(publishedResults, submissions) {
  // Verify the answer distribution matches the commitments
  const calculatedDistribution = submissions.reduce((dist, s) => {
    dist[s.answers.split(' ')[0]] = (dist[s.answers.split(' ')[0]] || 0) + 1;
    return dist;
  }, {});
  
  // Verify the Merkle tree
  const isValidTree = verifyMerkleRoot(
    publishedResults.proof.commitmentRoot,
    submissions.map(s => s.commitment)
  );
  
  return JSON.stringify(calculatedDistribution) === JSON.stringify(publishedResults.answerDistribution) && 
         isValidTree;
}

// 4. If school tries to tamper with results
const tamperedResults = {
  totalResponses: 3,
  answerDistribution: {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 3 // Changed to show all students gave 5
  },
  proof: {
    commitmentRoot: "fake_root"
  }
};

// 5. Verification would fail
const isTampered = verifyResults(tamperedResults, submissions);
console.log("Results are tampered:", isTampered); // true
```

This simplified system:
1. Stores simple answer commitments (hashes)
2. Publishes clear answer distribution
3. Allows easy verification of results
4. Maintains anonymity while being transparent

The key benefits:
- Simple to understand and implement
- Easy to verify results
- Transparent answer distribution
- Still maintains student anonymity
- School cannot tamper with results

## Security Features

- **Anonymity**: School cannot identify which survey belongs to which student
- **Integrity**: Each student can only participate in the survey once
- **Security**: Survey data is encrypted and only the school can decrypt it
- **Transparency**: Process is conducted on blockchain, verifiable and traceable
- **Verifiability**: Survey results are publicly verifiable through commitments
- **Tamper Resistance**: School cannot modify or hide survey results without detection
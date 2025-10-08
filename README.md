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

**🎯 New Features (Latest Version):**
- **Template System**: Pre-built survey templates (25-question teaching quality assessment)
- **Modern UI/UX**: Glassmorphism design with animated backgrounds and responsive layouts
- **Comprehensive Analytics**: Real-time statistics with Questions, Categories, and Overview views
- **Enhanced Admin Dashboard**: Streamlined survey management with header-based actions
- **Improved Survey Participation**: Simplified 1-5 rating scale with visual progress indicators
- **Advanced Response Processing**: Automated blockchain response decryption and statistics generation


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

1. **School Backend Server** - Handles token management, blind signatures, survey templates, and transaction signing
2. **Solana Smart Contract** - Stores survey metadata, commitments, and verifies results
3. **Client Application** - Provides modern user interface for students and administrators

```
┌─────────────────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│         Client App              │◄──►│  School Backend  │◄──►│ Solana Program  │
│                                 │    │                  │    │                 │
│ • Student UI (Modern Design)    │    │ • Token Mgmt     │    │ • Survey Data   │
│ • Admin UI (Glassmorphism)      │    │ • Blind Sigs     │    │ • Commitments   │
│ • Template System               │    │ • Template Mgmt  │    │ • Verification  │
│ • Crypto Ops                    │    │ • Analytics      │    │ • Merkle Roots  │
│ • Real-time Analytics           │    │ • TX Signing     │    │                 │
└─────────────────────────────────┘    └──────────────────┘    └─────────────────┘
```


## Cryptographic Techniques Used

1. **Blind Signatures (RSA-BSSA)** - For creating anonymous participation tickets with SHA-384 and PSS padding
2. **Hash-based Commitments (SHA-256)** - To ensure process integrity and tamper-proof verification
3. **Public-key Encryption (RSA-OAEP)** - For encrypting survey data with 2048-bit keys
4. **One-time Tokens** - To ensure each student participates only once
5. **Merkle Tree Verification** - For public verification of survey results without compromising privacy
6. **Template-based Surveys** - Pre-defined question sets for consistent data collection and analysis

## How It Works

The system operates through a secure workflow that ensures student anonymity while maintaining verifiable integrity:

1. **Survey Creation**: Administrators create surveys using pre-built templates (25-question teaching quality assessment)
2. **Token Distribution**: Unique tokens are generated and distributed to students via email
3. **Anonymous Participation**: Students participate using blind signatures to maintain anonymity
4. **Response Processing**: Encrypted responses are processed and comprehensive analytics are generated
5. **Result Verification**: Public verification using Merkle tree proofs ensures data integrity

For detailed technical implementation, see the individual component documentation.

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


## Security Features

- **Anonymity**: School cannot identify which survey belongs to which student
- **Integrity**: Each student can only participate in the survey once
- **Security**: Survey data is encrypted and only the school can decrypt it
- **Transparency**: Process is conducted on blockchain, verifiable and traceable
- **Verifiability**: Survey results are publicly verifiable through commitments
- **Tamper Resistance**: School cannot modify or hide survey results without detection
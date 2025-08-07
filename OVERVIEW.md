# Anonymous Survey System Using Blockchain and Cryptography - Thesis Overview

## Abstract

This thesis presents the design and implementation of an anonymous survey system that leverages blockchain technology and modern cryptographic techniques to ensure privacy, verifiability, and integrity in survey responses. The system enables educational institutions to collect honest feedback from students while maintaining complete anonymity and providing cryptographic proof of participation.

## 1. Introduction

### 1.1 Problem Statement
Traditional survey systems face several challenges:
- Lack of anonymity leading to biased responses
- Inability to verify participation without compromising privacy
- Risk of data tampering or manipulation
- Centralized storage creating single points of failure

### 1.2 Solution Overview
The proposed system addresses these challenges through:
- Blockchain-based immutable storage
- Blind signature-based anonymous participation
- Cryptographic commitment schemes for verification
- Merkle tree-based result validation

## 2. Methodology

This chapter presents the systematic approach employed in designing and implementing the anonymous survey system using design science methodology. The development process encompasses requirements analysis from key stakeholders (educational institutions, students, and administrators), architectural design decisions, and detailed system specifications. The methodology prioritizes security-by-design principles, ensuring privacy and anonymity are foundational rather than supplementary features, with each design decision evaluated against technical feasibility and practical usability in educational environments.

## 3. System Architecture

### 2.1 Core Components
1. **School Backend Server**
   - Token management and distribution
   - Blind signature operations
   - Survey data processing
   - Blockchain integration

2. **Solana Smart Contract**
   - Survey metadata storage
   - Response commitment verification
   - Merkle tree implementation
   - Result publication

3. **Client Application**
   - Student survey interface
   - Cryptographic operations
   - Blockchain interaction
   - Result verification

### 2.2 Data Flow
1. Survey Creation → Token Distribution → Response Collection → Result Publication
2. Each step maintains cryptographic integrity and privacy

## 3. Cryptographic Techniques

### 3.1 Blind Signatures
- RSA-BSSA implementation with SHA-384
- 2048-bit key pairs
- Ensures anonymous participation verification

### 3.2 Response Encryption
- RSA-OAEP with SHA-256
- 2048-bit encryption keys
- Protects response privacy on blockchain

### 3.3 Commitment Scheme
- SHA-256 hash-based commitments
- Merkle tree for batch verification
- Enables result verification without revealing individual responses

## 4. Security Features

### 4.1 Privacy Protection
- End-to-end encryption
- Zero-knowledge participation verification
- No personal data collection
- Secure token management

### 4.2 Integrity Verification
- Cryptographic commitments
- Merkle tree proofs
- Blockchain immutability
- Verifiable signature chains

### 4.3 Technical Security
- Client-side cryptography
- Secure random number generation
- Input validation
- HTTPS/TLS encryption

## 5. Implementation Details

### 5.1 Survey Creation Process
1. School generates cryptographic key pairs
2. Survey metadata stored on blockchain
3. Unique tokens generated for students
4. Email distribution of tokens

### 5.2 Student Participation Flow
1. Token validation
2. Response encryption
3. Blind signature generation
4. Blockchain submission
5. Participation proof generation

### 5.3 Result Processing
1. Response decryption
2. Commitment verification
3. Merkle tree generation
4. Result publication
5. Public verification

## 6. Technical Stack

### 6.1 Backend
- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Prisma ORM

### 6.2 Blockchain
- Solana
- Anchor Framework
- Rust 1.70+

### 6.3 Frontend
- Next.js
- WebCrypto API
- TypeScript

## 7. Verification and Testing

### 7.1 Workflow Verification
- Student answer verification
- Merkle tree proof verification
- Database-blockchain consistency checks

### 7.2 Security Testing
- Cryptographic implementation verification
- Token management testing
- Blockchain integration testing

## 8. Future Work

### 8.1 Potential Enhancements
- Support for multiple question types
- Advanced analytics capabilities
- Integration with existing school systems
- Mobile application development

### 8.2 Research Directions
- Zero-knowledge proof integration
- Alternative blockchain platforms
- Advanced privacy-preserving techniques

## 9. Conclusion

The implemented system successfully demonstrates:
- Complete anonymity in survey participation
- Cryptographic verification of results
- Immutable storage of responses
- Public verification capabilities

## 10. References

1. Blind Signature - Wikipedia
2. Commitment Scheme - Wikipedia
3. Public-key Cryptography - Wikipedia
4. Solana Documentation
5. WebCrypto API Documentation 
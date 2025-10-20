# Anonymous Survey System - Blockchain Component

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [University Scaling Architecture](#university-scaling-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Program Structure](#program-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Client Integration](#client-integration)
- [Security Considerations](#security-considerations)
- [Monitoring](#monitoring)
- [Related Documentation](#related-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview
The Solana smart contract component handles the on-chain operations of the university-scale anonymous survey system, including campaign-based survey management, batch response processing, and hierarchical Merkle root verification for teacher performance tracking. The system is designed to handle 34,000+ responses per semester while maintaining cryptographic integrity for accreditation body verification.

## Features
- **Campaign-based survey management** (semester-level organization)
- **Batch response processing** (efficient handling of 34,000+ responses)
- **Off-chain Merkle tree calculation** (avoids Solana compute limits)
- **Hierarchical verification system** (teacher performance across multiple semesters)
- **Commitment verification** (tamper-proof response integrity)
- **Result publication** (controlled data release)
- **University performance tracking** (accreditation-ready verification)

## University Scaling Architecture

### Core Concept: One Account for Teacher Performance Verification

#### **The Problem:**
- **University Scale**: 34,000 responses per semester
- **Teacher Performance**: Need to verify 1500-2000 responses over 5 years
- **Accreditation**: Must prove teacher performance is tamper-proof
- **Cost**: Can't afford 34,000 individual accounts

#### **The Solution: Campaign-Based Architecture**

**SurveyCampaign Account:**
```rust
pub struct SurveyCampaign {
    pub authority: Pubkey,
    pub campaign_id: String,
    pub semester: String,
    pub campaign_type: u8, // 0 = Course, 1 = Event
    pub total_responses: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_published: bool,
    pub merkle_root: [u8; 32], // Calculated off-chain during publishing
    pub encrypted_responses: Vec<[u8; 256]>, // RSA-2048 encrypted responses (cleared after publishing)
    pub commitments: Vec<[u8; 32]>, // Hash commitments (kept after publishing)
    pub blind_signature_public_key: Vec<u8>, // RSA public key for blind signatures (~294 bytes)
    pub encryption_public_key: Vec<u8>, // RSA public key for encryption (~294 bytes)
}
```

**UniversityPerformance Account (Deployment-Initialized):**
```rust
pub struct UniversityPerformance {
    pub authority: Pubkey,
    pub university_id: String,
    pub total_campaigns: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub final_merkle_root: [u8; 32], // Root of all campaign roots (calculated off-chain)
}
```

### Key Features:

#### **1. Off-Chain Merkle Calculation**
- **Problem**: 34,000 commitments = ~5.1 million compute units (exceeds Solana limits)
- **Solution**: Calculate Merkle root on server (TypeScript), store result on blockchain
- **Benefit**: No compute limits, can handle any size

#### **2. Teacher Verification**
- **Process**: 
  1. Fetch Merkle root from blockchain
  2. Get teacher's commitments from database
  3. Generate Merkle proof for each commitment
  4. Verify Merkle proof against blockchain Merkle root

#### **3. Historical Audit Trail**
- **What**: Permanent blockchain record of all survey data
- **Why**: Cryptographic proof of response integrity
- **Who**: Accreditation bodies can verify teacher performance

### Benefits:

#### **1. Cost Efficient**
- **One account** instead of 34,000 individual accounts
- **Batch storage** of all responses in one place
- **Minimal blockchain storage** (only Merkle root)

#### **2. Verifiable**
- **Cryptographic proof** of all responses
- **Immutable record** on blockchain
- **Trustless verification** for accreditation bodies

#### **3. Scalable**
- **No compute limits** (off-chain calculation)
- **Handle any size** (34,000+ responses)
- **Long-term storage** (5+ years of data)

## Prerequisites
- **Rust**: 1.70.0+
- **Solana CLI**: 1.16.0+
- **Anchor Framework**: 0.28.0+

## Installation
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.28.0
avm use 0.28.0

# Build the program
anchor build

# Deploy to localnet
anchor deploy
```

## Project Structure
```
blockchain/
├── programs/           # Solana programs
│   └── anonymous-survey/
│       ├── src/        # Program source code
│       └── Cargo.toml  # Rust dependencies
├── tests/              # Program tests
└── Anchor.toml         # Anchor configuration
```

## Program Structure

### Instructions

#### **1. Deployment (One-Time):**
```rust
// Initialize university performance account
pub fn initialize_final_root(
    ctx: Context<InitializeFinalRoot>,
    university_id: String,
) -> Result<()>
```

#### **2. Campaign Management:**
```rust
// Create new campaign for semester
pub fn create_campaign(
    ctx: Context<CreateCampaign>,
    campaign_id: String,
    semester: String,
    campaign_type: u8, // 0 = Course, 1 = Event
    blind_signature_public_key: Vec<u8>,
    encryption_public_key: Vec<u8>,
) -> Result<()>

// Submit batch responses
pub fn submit_batch_responses(
    ctx: Context<SubmitBatchResponses>,
    commitments: Vec<[u8; 32]>,
    encrypted_responses: Vec<[u8; 256]>,
) -> Result<()>

// Publish campaign results (server calculates Merkle root off-chain)
pub fn publish_campaign_results(
    ctx: Context<PublishCampaignResults>,
    merkle_root: [u8; 32], // Calculated off-chain from commitments
) -> Result<()>

// Update final hierarchical Merkle root
pub fn update_final_merkle_root(
    ctx: Context<UpdateFinalMerkleRoot>,
    final_merkle_root: [u8; 32], // Calculated off-chain from all campaign roots
) -> Result<()>
```

### Workflow:

#### **1. Deployment (One-Time):**
```rust
// Initialize university performance account
initialize_final_root(university_id: "university_001")
```

#### **2. Each Semester:**
```rust
// Create campaign for semester
create_campaign(
    campaign_id: "fall_2024_course_surveys",
    semester: "Fall 2024",
    campaign_type: 0 // Course surveys
)

// Submit batch responses (store encrypted data + commitments on-chain)
submit_batch_responses(
    commitments: Vec<[u8; 32]>,
    encrypted_responses: Vec<[u8; 256]>
)

// Admin closes survey → Server fetches from blockchain → Decrypts data → Success

// Publish campaign (server calculates Merkle root off-chain, clears encrypted data)
publish_campaign_results(merkle_root: [calculated_off_chain])
```

#### **3. Teacher Verification (Server-Side):**
```typescript
// Calculate final Merkle root from all campaign roots
function calculateFinalMerkleRoot(campaignRoots: Buffer[]): Buffer {
    // Build Merkle tree from all campaign roots
    // Return final hierarchical root
}

// Update blockchain with final root
await program.methods.updateFinalMerkleRoot(finalRoot).rpc();

// Verify teacher's commitments against final root
async function verifyTeacherCommitments(teacherId: string): Promise<boolean> {
    // 1. Fetch final Merkle root from blockchain
    // 2. Get teacher's commitments from database (decrypted)
    // 3. Generate Merkle proof for teacher's commitments
    // 4. Verify Merkle proof against final blockchain root
}
```

## Testing
```bash
# Run all tests (12 test cases)
anchor test

# Run specific test
anchor test test_name
```

### Test Coverage (12 Tests):
- **Final Root Account Tests**: Initialize and update final Merkle root
- **Campaign Management Tests**: Create and fetch campaign information
- **Response Submission Tests**: Batch response processing
- **Publishing Tests**: Campaign result publication with off-chain Merkle calculation
- **Security Tests**: Authorization and validation checks
- **Input Validation Tests**: Campaign ID, semester, and type validation
- **University Scale Test**: End-to-end workflow for 34,000+ responses

## Deployment

### Local Development
```bash
# Start local validator
solana-test-validator

# Deploy to localnet
anchor deploy
```

### Devnet
```bash
# Configure for devnet
solana config set --url devnet

# Deploy to devnet
anchor deploy
```

### Mainnet
```bash
# Configure for mainnet
solana config set --url mainnet-beta

# Deploy to mainnet
anchor deploy
```

## Program ID
```rust
declare_id!("mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq");
```

## Security Considerations
- Account validation
- Signer verification
- Merkle proof verification
- Rate limiting
- Error handling

## Integration

### Client Integration
```typescript
import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

const program = new Program(IDL, PROGRAM_ID, provider);

// 1. Initialize final root (one-time deployment)
await program.methods
  .initializeFinalRoot("university_001")
  .accounts({
    finalRoot: finalRootPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 2. Create campaign
await program.methods
  .createCampaign(
    "fall_2024_course_surveys",
    "Fall 2024",
    0, // Course surveys
    blindSignaturePublicKey,
    encryptionPublicKey
  )
  .accounts({
    campaign: campaignPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 3. Submit batch responses
await program.methods
  .submitBatchResponses(commitments, encryptedResponses)
  .accounts({
    campaign: campaignPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 4. Publish campaign results (with off-chain calculated Merkle root)
await program.methods
  .publishCampaignResults(calculatedMerkleRoot)
  .accounts({
    campaign: campaignPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 5. Update final Merkle root (periodically)
await program.methods
  .updateFinalMerkleRoot(finalMerkleRoot)
  .accounts({
    finalRoot: finalRootPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Monitoring
- Program logs
- Account changes
- Error tracking
- Performance metrics

## Related Documentation
- [Main System Overview](../README.md)
- [Backend Server](../server/SERVER_README.md)
- [Client Application](../client/CLIENT_README.md)

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT 
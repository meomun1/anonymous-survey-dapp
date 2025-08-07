# Anonymous Survey System - Blockchain Component

## Table of Contents
- [Overview](#overview)
- [Features](#features)
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
The Solana smart contract component handles the on-chain operations of the anonymous survey system, including survey metadata storage, commitment verification, and result publication. Token management is handled off-chain by the school backend to ensure complete anonymity of survey responses.

## Features
- Survey metadata storage
- Commitment verification
- Merkle tree implementation
- Result publication
- Participation tracking

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

### Accounts
```rust
#[account]
pub struct Survey {
    pub authority: Pubkey,
    pub survey_id: String,
    pub title: String,
    pub description: String,
    pub total_responses: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_published: bool,
    pub merkle_root: [u8; 32],
    pub encrypted_answers: Vec<[u8; 256]>, // RSA-2048 ciphertext is 256 bytes
    pub commitments: Vec<[u8; 32]>,        // Hash commitments are 32 bytes
    pub blind_signature_public_key: Vec<u8>, // RSA public key for blind signatures
    pub encryption_public_key: Vec<u8>,    // RSA public key for encryption
}
```

### Instructions
```rust
// Create new survey
pub fn create_survey(
    ctx: Context<CreateSurvey>,
    survey_id: String,
    title: String,
    description: String,
    blind_signature_public_key: Vec<u8>,
    encryption_public_key: Vec<u8>,
) -> Result<()>

// Submit survey response
pub fn submit_response(
    ctx: Context<SubmitResponse>,
    commitment: [u8; 32],
    encrypted_answer: [u8; 256],
) -> Result<()>

// Publish survey results
pub fn publish_results(
    ctx: Context<PublishResults>,
) -> Result<()>
```

## Testing
```bash
# Run tests
anchor test

# Run specific test
anchor test test_name
```

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
declare_id!("your_program_id");
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

// Create survey
await program.methods
  .createSurvey(surveyId, title, description, blindSignaturePublicKey, encryptionPublicKey)
  .accounts({
    survey: surveyPda,
    authority: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Submit response
await program.methods
  .submitResponse(commitment, encryptedAnswer)
  .accounts({
    survey: surveyPda,
    user: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Publish results
await program.methods
  .publishResults()
  .accounts({
    survey: surveyPda,
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
- [System Architecture](../SYSTEM_DESIGN.md)
- [Backend Server](../server/README.md)
- [Client Application](../client/README.md)
- [Documentation Standards](../DOCUMENTATION_STANDARDS.md)

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT 
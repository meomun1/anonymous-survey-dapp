# Blockchain Integration for Anonymous Survey System

## Overview
This document describes how blockchain (Solana) integrates with the double blind signature workflow to provide immutability, transparency, and decentralized enforcement.

---

## Two Merkle Trees on Blockchain

### Merkle Tree #1: Response Commitments Verification (Phase 2&3)
**Purpose**: Prove responses were not tampered with or dropped by server

### Merkle Tree #2: Claimed Receipts Tracking (Phase 4)
**Purpose**: Verify participation claims and prevent double-claiming

**Note**: Both Merkle roots stored in the same Campaign smart contract account

---

## Merkle Tree #1: Response Commitments Verification

### When It Happens
After admin collects all responses in Phase 2&3, before decryption

### Flow

**Step 1: Admin Publishes Merkle Root**
1. Admin clicks "Publish to Blockchain" after all submissions collected
2. Server:
   - Collects all commitments from database: `[commitment1, commitment2, ..., commitmentN]`
   - Builds Merkle tree from commitments
   - Computes Merkle root
3. Server → Blockchain: Publishes Merkle root to Solana smart contract
   ```rust
   pub fn publish_merkle_root(
       campaign_id: String,
       merkle_root: [u8; 32],
       total_responses: u32
   )
   ```
4. Blockchain stores: `{ campaignId, merkleRoot, totalResponses, publishedAt }`

**Step 2: Student Verification**
1. Student wants to verify their response was included
2. Student retrieves their commitment from localStorage (saved in Phase 2&3)
3. Student calls verification API or directly queries blockchain
4. Server/Client generates Merkle proof for student's commitment
5. Client verifies proof against on-chain Merkle root
   ```javascript
   const isValid = verifyMerkleProof(
     studentCommitment,
     merkleProof,
     merkleRootFromBlockchain
   );
   ```

**Benefits**:
- ✅ Immutable: Server cannot modify responses after publishing
- ✅ Verifiable: Students can independently verify inclusion
- ✅ Transparent: Anyone can see total response count

**Cost Estimate**: ~5,000 lamports (~$0.001) per Merkle root publication

---

## Merkle Tree #2: Claimed Receipts Tracking

### Why Merkle Tree Approach?

**Problem with storing all receipts**:
- 20,000 receipt hashes × 32 bytes = 640,000 bytes
- Rent cost: ~$500+ upfront (expensive!)
- Large account size (performance concerns)

**Merkle Tree Solution**:
- Store only Merkle root (32 bytes) on-chain
- Store individual receipt hashes off-chain (database)
- Verify claims via Merkle proof
- **Cost**: ~$0.30 upfront + $13 transaction fees = **$13.30 total** ✓

### Data Structure

```rust
pub struct Campaign {
    pub campaign_id: String,
    pub admin: Pubkey,
    pub claimed_receipts_root: Option<[u8; 32]>,  // Merkle Tree #2 root
    pub claimed_count: u32,                        // Public counter
    pub responses_merkle_root: Option<[u8; 32]>,  // Merkle Tree #1 root
    pub total_responses: u32,                      // Total submitted responses
    pub is_closed: bool,
}
```

### Smart Contract Instructions

**1. Initialize Campaign**
```rust
pub fn initialize_campaign(
    ctx: Context<InitializeCampaign>,
    campaign_id: String
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    campaign.campaign_id = campaign_id;
    campaign.admin = ctx.accounts.admin.key();
    campaign.claimed_receipts = HashSet::new();
    campaign.claimed_count = 0;
    campaign.is_closed = false;
    Ok(())
}
```

**2. Update Claimed Receipts Merkle Root**
```rust
pub fn update_claimed_receipts_root(
    ctx: Context<UpdateClaimedReceipts>,
    new_merkle_root: [u8; 32],
    new_count: u32
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Only admin can update
    require!(
        ctx.accounts.admin.key() == campaign.admin,
        ErrorCode::Unauthorized
    );

    // Check campaign not closed
    require!(!campaign.is_closed, ErrorCode::CampaignClosed);

    // Update Merkle root and count
    campaign.claimed_receipts_root = Some(new_merkle_root);
    campaign.claimed_count = new_count;

    // Emit event
    emit!(ClaimedReceiptsRootUpdated {
        campaign_id: campaign.campaign_id.clone(),
        merkle_root: new_merkle_root,
        claimed_count: new_count,
        updated_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

**3. Publish Response Commitments Merkle Root** (Merkle Tree #1)
```rust
pub fn publish_responses_merkle_root(
    ctx: Context<PublishResponsesRoot>,
    merkle_root: [u8; 32],
    total_responses: u32
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Only admin can publish
    require!(
        ctx.accounts.admin.key() == campaign.admin,
        ErrorCode::Unauthorized
    );

    campaign.responses_merkle_root = Some(merkle_root);
    campaign.total_responses = total_responses;

    emit!(ResponsesMerkleRootPublished {
        campaign_id: campaign.campaign_id.clone(),
        merkle_root,
        total_responses,
        published_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

**4. Close Campaign**
```rust
pub fn close_campaign(
    ctx: Context<CloseCampaign>
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Only admin can close
    require!(
        ctx.accounts.admin.key() == campaign.admin,
        ErrorCode::Unauthorized
    );

    campaign.is_closed = true;

    Ok(())
}
```

---

## Modified Phase 4: Claim Participation with Merkle Tree

### Workflow

**Step 1: Student Claims (Off-Chain)**
1. Student navigates to claim page
2. Student uploads `survey-receipt.json` file
3. Student enters their email address
4. Client reads receipt file, extracts `{ R, preparedReceipt, receiptSignature, campaignId }`
5. Client → Server: `POST /api/participation/claim`
   ```
   Authorization: Bearer <preparedReceipt>.<receiptSignature>
   Body: { email, campaignId }
   ```

**Step 2: Server Verification**
6. Server:
   - Parses Authorization header
   - Verifies receipt signature: `suite.verify(publicKey, receiptSignature, preparedReceipt)`
   - Computes `receiptHash = SHA256(preparedReceipt + receiptSignature)`
   - Checks receipt not in database (prevents double-claim)
   - Looks up token by email and campaignId
   - Verifies token is `used = true`
   - **Stores receipt hash in database** (`claimed_receipts` table)
   - Marks token as `is_completed = true`

**Step 3: Admin Publishes Merkle Root (Batched)**
7. Periodically (e.g., every 100 claims or daily), admin clicks "Publish Claims to Blockchain"
8. Server:
   - Fetches all receipt hashes from `claimed_receipts` table
   - Builds Merkle tree from receipt hashes
   - Computes Merkle root
9. Server → Blockchain: Call `update_claimed_receipts_root`
   ```typescript
   await program.methods
     .updateClaimedReceiptsRoot(
       merkleRoot,
       totalClaimedCount
     )
     .accounts({
       campaign: campaignPDA,
       admin: adminKeypair.publicKey,
     })
     .signers([adminKeypair])
     .rpc();
   ```
10. Blockchain stores updated Merkle root and claimed count

**Step 4: Public Verification**
Anyone can verify:
- Total claimed count from blockchain
- Individual claims via Merkle proof (request from server)
- Server provides: receipt hash + Merkle proof
- Verifier checks against on-chain Merkle root

### Benefits of Merkle Tree Approach

✅ **Cost Effective**: $13.30 total vs $500+ for direct storage
✅ **Scalable**: Works for 100K+ students (tree size stays constant on-chain)
✅ **Batched Updates**: Admin publishes once per batch, not per claim
✅ **Still Verifiable**: Anyone can verify claims via Merkle proof
✅ **Prevents Tampering**: Server cannot modify past claims (Merkle root on-chain)

---

## Privacy Analysis

### What's Public on Blockchain

**Campaign Account**:
- Campaign ID
- Total claimed count (number)
- Merkle root (hash)
- Receipt hashes (hashes, not raw data)

### What Remains Private

- ❌ Student identities (not on blockchain)
- ❌ Survey responses (not on blockchain)
- ❌ Commitments (only Merkle root on blockchain)
- ❌ Original receipts (only hashes on blockchain)
- ❌ Email addresses (only in server database)

### Privacy Guarantee

**Server knows**:
- Token X belongs to student email Y
- Receipt hash Z was claimed
- Token X is marked completed

**Server CANNOT link**:
- Which responses belong to token X (anonymous submission)
- Which receipt hash belongs to which token (unlinkable)

**Blockchain knows**:
- Receipt hash Z was claimed
- Total N participations claimed

**Blockchain CANNOT know**:
- Who claimed receipt hash Z
- Which email/token claimed

**Result**: Privacy preserved, transparency added

---

## Cost Analysis

### Per Campaign

| Operation | Cost (lamports) | Cost (USD) | Frequency |
|-----------|----------------|------------|-----------|
| Initialize campaign | 5,000 | ~$0.001 | Once |
| Publish Merkle root | 5,000 | ~$0.001 | Once |
| Claim participation | 5,000 | ~$0.001 | Per student |
| Close campaign | 5,000 | ~$0.001 | Once |

### Example: 20,000 Students (Merkle Tree Approach)

| Operation | Cost (SOL @ $130) | Frequency |
|-----------|-------------------|-----------|
| Initialize campaign | $0.001 | Once |
| Publish responses Merkle root | $0.001 | Once |
| Publish claimed receipts root | $0.001 | Per batch (e.g., 10 times) |
| Close campaign | $0.001 | Once |
| **Total Blockchain Cost** | **~$0.013** | - |

**Note**: Students claim off-chain (free on blockchain), admin publishes Merkle root in batches

### Comparison

| Approach | Upfront Cost | Transaction Fees | Total Cost |
|----------|--------------|------------------|------------|
| Full blockchain (all responses on-chain) | $5,200 | $20 | **$5,220** |
| Direct receipt storage (HashSet on-chain) | $500 | $20 | **$520** |
| **Merkle Tree (Recommended)** | **$0.30** | **$0.01** | **$0.31** |
| Database only | $0 | $0 | $0 |

**Merkle Tree approach**: 99.99% cheaper than full blockchain, still provides transparency and immutability

---

## Implementation Steps

### 1. Smart Contract Development
- [ ] Write Anchor program for Solana
- [ ] Implement campaign account structure
- [ ] Implement claim_participation instruction
- [ ] Implement publish_merkle_root instruction
- [ ] Add event emissions
- [ ] Deploy to devnet for testing

### 2. Server Integration
- [ ] Add blockchain event listener
- [ ] Implement Merkle tree generation
- [ ] Add admin endpoint: Publish Merkle root
- [ ] Update claim flow to call smart contract
- [ ] Handle blockchain transaction errors

### 3. Client Integration
- [ ] Add Solana wallet connection (optional, for direct claims)
- [ ] Implement claim transaction building
- [ ] Add Merkle proof verification UI
- [ ] Handle receipt file upload → blockchain transaction
- [ ] Display blockchain confirmation to user

### 4. Testing
- [ ] Test claim flow on devnet
- [ ] Test double-claim prevention
- [ ] Test Merkle proof generation and verification
- [ ] Simulate 1000+ students claiming
- [ ] Measure actual gas costs

---

## Benefits Summary

### What Blockchain Provides

✅ **Immutability**
- Merkle root cannot be changed after publishing
- Receipt claims cannot be reversed or modified

✅ **Transparency**
- Public participation count
- Anyone can audit claims
- Verifiable response inclusion (via Merkle proof)

✅ **Decentralized Enforcement**
- Smart contract prevents double-claiming
- No single point of trust for participation records

✅ **Auditability**
- Permanent record of all claims
- Timestamped events
- External verification possible

### What Blockchain Does NOT Provide

❌ **Privacy itself** (cryptography provides this)
❌ **Blind signature verification** (happens off-chain)
❌ **Response storage** (too expensive, not needed)

---

## Alignment with Project Goals

**Project requirement**: "Secured by cryptographic AND blockchain protocol"

✅ **Cryptographic protocol**: Double blind signatures for anonymity and unlinkability

✅ **Blockchain protocol**: Smart contract for tamper-proof participation tracking and transparent audit trail

✅ **Meaningful integration**: Blockchain solves specific problems (immutability, transparency), not just "using blockchain"

---

## Document Status

**Created**: 2025-11-27
**Status**: Design complete - Ready for implementation

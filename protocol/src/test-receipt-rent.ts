/**
 * TEST: Calculate Solana Rent for Receipt Storage
 *
 * Purpose: Estimate the cost of storing 20,000 receipt hashes on Solana blockchain
 *
 * Context:
 * - Each receipt hash: 32 bytes (SHA-256)
 * - 20,000 students = 20,000 receipt hashes
 * - Need to calculate rent-exempt balance
 *
 * Run: npx ts-node protocol/src/test-receipt-rent.ts
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';

// Constants
const BYTES_PER_RECEIPT = 32; // SHA-256 hash
const NUMBER_OF_STUDENTS = 20_000;

// Account overhead (Solana account metadata)
const ACCOUNT_DISCRIMINATOR = 8; // Anchor discriminator
const CAMPAIGN_ID_MAX_LEN = 64; // String with max 64 chars
const ADMIN_PUBKEY = 32; // Public key
const CLAIMED_COUNT = 4; // u32
const MERKLE_ROOT = 33; // Option<[u8; 32]> = 1 + 32
const IS_CLOSED = 1; // bool

// HashSet overhead estimation
// In Rust, HashSet has internal capacity and metadata
// Conservative estimate: ~24 bytes overhead + data
const HASHSET_OVERHEAD = 24;

async function calculateRent() {
  console.log('\n' + '='.repeat(80));
  console.log('SOLANA RENT CALCULATION FOR RECEIPT STORAGE');
  console.log('='.repeat(80) + '\n');

  // Connect to Solana
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  console.log('📊 DATA STRUCTURE BREAKDOWN\n');

  // Calculate total account size
  const accountMetadata = ACCOUNT_DISCRIMINATOR;
  const campaignIdSize = CAMPAIGN_ID_MAX_LEN;
  const adminSize = ADMIN_PUBKEY;
  const claimedCountSize = CLAIMED_COUNT;
  const merkleRootSize = MERKLE_ROOT;
  const isClosedSize = IS_CLOSED;

  console.log(`Account Discriminator:        ${accountMetadata} bytes`);
  console.log(`Campaign ID (String):         ${campaignIdSize} bytes`);
  console.log(`Admin Pubkey:                 ${adminSize} bytes`);
  console.log(`Claimed Count (u32):          ${claimedCountSize} bytes`);
  console.log(`Merkle Root (Option):         ${merkleRootSize} bytes`);
  console.log(`Is Closed (bool):             ${isClosedSize} bytes`);
  console.log(`HashSet Overhead:             ${HASHSET_OVERHEAD} bytes`);

  const staticSize = accountMetadata + campaignIdSize + adminSize +
                     claimedCountSize + merkleRootSize + isClosedSize +
                     HASHSET_OVERHEAD;

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Static Account Size:          ${staticSize} bytes`);

  // Calculate receipt data size
  const receiptsDataSize = NUMBER_OF_STUDENTS * BYTES_PER_RECEIPT;
  console.log(`\nReceipt Hashes Data:`);
  console.log(`  - ${NUMBER_OF_STUDENTS.toLocaleString()} receipts × ${BYTES_PER_RECEIPT} bytes = ${receiptsDataSize.toLocaleString()} bytes`);

  const totalAccountSize = staticSize + receiptsDataSize;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`TOTAL ACCOUNT SIZE:           ${totalAccountSize.toLocaleString()} bytes`);
  console.log(`${'─'.repeat(40)}\n`);

  // Get rent-exempt balance from Solana
  try {
    const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(totalAccountSize);
    const rentInSOL = rentExemptBalance / 1e9; // Convert lamports to SOL

    console.log('💰 RENT CALCULATION\n');
    console.log(`Rent-Exempt Balance:          ${rentExemptBalance.toLocaleString()} lamports`);
    console.log(`Rent-Exempt Balance:          ${rentInSOL.toFixed(9)} SOL`);

    // Estimate USD cost (assuming SOL = $130, adjust as needed)
    const SOL_PRICE_USD = 130;
    const costUSD = rentInSOL * SOL_PRICE_USD;
    console.log(`Estimated Cost (SOL @ $${SOL_PRICE_USD}):  $${costUSD.toFixed(2)}`);

    console.log('\n📝 NOTES\n');
    console.log('1. This is a ONE-TIME upfront cost (rent-exempt)');
    console.log('2. Rent is REFUNDABLE when account is closed');
    console.log('3. This does NOT include transaction fees for claims');
    console.log('4. HashSet overhead is estimated (actual may vary)');

    console.log('\n⚠️  IMPORTANT CONSIDERATION\n');
    console.log('For 20,000 students, account size = ~640 KB');
    console.log('Solana account size limit: 10 MB (we are well within limit)');
    console.log('However, storing all receipts in ONE account may have performance issues.');

    console.log('\n💡 ALTERNATIVE APPROACHES\n');

    // Calculate per-transaction cost
    const perClaimFee = 5000; // lamports
    const totalClaimFees = NUMBER_OF_STUDENTS * perClaimFee;
    const totalClaimFeesSOL = totalClaimFees / 1e9;
    const totalClaimFeesUSD = totalClaimFeesSOL * SOL_PRICE_USD;

    console.log('Option A: Single Large Account (Current)');
    console.log(`  - Upfront rent: ${rentInSOL.toFixed(4)} SOL ($${costUSD.toFixed(2)})`);
    console.log(`  - Claim fees: ${totalClaimFeesSOL.toFixed(4)} SOL ($${totalClaimFeesUSD.toFixed(2)})`);
    console.log(`  - TOTAL: ${(rentInSOL + totalClaimFeesSOL).toFixed(4)} SOL ($${(costUSD + totalClaimFeesUSD).toFixed(2)})`);
    console.log('  - Pros: Simple, single account');
    console.log('  - Cons: Large upfront cost, potential performance issues');

    console.log('\nOption B: Merkle Tree Approach (Recommended)');
    console.log('  - Store only Merkle root (32 bytes) on-chain');
    console.log('  - Store individual receipts off-chain (database)');
    console.log('  - Verify inclusion with Merkle proof');
    const merkleOnlySize = staticSize + 32; // Just root
    const merkleRent = await connection.getMinimumBalanceForRentExemption(merkleOnlySize);
    const merkleRentSOL = merkleRent / 1e9;
    const merkleRentUSD = merkleRentSOL * SOL_PRICE_USD;
    console.log(`  - Upfront rent: ${merkleRentSOL.toFixed(6)} SOL ($${merkleRentUSD.toFixed(4)})`);
    console.log(`  - Claim fees: ${totalClaimFeesSOL.toFixed(4)} SOL ($${totalClaimFeesUSD.toFixed(2)})`);
    console.log(`  - TOTAL: ${(merkleRentSOL + totalClaimFeesSOL).toFixed(4)} SOL ($${(merkleRentUSD + totalClaimFeesUSD).toFixed(2)})`);
    console.log('  - Pros: Very low upfront cost, scalable');
    console.log('  - Cons: Need Merkle proof generation');

    console.log('\nOption C: Hybrid - Bitmap Instead of HashSet');
    console.log('  - Use bitmap to track claimed receipts (1 bit per receipt)');
    console.log(`  - 20,000 students = 2,500 bytes (20,000 / 8)`);
    const bitmapSize = staticSize + Math.ceil(NUMBER_OF_STUDENTS / 8);
    const bitmapRent = await connection.getMinimumBalanceForRentExemption(bitmapSize);
    const bitmapRentSOL = bitmapRent / 1e9;
    const bitmapRentUSD = bitmapRentSOL * SOL_PRICE_USD;
    console.log(`  - Upfront rent: ${bitmapRentSOL.toFixed(6)} SOL ($${bitmapRentUSD.toFixed(4)})`);
    console.log(`  - Claim fees: ${totalClaimFeesSOL.toFixed(4)} SOL ($${totalClaimFeesUSD.toFixed(2)})`);
    console.log(`  - TOTAL: ${(bitmapRentSOL + totalClaimFeesSOL).toFixed(4)} SOL ($${(bitmapRentUSD + totalClaimFeesUSD).toFixed(2)})`);
    console.log('  - Pros: Much smaller than HashSet, fixed size');
    console.log('  - Cons: Requires mapping receipt hash → index');

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80) + '\n');

    console.log('🎯 Use Option B: Merkle Tree Approach');
    console.log('\nReasoning:');
    console.log('1. Minimal blockchain storage (~$0.001 upfront)');
    console.log('2. Transaction fees dominate total cost anyway');
    console.log('3. Highly scalable (works for 100K+ students)');
    console.log('4. Already needed for response verification');
    console.log('5. Can verify claims via Merkle proof + database lookup');

    console.log('\nImplementation:');
    console.log('- Smart contract stores: Merkle root of claimed receipts');
    console.log('- Database stores: Individual receipt hashes');
    console.log('- Claim process:');
    console.log('  1. Server checks receipt not in database (prevent double-claim)');
    console.log('  2. Server adds to database, updates Merkle tree');
    console.log('  3. Server publishes updated Merkle root on-chain (batched)');
    console.log('  4. Anyone can verify total claims via Merkle root');

  } catch (error) {
    console.error('Error calculating rent:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(80) + '\n');
}

// Run the calculation
calculateRent().catch(console.error);

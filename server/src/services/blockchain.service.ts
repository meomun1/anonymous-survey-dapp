import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnonymousSurvey } from '../generated/types/anonymous_survey';
import idl from '../generated/idl/anonymous_survey.json';
import { createHash } from 'crypto';

/**
 * Wallet implementation for server-side Solana operations
 */
class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}
  
  /**
   * Sign a single transaction
   * @param {any} tx - Transaction to sign
   * @returns {Promise<any>} Signed transaction
   */
  async signTransaction(tx: any) {
    tx.partialSign(this.payer);
    return tx;
  }
  
  /**
   * Sign multiple transactions
   * @param {any[]} txs - Array of transactions to sign
   * @returns {Promise<any[]>} Array of signed transactions
   */
  async signAllTransactions(txs: any[]) {
    return txs.map((tx) => {
      tx.partialSign(this.payer);
      return tx;
    });
  }
  
  /**
   * Get wallet's public key
   * @returns {PublicKey} Public key
   */
  get publicKey() {
    return this.payer.publicKey;
  }
}

/**
 * Service for interacting with the Solana blockchain anonymous survey program (University Scale)
 */
export class BlockchainService {
  private program: Program<AnonymousSurvey>;
  private provider: AnchorProvider;
  private authority: Keypair;

  /**
   * Initialize blockchain service with Solana connection and program
   */
  constructor() {
    // Initialize connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899');
    
    // Load authority keypair from KEY_SOLANA environment variable
    if (!process.env.KEY_SOLANA) {
      throw new Error('KEY_SOLANA environment variable is required');
    }
    
    const keypairData = JSON.parse(process.env.KEY_SOLANA);
    this.authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
    
    // Create wallet and provider
    const wallet = new NodeWallet(this.authority);
    this.provider = new AnchorProvider(connection, wallet, {});
    
    // Initialize program
    const programId = new PublicKey(process.env.PROGRAM_ID || 'mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq');
    this.program = new Program(idl as AnonymousSurvey, this.provider) as Program<AnonymousSurvey>;
  }

  /**
   * Create a keypair from a JSON byte array (for user keypairs)
   * @param {string} secretKeyJson - JSON string of byte array representing the secret key
   * @returns {Keypair} Keypair instance
   */
  static createKeypairFromJson(secretKeyJson: string): Keypair {
    try {
      const secretKeyArray = JSON.parse(secretKeyJson);
      return Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    } catch (error: any) {
      throw new Error(`Invalid secret key JSON format: ${error.message}`);
    }
  }

  /**
   * Get the current authority public key
   * @returns {PublicKey} Authority public key
   */
  getAuthorityPublicKey(): PublicKey {
    return this.authority.publicKey;
  }

  // ============================================================================
  // NEW BLOCKCHAIN ARCHITECTURE - Merkle Tree Approach
  // Only Merkle roots stored on-chain, NOT individual responses
  // ============================================================================

  /**
   * Get campaign PDA address
   * @param {string} campaignId - Campaign ID (max 50 chars)
   * @returns {PublicKey} Campaign PDA
   */
  /**
   * Get shortened campaign ID for use as Solana seed
   * Takes first 8 characters of UUID to fit within 32-byte limit
   */
  private getShortCampaignId(campaignId: string): string {
    return campaignId.substring(0, 8);
  }

  private getCampaignPDA(campaignId: string): PublicKey {
    // Use shortened campaign ID to fit within Solana's 32-byte seed limit
    // Full UUIDs are 36 bytes which exceeds the limit
    const shortId = this.getShortCampaignId(campaignId);

    const [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('campaign'), Buffer.from(shortId)],
      this.program.programId
    );
    return campaignPda;
  }

  /**
   * Initialize a campaign on blockchain (NEW SMART CONTRACT)
   * Only stores campaign ID, Merkle roots added later
   *
   * @param {string} campaignId - Campaign ID (max 50 chars)
   * @returns {Promise<string>} Transaction signature
   */
  async initializeCampaign(campaignId: string): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDA(campaignId);

      // Use the first 8 characters of campaign ID as a shortened version
      // This keeps it human-readable while fitting in the 32-byte seed limit
      const shortCampaignId = campaignId.substring(0, 8);

      const signature = await this.program.methods
        .initializeCampaign(shortCampaignId)
        .accounts({
          campaign: campaignPda,
          admin: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log(`✅ Campaign initialized on blockchain: ${campaignId}`);
      console.log(`   Short ID: ${shortCampaignId}`);
      console.log(`   PDA: ${campaignPda.toString()}`);
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to initialize campaign: ${error.message}`);
    }
  }

  /**
   * Publish responses Merkle root (Tree #1)
   * Called after collecting all responses off-chain
   *
   * @param {string} campaignId - Campaign ID
   * @param {string} merkleRoot - Merkle root as hex string (must be 32 bytes)
   * @param {number} totalResponses - Total number of responses
   * @returns {Promise<string>} Transaction signature
   */
  async publishResponsesMerkleRoot(
    campaignId: string,
    merkleRoot: string,
    totalResponses: number
  ): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDA(campaignId);

      // Convert hex string to [u8; 32]
      const merkleRootBytes = Buffer.from(merkleRoot, 'hex');
      if (merkleRootBytes.length !== 32) {
        throw new Error(`Merkle root must be 32 bytes, got ${merkleRootBytes.length}`);
      }

      const signature = await this.program.methods
        .publishResponsesMerkleRoot(
          Array.from(merkleRootBytes),
          totalResponses
        )
        .accounts({
          campaign: campaignPda,
          admin: this.authority.publicKey,
        } as any)
        .rpc();

      console.log(`✅ Responses Merkle root published for campaign: ${campaignId}`);
      console.log(`   Root: ${merkleRoot}`);
      console.log(`   Total responses: ${totalResponses}`);
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to publish responses Merkle root: ${error.message}`);
    }
  }

  /**
   * Update claimed receipts Merkle root (Tree #2)
   * Can be called multiple times for batched updates
   *
   * @param {string} campaignId - Campaign ID
   * @param {string} merkleRoot - Merkle root as hex string (must be 32 bytes)
   * @param {number} claimedCount - Total number of claimed receipts
   * @returns {Promise<string>} Transaction signature
   */
  async updateClaimedReceiptsRoot(
    campaignId: string,
    merkleRoot: string,
    claimedCount: number
  ): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDA(campaignId);

      // Convert hex string to [u8; 32]
      const merkleRootBytes = Buffer.from(merkleRoot, 'hex');
      if (merkleRootBytes.length !== 32) {
        throw new Error(`Merkle root must be 32 bytes, got ${merkleRootBytes.length}`);
      }

      const signature = await this.program.methods
        .updateClaimedReceiptsRoot(
          Array.from(merkleRootBytes),
          claimedCount
        )
        .accounts({
          campaign: campaignPda,
          admin: this.authority.publicKey,
        } as any)
        .rpc();

      console.log(`✅ Claimed receipts root updated for campaign: ${campaignId}`);
      console.log(`   Root: ${merkleRoot}`);
      console.log(`   Total claimed: ${claimedCount}`);
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to update claimed receipts root: ${error.message}`);
    }
  }

  /**
   * Close campaign on blockchain (prevents further updates)
   *
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<string>} Transaction signature
   */
  async closeCampaign(campaignId: string): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDA(campaignId);

      const signature = await this.program.methods
        .closeCampaign()
        .accounts({
          campaign: campaignPda,
          admin: this.authority.publicKey,
        } as any)
        .rpc();

      console.log(`✅ Campaign closed on blockchain: ${campaignId}`);
      console.log(`   Signature: ${signature}`);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to close campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign data from blockchain (NEW STRUCT)
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign data with both Merkle roots
   */
  async getCampaign(campaignId: string) {
    try {
      const campaignPda = this.getCampaignPDA(campaignId);

      // Note: struct name changed from surveyCampaign → campaign
      const campaign = await this.program.account.campaign.fetch(campaignPda);
      return campaign;
    } catch (error: any) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if campaign exists on blockchain
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<boolean>} True if campaign exists
   */
  async campaignExists(campaignId: string): Promise<boolean> {
    try {
      await this.getCampaign(campaignId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection for direct blockchain queries
   * @returns {Connection} Solana connection
   */
  getConnection(): Connection {
    return this.provider.connection;
  }

  /**
   * Get program instance for direct method calls
   * @returns {Program} Anchor program instance
   */
  getProgram(): Program<AnonymousSurvey> {
    return this.program;
  }
}
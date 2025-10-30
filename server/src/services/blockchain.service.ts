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
  // CAMPAIGN-BASED METHODS (University Scale)
  // ============================================================================

  /**
   * Initialize the final Merkle root account (university performance)
   * @param {string} universityId - University identifier
   * @returns {Promise<string>} Transaction signature
   */
  async initializeFinalRoot(universityId: string = 'international_university'): Promise<string> {
    try {
      const [universityPerformancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('university_performance'), Buffer.from(universityId)],
        this.program.programId
      );

      const signature = await this.program.methods
        .initializeFinalRoot(universityId)
        .accounts({
          finalRoot: universityPerformancePda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to initialize final root: ${error.message}`);
    }
  }

  /**
   * Helper method to get campaign PDA with short campaignId (matching blockchain program)
   * @param {string} campaignId - Campaign ID
   * @returns {PublicKey} Campaign PDA
   */
  private getCampaignPDAWithShortId(campaignId: string): PublicKey {
    const crypto = require('crypto');
    const campaignIdHash = crypto.createHash('sha256').update(campaignId).digest();
    const shortCampaignId = campaignIdHash.toString('hex').substring(0, 16);
    
    const [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('campaign'), this.authority.publicKey.toBuffer(), Buffer.from(shortCampaignId)],
      this.program.programId
    );
    return campaignPda;
  }

  /**
   * Create a new survey campaign
   * @param {Object} data - Campaign data
   * @returns {Promise<string>} Campaign PDA address
   */
  async createCampaign(data: {
    campaignId: string;
    semester: string;
    campaignType: number; // 0 = Course, 1 = Event
    blindSignaturePublicKey: Buffer;
    encryptionPublicKey: Buffer;
  }): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDAWithShortId(data.campaignId);
      
      // Use a shorter campaign_id for the blockchain program (first 16 chars of hash)
      const crypto = require('crypto');
      const campaignIdHash = crypto.createHash('sha256').update(data.campaignId).digest();
      const shortCampaignId = campaignIdHash.toString('hex').substring(0, 16); // 16 chars max

      // Use a shorter semester_id for the blockchain program (first 20 chars of hash)
      const semesterHash = crypto.createHash('sha256').update(data.semester).digest();
      const shortSemesterId = semesterHash.toString('hex').substring(0, 20); // 20 chars max (blockchain limit)

      await this.program.methods
        .createCampaign(
          shortCampaignId,
          shortSemesterId,
          data.campaignType,
          data.blindSignaturePublicKey,
          data.encryptionPublicKey
        )
        .accounts({
          campaign: campaignPda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return campaignPda.toString();
    } catch (error: any) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Submit batch responses to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Buffer[]} commitments - Array of commitment hashes
   * @param {Buffer[]} encryptedResponses - Array of encrypted responses
   * @returns {Promise<string>} Transaction signature
   */
  async submitBatchResponses(
    campaignId: string,
    commitments: Buffer[],
    encryptedResponses: Buffer[]
  ): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDAWithShortId(campaignId);

      // Convert buffers to byte arrays
      const commitmentArrays = commitments.map(commitment => Array.from(commitment));
      const responseArrays = encryptedResponses.map(response => Array.from(response));

      const signature = await this.program.methods
        .submitBatchResponses(
          commitmentArrays,
          responseArrays
        )
        .accounts({
          campaign: campaignPda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to submit batch responses: ${error.message}`);
    }
  }

  /**
   * Publish campaign results with off-chain calculated Merkle root
   * @param {string} campaignId - Campaign ID
   * @param {string} merkleRoot - Off-chain calculated Merkle root (hex string)
   * @returns {Promise<string>} Transaction signature
   */
  async publishCampaignResults(
    campaignId: string,
    merkleRoot: string
  ): Promise<string> {
    try {
      const campaignPda = this.getCampaignPDAWithShortId(campaignId);

      // Convert hex string to byte array
      const merkleRootBytes = Buffer.from(merkleRoot, 'hex');

      const signature = await this.program.methods
        .publishCampaignResults(
          Array.from(merkleRootBytes)
        )
        .accounts({
          campaign: campaignPda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to publish campaign results: ${error.message}`);
    }
  }

  /**
   * Update final Merkle root (university performance)
   * @param {string} finalMerkleRoot - Final Merkle root from all campaign roots (hex string)
   * @param {string} universityId - University identifier
   * @returns {Promise<string>} Transaction signature
   */
  async updateFinalMerkleRoot(finalMerkleRoot: string, universityId: string = 'international_university'): Promise<string> {
    try {
      const [universityPerformancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('university_performance'), Buffer.from(universityId)],
        this.program.programId
      );

      // Convert hex string to byte array
      const finalRootBytes = Buffer.from(finalMerkleRoot, 'hex');

      const signature = await this.program.methods
        .updateFinalMerkleRoot(Array.from(finalRootBytes))
        .accounts({
          finalRoot: universityPerformancePda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to update final Merkle root: ${error.message}`);
    }
  }

  /**
   * Get campaign data from blockchain
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign data
   */
  async getCampaign(campaignId: string) {
    try {
      const campaignPda = this.getCampaignPDAWithShortId(campaignId);

      const campaign = await this.program.account.surveyCampaign.fetch(campaignPda);
      return campaign;
    } catch (error: any) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  /**
   * Get university performance data from blockchain
   * @param {string} universityId - University identifier
   * @returns {Promise<Object>} University performance data
   */
  async getUniversityPerformance(universityId: string = 'international_university') {
    try {
      const [universityPerformancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('university_performance'), Buffer.from(universityId)],
        this.program.programId
      );

      const universityPerformance = await this.program.account.universityPerformance.fetch(universityPerformancePda);
      return universityPerformance;
    } catch (error: any) {
      throw new Error(`Failed to get university performance: ${error.message}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get campaign PDA address
   * @param {string} campaignId - Campaign ID
   * @returns {PublicKey} Campaign PDA
   */
  getCampaignPDA(campaignId: string): PublicKey {
    return this.getCampaignPDAWithShortId(campaignId);
  }

  /**
   * Get university performance PDA address
   * @param {string} universityId - University identifier
   * @returns {PublicKey} University performance PDA
   */
  getUniversityPerformancePDA(universityId: string = 'university_001'): PublicKey {
    const [universityPerformancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('university_performance'), Buffer.from(universityId)],
      this.program.programId
    );
    return universityPerformancePda;
  }

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
   * Check if university performance account exists on blockchain
   * @param {string} universityId - University identifier
   * @returns {Promise<boolean>} True if account exists
   */
  async universityPerformanceExists(universityId: string = 'international_university'): Promise<boolean> {
    try {
      await this.getUniversityPerformance(universityId);
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
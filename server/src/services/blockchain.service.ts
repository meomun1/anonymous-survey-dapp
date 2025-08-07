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
 * Service for interacting with the Solana blockchain anonymous survey program
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
   * Validate survey creation parameters
   * @param {string} surveyId - Survey ID to validate
   * @param {string} title - Survey title to validate
   * @param {string} description - Survey description to validate
   */
  private validateSurveyParams(surveyId: string, title: string, description: string) {
    if (!surveyId || surveyId.length > 50) {
      throw new Error('Survey ID must be 1-50 characters long');
    }
    if (!title || title.length > 100) {
      throw new Error('Title must be 1-100 characters long');
    }
    if (!description || description.length > 500) {
      throw new Error('Description must be 1-500 characters long');
    }
  }

  /**
   * Validate public key size
   * @param {Buffer} publicKey - Public key to validate
   * @param {string} name - Key name for error messages
   */
  private validatePublicKey(publicKey: Buffer, name: string) {
    if (!publicKey || publicKey.length > 300) {
      throw new Error(`${name} must be provided and no more than 300 bytes`);
    }
  }

  /**
   * Validate response submission parameters
   * @param {Buffer} commitment - Commitment hash to validate
   * @param {Buffer} encryptedAnswer - Encrypted answer to validate
   */
  private validateResponseParams(commitment: Buffer, encryptedAnswer: Buffer) {
    if (!commitment || commitment.length !== 32) {
      throw new Error('Commitment must be exactly 32 bytes');
    }
    if (!encryptedAnswer || encryptedAnswer.length !== 256) {
      throw new Error('Encrypted answer must be exactly 256 bytes');
    }
  }

  /**
   * Create a new survey on the blockchain
   * @param {string} surveyId - Unique survey identifier (shortId)
   * @param {string} title - Survey title
   * @param {string} description - Survey description
   * @param {Buffer} blindSignaturePublicKey - Public key for blind signatures
   * @param {Buffer} encryptionPublicKey - Public key for encryption
   * @returns {Promise<PublicKey>} Survey PDA address
   */
  async createSurvey(
    surveyId: string,
    title: string,
    description: string,
    blindSignaturePublicKey: Buffer,
    encryptionPublicKey: Buffer
  ): Promise<PublicKey> {
    try {
      // Validate inputs
      this.validateSurveyParams(surveyId, title, description);
      this.validatePublicKey(blindSignaturePublicKey, 'Blind signature public key');
      this.validatePublicKey(encryptionPublicKey, 'Encryption public key');

      // Find PDA for survey - using shortId directly (no truncation needed)
      const surveyIdBytes = Buffer.from(surveyId, 'utf8');
      const [surveyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('survey'),
          this.authority.publicKey.toBuffer(),
          surveyIdBytes
        ],
        this.program.programId
      );

      // Create survey on blockchain - authority is automatically signed by the provider
      await this.program.methods
        .createSurvey(
          surveyId,
          title,
          description,
          blindSignaturePublicKey,
          encryptionPublicKey
        )
        .accounts({
          survey: surveyPda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return surveyPda;
    } catch (error: any) {
      // Parse Anchor errors for better debugging
      if (error.error?.errorCode) {
        throw new Error(`Blockchain error: ${error.error.errorMessage || error.error.errorCode.code}`);
      }
      throw new Error(`Failed to create survey on blockchain: ${error.message}`);
    }
  }

  /**
   * Publish survey results on blockchain
   * @param {string} surveyId - Survey ID to publish (shortId)
   * @returns {Promise<string>} Transaction signature
   */
  async publishResults(surveyId: string): Promise<string> {
    try {
      if (!surveyId) {
        throw new Error('Survey ID is required');
      }

      // Find PDA for survey - using shortId directly
      const surveyIdBytes = Buffer.from(surveyId, 'utf8');
      const [surveyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('survey'),
          this.authority.publicKey.toBuffer(),
          surveyIdBytes
        ],
        this.program.programId
      );

      // Publish results on blockchain - authority is automatically signed by the provider
      const signature = await this.program.methods
        .publishResults()
        .accounts({
          survey: surveyPda,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      return signature;
    } catch (error: any) {
      // Parse Anchor errors for better debugging
      if (error.error?.errorCode) {
        throw new Error(`Blockchain error: ${error.error.errorMessage || error.error.errorCode.code}`);
      }
      throw new Error(`Failed to publish results on blockchain: ${error.message}`);
    }
  }

  /**
   * Get survey data from blockchain
   * @param {string} surveyId - Survey ID to fetch (shortId)
   * @returns {Promise<{pda: PublicKey, data: any}>} Survey account data
   */
  async getSurvey(surveyId: string) {
    try {
      if (!surveyId) {
        throw new Error('Survey ID is required');
      }

      // Find PDA for survey - using shortId directly
      const surveyIdBytes = Buffer.from(surveyId, 'utf8');
      const [surveyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('survey'),
          this.authority.publicKey.toBuffer(),
          surveyIdBytes
        ],
        this.program.programId
      );

      // Fetch survey data from blockchain
      const surveyAccount = await this.program.account.survey.fetch(surveyPda);
      return {
        pda: surveyPda,
        data: surveyAccount
      };
    } catch (error: any) {
      if (error.message.includes('Account does not exist')) {
        throw new Error(`Survey with ID '${surveyId}' not found`);
      }
      throw new Error(`Failed to get survey from blockchain: ${error.message}`);
    }
  }

  /**
   * Submit encrypted response to blockchain
   * @param {string} surveyId - Survey ID to submit to (shortId)
   * @param {Buffer} commitment - Answer commitment hash
   * @param {Buffer} encryptedAnswer - Encrypted answer
   * @param {Keypair} userKeypair - User's keypair for signing
   * @returns {Promise<string>} Transaction signature
   */
  async submitResponse(
    surveyId: string,
    commitment: Buffer,
    encryptedAnswer: Buffer,
    userKeypair: Keypair
  ): Promise<string> {
    try {
      if (!surveyId) {
        throw new Error('Survey ID is required');
      }
      
      // Validate response parameters
      this.validateResponseParams(commitment, encryptedAnswer);

      // Find PDA for survey - using shortId directly
      const surveyIdBytes = Buffer.from(surveyId, 'utf8');
      const [surveyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('survey'),
          this.authority.publicKey.toBuffer(),
          surveyIdBytes
        ],
        this.program.programId
      );

      // Convert buffers to fixed-size arrays (exactly what smart contract expects)
      const commitmentArray: number[] = Array.from(commitment);
      const encryptedAnswerArray: number[] = Array.from(encryptedAnswer);

      // Submit response to blockchain
      const signature = await this.program.methods
        .submitResponse(commitmentArray, encryptedAnswerArray)
        .accounts({
          survey: surveyPda,
          user: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([userKeypair])  // User keypair signs the transaction
        .rpc();

      return signature;
    } catch (error: any) {
      // Parse Anchor errors for better debugging
      if (error.error?.errorCode) {
        const errorCode = error.error.errorCode.code;
        const errorMsg = error.error.errorMessage;
        
        switch (errorCode) {
          case 'SurveyFull':
            throw new Error('Survey has reached maximum response limit');
          case 'SurveyAlreadyPublished':
            throw new Error('Cannot submit response to already published survey');
          default:
            throw new Error(`Blockchain error: ${errorMsg || errorCode}`);
        }
      }
      throw new Error(`Failed to submit response to blockchain: ${error.message}`);
    }
  }

  /**
   * Submit encrypted response with user keypair from JSON string
   * @param {string} surveyId - Survey ID to submit to
   * @param {Buffer} commitment - Answer commitment hash
   * @param {Buffer} encryptedAnswer - Encrypted answer
   * @param {string} userKeyJson - JSON string of user's keypair byte array
   * @returns {Promise<string>} Transaction signature
   */
  async submitResponseWithUserJson(
    surveyId: string,
    commitment: Buffer,
    encryptedAnswer: Buffer,
    userKeyJson: string
  ): Promise<string> {
    const userKeypair = BlockchainService.createKeypairFromJson(userKeyJson);
    return await this.submitResponse(surveyId, commitment, encryptedAnswer, userKeypair);
  }

  /**
   * Submit encrypted response using authority as both signer and fee payer
   * This ensures the school (authority) pays all transaction costs
   * @param {string} surveyId - Survey ID to submit to (shortId)
   * @param {Buffer} commitment - Answer commitment hash
   * @param {Buffer} encryptedAnswer - Encrypted answer
   * @returns {Promise<string>} Transaction signature
   */
  async submitResponseAsAuthority(
    surveyId: string,
    commitment: Buffer,
    encryptedAnswer: Buffer
  ): Promise<string> {
    try {
      if (!surveyId) {
        throw new Error('Survey ID is required');
      }
      
      // Validate response parameters
      this.validateResponseParams(commitment, encryptedAnswer);

      // Find PDA for survey - using shortId directly
      const surveyIdBytes = Buffer.from(surveyId, 'utf8');
      const [surveyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('survey'),
          this.authority.publicKey.toBuffer(),
          surveyIdBytes
        ],
        this.program.programId
      );

      // Convert buffers to fixed-size arrays (exactly what smart contract expects)
      const commitmentArray: number[] = Array.from(commitment);
      const encryptedAnswerArray: number[] = Array.from(encryptedAnswer);

      // Submit response using authority as both user and fee payer
      // This is appropriate for anonymous surveys where school pays all costs
      const signature = await this.program.methods
        .submitResponse(commitmentArray, encryptedAnswerArray)
        .accounts({
          survey: surveyPda,
          user: this.authority.publicKey, // Authority acts as the user
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc(); // Authority automatically signs and pays fees

      return signature;
    } catch (error: any) {
      // Parse Anchor errors for better debugging
      if (error.error?.errorCode) {
        const errorCode = error.error.errorCode.code;
        const errorMsg = error.error.errorMessage;
        
        switch (errorCode) {
          case 'SurveyFull':
            throw new Error('Survey has reached maximum response limit');
          case 'SurveyAlreadyPublished':
            throw new Error('Cannot submit response to already published survey');
          default:
            throw new Error(`Blockchain error: ${errorMsg || errorCode}`);
        }
      }
      throw new Error(`Failed to submit response to blockchain: ${error.message}`);
    }
  }

  /**
   * Get the current authority public key
   * @returns {PublicKey} Authority public key
   */
  getAuthorityPublicKey(): PublicKey {
    return this.authority.publicKey;
  }
}
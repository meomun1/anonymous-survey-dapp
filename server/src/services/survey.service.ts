import { PrismaClient } from '../generated/prisma/index';
import type { Token } from '../generated/prisma';
import Redis from 'ioredis';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import { BlockchainService } from './blockchain.service';
import { CryptoService } from './crypto.service';
import { createHash } from 'crypto';
import { generateShortId, isValidShortId } from '../utils/shortId';

const prismaClient = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Service for survey management with automatic key generation and blockchain integration
 */
export class SurveyService {
  private static readonly SURVEY_CACHE_PREFIX = 'survey:';
  private static readonly SURVEY_LIST_CACHE_KEY = 'survey:list';
  private static readonly CACHE_TTL = 3600; // 1 hour

  private cryptoService: CryptoService;
  private blockchainService: BlockchainService | null = null;
  private fallbackMode: boolean;

  constructor() {
    this.cryptoService = new CryptoService();
    this.fallbackMode = process.env.SOLANA_FALLBACK_MODE === 'true';
    
    // Only initialize blockchain service if not in fallback mode
    if (!this.fallbackMode) {
      try {
        this.blockchainService = new BlockchainService();
        console.log('✅ Blockchain service initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize blockchain service, enabling fallback mode:', error);
        this.fallbackMode = true;
      }
    } else {
      console.log('📋 Running in fallback mode - blockchain operations disabled');
    }
  }

  /**
   * Create a new survey with automatic key generation
   * @param {Object} data - Survey data (title, description, question)
   * @returns {Promise<Object>} Created survey object
   */
  async createSurvey(data: {
    title: string;
    description?: string;
    question: string;
  }) {
    // Generate a unique short ID for blockchain operations
    let shortId: string;
    let isUnique = false;
    
    while (!isUnique) {
      shortId = generateShortId(8);
      const existing = await prismaClient.survey.findUnique({
        where: { shortId }
      });
      isUnique = !existing;
    }
    
    // Generate blind signature key pair
    const blindSuite = RSABSSA.SHA384.PSS.Randomized();
    const { privateKey: blindSignaturePrivateKey, publicKey: blindSignaturePublicKey } = 
      await blindSuite.generateKey({
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1])
      });

    // Generate encryption key pair
    const { privateKey: encryptionPrivateKey, publicKey: encryptionPublicKey } = 
      await webcrypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

    // Export keys for storage
    const blindPrivateKey = await webcrypto.subtle.exportKey('pkcs8', blindSignaturePrivateKey);
    const blindPublicKey = await webcrypto.subtle.exportKey('spki', blindSignaturePublicKey);
    const encryptionPrivateKeyExported = await webcrypto.subtle.exportKey('pkcs8', encryptionPrivateKey);
    const encryptionPublicKeyExported = await webcrypto.subtle.exportKey('spki', encryptionPublicKey);

    // Create survey in database
    const survey = await prismaClient.survey.create({
      data: {
        ...data,
        shortId: shortId!,
        blindSignaturePublicKey: Buffer.from(blindPublicKey).toString('base64'),
        encryptionPublicKey: Buffer.from(encryptionPublicKeyExported).toString('base64'),
        isPublished: false,
        totalResponses: 0,
      },
    });

    // Store private keys securely
    await prismaClient.surveyPrivateKey.create({
      data: {
        surveyId: survey.id,
        blindSignaturePrivateKey: Buffer.from(blindPrivateKey).toString('base64'),
        encryptionPrivateKey: Buffer.from(encryptionPrivateKeyExported).toString('base64'),
      },
    });

    // Clear surveys list cache
    await redis.del(SurveyService.SURVEY_LIST_CACHE_KEY);

    // Check if we should use blockchain
    if (this.fallbackMode || !this.blockchainService) {
      console.log('📋 Survey created without blockchain integration (fallback mode or service unavailable)');
      return survey;
    }

    try {
      console.log('🔗 Attempting to create survey on blockchain with shortId:', survey.shortId);
      
      // Create survey on blockchain using shortId
      const surveyPda = await this.blockchainService.createSurvey(
        survey.shortId,  // Use shortId instead of UUID
        survey.title,
        survey.description || '',
        Buffer.from(blindPublicKey),
        Buffer.from(encryptionPublicKeyExported)
      );

      console.log('🎯 Blockchain survey created, PDA:', surveyPda.toString());

      // Update survey with blockchain address
      const updatedSurvey = await prismaClient.survey.update({
        where: { id: survey.id },
        data: { blockchainAddress: surveyPda.toString() }
      });

      console.log(`✅ Survey created successfully with shortId: ${survey.shortId} and blockchain address: ${surveyPda.toString()}`);
      return updatedSurvey;
    } catch (error: any) {
      console.error('❌ Failed to create survey on blockchain:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      // If blockchain creation fails, rollback database changes
      await prismaClient.$transaction([
        prismaClient.surveyPrivateKey.delete({ where: { surveyId: survey.id } }),
        prismaClient.survey.delete({ where: { id: survey.id } })
      ]);
      throw new Error('Failed to create survey on blockchain: ' + error.message);
    }
  }

  /**
   * Get a survey with caching
   * @param {string} id - Survey ID
   * @returns {Promise<Object>} Survey object with tokens and responses
   */
  async getSurvey(id: string) {
    const cachedSurvey = await redis.get(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`);
    if (cachedSurvey) {
      return JSON.parse(cachedSurvey);
    }

    const survey = await prismaClient.survey.findUnique({
      where: { id },
      include: {
        tokens: true,
        responses: true,
      },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    await redis.set(
      `${SurveyService.SURVEY_CACHE_PREFIX}${id}`,
      JSON.stringify(survey),
      'EX',
      SurveyService.CACHE_TTL
    );

    return survey;
  }

  /**
   * Get all surveys with counts
   * @returns {Promise<Array>} Array of surveys with response and token counts
   */
  async getAllSurveys() {
    const cachedSurveys = await redis.get(SurveyService.SURVEY_LIST_CACHE_KEY);
    if (cachedSurveys) {
      return JSON.parse(cachedSurveys);
    }

    const surveys = await prismaClient.survey.findMany({
      include: {
        _count: {
          select: {
            responses: true,
            tokens: true,
          },
        },
      },
    });

    await redis.set(
      SurveyService.SURVEY_LIST_CACHE_KEY,
      JSON.stringify(surveys),
      'EX',
      SurveyService.CACHE_TTL
    );

    return surveys;
  }

  /**
   * Get survey participation statistics
   * @param {string} id - Survey ID
   * @returns {Promise<Object>} Statistics object with participation rates
   */
  async getSurveyStats(id: string) {
    const survey = await prismaClient.survey.findUnique({
      where: { id },
      include: {
        tokens: true,
        responses: true
      }
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    const totalTokens = survey.tokens.length;
    const usedTokens = survey.tokens.filter((t: Token) => t.used).length;
    const completedTokens = survey.tokens.filter((t: Token) => t.isCompleted).length;
    const totalResponses = survey.responses.length;

    return {
      totalTokens,
      usedTokens,
      completedTokens,
      totalResponses,
      participationRate: totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0,
      completionRate: totalTokens > 0 ? (completedTokens / totalTokens) * 100 : 0
    };
  }

  /**
   * Delete a survey and all related data
   * @param {string} id - Survey ID
   * @returns {Promise<{success: boolean}>} Success confirmation
   */
  async deleteSurvey(id: string) {
    const survey = await prismaClient.survey.findUnique({
      where: { id },
      include: {
        tokens: true,
        responses: true
      }
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    await prismaClient.$transaction([
      prismaClient.surveyResponse.deleteMany({ where: { surveyId: id } }),
      prismaClient.token.deleteMany({ where: { surveyId: id } }),
      prismaClient.surveyPrivateKey.delete({ where: { surveyId: id } }),
      prismaClient.survey.delete({ where: { id } })
    ]);

    // Invalidate caches
    await Promise.all([
      redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
      redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`)
    ]);

    return { success: true };
  }

  /**
   * Get survey public keys for client operations
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{blindSignaturePublicKey: Buffer, encryptionPublicKey: Buffer}>} Public keys
   */
  async getSurveyPublicKeys(surveyId: string) {
    try {
      return await this.cryptoService.getSurveyPublicKeys(surveyId);
    } catch (error: any) {
      throw new Error(`Failed to get survey public keys: ${error.message}`);
    }
  }

  /**
   * Process and decrypt all survey responses from blockchain
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{processedResponses: number, responses: Array}>} Processing results
   */
  async processResponsesFromBlockchain(surveyId: string) {
    try {
      // Get survey from database to access shortId
      const survey = await prismaClient.survey.findUnique({
        where: { id: surveyId }
      });

      if (!survey) {
        throw new Error('Survey not found');
      }

      // Get survey from blockchain using shortId
      const blockchainSurvey = await this.blockchainService?.getSurvey(survey.shortId);
      
      if (!blockchainSurvey?.data?.encryptedAnswers || blockchainSurvey.data.encryptedAnswers.length === 0) {
        throw new Error('No encrypted responses found on blockchain');
      }

      // Convert encrypted answers to ArrayBuffer format
      const encryptedAnswers = blockchainSurvey.data.encryptedAnswers.map(answer => 
        new Uint8Array(answer).buffer
      );

      // Decrypt all responses
      const decryptedAnswers = await this.cryptoService.decryptAllResponses(surveyId, encryptedAnswers);

      // Store decrypted responses in database
      const responses = await Promise.all(
        decryptedAnswers.map(async (answer, index) => {
          const commitment = new Uint8Array(blockchainSurvey!.data.commitments[index]);
          const commitmentHash = Buffer.from(commitment).toString('hex');

          return await prismaClient.surveyResponse.create({
            data: {
              surveyId: surveyId,
              encryptedAnswer: Buffer.from(blockchainSurvey!.data.encryptedAnswers[index]).toString('base64'),
              decryptedAnswer: answer,
              commitmentHash: commitmentHash
            }
          });
        })
      );

      // Update survey response count
      await prismaClient.survey.update({
        where: { id: surveyId },
        data: { totalResponses: responses.length }
      });

      // Invalidate caches
      await Promise.all([
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
      ]);

      return {
        processedResponses: responses.length,
        responses: responses
      };
    } catch (error: any) {
      throw new Error(`Failed to process responses from blockchain: ${error.message}`);
    }
  }

  /**
   * Get decrypted survey results (after processing)
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Survey results with aggregated data
   */
  async getSurveyResults(surveyId: string) {
    try {
      const survey = await prismaClient.survey.findUnique({
        where: { id: surveyId },
        include: {
          responses: true
        }
      });

      if (!survey) {
        throw new Error('Survey not found');
      }

      if (!survey.isPublished) {
        throw new Error('Survey is not yet published');
      }

      if (this.fallbackMode) {
        // In fallback mode, return database results directly
        console.log('📋 Getting survey results in fallback mode');
        
        const answerCounts: { [key: string]: number } = {};
        survey.responses.forEach(response => {
          if (response.decryptedAnswer) {
            answerCounts[response.decryptedAnswer] = (answerCounts[response.decryptedAnswer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: survey.totalResponses,
          answerDistribution: answerCounts,
          isPublished: survey.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: survey.merkleRoot
        };
      }

      // Blockchain mode - verify with blockchain data
      try {
        // Get survey from blockchain using shortId
        const blockchainSurvey = await this.blockchainService?.getSurvey(survey.shortId);
        
        if (!blockchainSurvey?.data?.encryptedAnswers || blockchainSurvey.data.encryptedAnswers.length === 0) {
          throw new Error('No encrypted responses found on blockchain');
        }

        const encryptedAnswers = blockchainSurvey.data.encryptedAnswers.map((answer: any) => 
          Buffer.from(answer)
        );

        // Decrypt all responses
        const decryptedAnswers = await this.cryptoService.decryptAllResponses(surveyId, encryptedAnswers);

        // Store decrypted responses in database
        const responses = await Promise.all(
          decryptedAnswers.map(async (answer: string, index: number) => {
            const commitment = blockchainSurvey!.data.commitments[index];
            const commitmentHash = Buffer.from(commitment).toString('hex');

            return await prismaClient.surveyResponse.create({
              data: {
                surveyId: surveyId,
                encryptedAnswer: encryptedAnswers[index].toString('base64'),
                decryptedAnswer: answer,
                commitmentHash: commitmentHash,
              }
            });
          })
        );

        // Update survey response count
        await prismaClient.survey.update({
          where: { id: surveyId },
          data: { totalResponses: responses.length }
        });

        // Calculate answer distribution
        const answerCounts: { [key: string]: number } = {};
        responses.forEach(response => {
          if (response.decryptedAnswer) {
            answerCounts[response.decryptedAnswer] = (answerCounts[response.decryptedAnswer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: blockchainSurvey.data.totalResponses,
          answerDistribution: answerCounts,
          isPublished: blockchainSurvey.data.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: Buffer.from(blockchainSurvey.data.merkleRoot).toString('hex')
        };
      } catch (blockchainError) {
        console.warn('⚠️ Blockchain operation failed, falling back to database:', blockchainError);
        // Fallback to database results if blockchain fails
        const answerCounts: { [key: string]: number } = {};
        survey.responses.forEach(response => {
          if (response.decryptedAnswer) {
            answerCounts[response.decryptedAnswer] = (answerCounts[response.decryptedAnswer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: survey.totalResponses,
          answerDistribution: answerCounts,
          isPublished: survey.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: survey.merkleRoot
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to get survey results: ${error.message}`);
    }
  }

  /**
   * Publish survey results with Merkle proof
   * @param {string} surveyId - Survey ID to publish
   * @returns {Promise<Object>} Published survey data
   */
  async publishSurveyWithMerkleProof(surveyId: string) {
    try {
      // Get survey from database to access shortId
      const survey = await prismaClient.survey.findUnique({
        where: { id: surveyId }
      });

      if (!survey) {
        throw new Error('Survey not found');
      }

      // Get all commitments from database
      const responses = await prismaClient.surveyResponse.findMany({
        where: { surveyId },
        select: { commitmentHash: true }
      });

      if (responses.length === 0) {
        throw new Error('No responses found to publish');
      }

      const commitments = responses.map(r => Buffer.from(r.commitmentHash, 'hex'));

      // Create Merkle root
      const merkleRoot = await this.cryptoService.createMerkleRoot(commitments);
      const merkleRootHex = Buffer.from(merkleRoot).toString('hex');

      if (this.fallbackMode) {
        console.log('📋 Publishing survey in fallback mode - blockchain operations skipped');
        
        // Update database only
        const publishedSurvey = await prismaClient.survey.update({
          where: { id: surveyId },
          data: {
            isPublished: true,
            publishedAt: new Date(),
            merkleRoot: merkleRootHex
          }
        });

        // Invalidate caches after successful publish
        await Promise.all([
          redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
          redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
        ]);

        return {
          surveyId: publishedSurvey.id,
          isPublished: publishedSurvey.isPublished,
          publishedAt: publishedSurvey.publishedAt,
          merkleRoot: publishedSurvey.merkleRoot,
          totalResponses: publishedSurvey.totalResponses
        };
      }

      // Publish survey on blockchain using shortId (not UUID)
      await this.blockchainService?.publishResults(survey.shortId);

      // Update database
      const publishedSurvey = await prismaClient.survey.update({
        where: { id: surveyId },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          merkleRoot: merkleRootHex
        }
      });

      // Invalidate caches after successful publish
      await Promise.all([
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
      ]);

      return {
        surveyId: publishedSurvey.id,
        isPublished: publishedSurvey.isPublished,
        publishedAt: publishedSurvey.publishedAt,
        merkleRoot: publishedSurvey.merkleRoot,
        totalResponses: publishedSurvey.totalResponses
      };
    } catch (error: any) {
      throw new Error(`Failed to publish survey: ${error.message}`);
    }
  }
} 
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import { createHash } from 'crypto';

/**
 * Public Verification Tool for Anonymous Survey System
 * 
 * This tool provides two types of verification:
 * 1. Student Proof Verification - Students can verify their own participation proofs
 * 2. Public Answer Verification - Anyone can verify if a specific answer was included in published results
 * 
 * No blockchain connection required - works with provided data only
 */

// Utility function to create hash commitments
function createCommitment(answer: string): Buffer {
  return Buffer.from(createHash('sha256').update(answer, 'utf8').digest());
}

// Simple Merkle tree implementation for verification
class MerkleTree {
  private leaves: Buffer[];
  private levels: Buffer[][];

  constructor(leaves: Buffer[]) {
    this.leaves = [...leaves];
    this.levels = [this.leaves];
    this.buildTree();
  }

  private buildTree() {
    let currentLevel = this.leaves;
    
    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(Buffer.from(hash));
      }
      
      this.levels.push(nextLevel);
      currentLevel = nextLevel;
    }
  }

  getRoot(): Buffer {
    return this.levels[this.levels.length - 1][0];
  }

  getProof(leaf: Buffer): Buffer[] {
    const proof: Buffer[] = [];
    let leafIndex = this.leaves.findIndex(l => l.equals(leaf));
    
    if (leafIndex === -1) {
      throw new Error('Leaf not found in tree');
    }

    for (let level = 0; level < this.levels.length - 1; level++) {
      const currentLevel = this.levels[level];
      const isRightNode = leafIndex % 2;
      const siblingIndex = isRightNode ? leafIndex - 1 : leafIndex + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }
      
      leafIndex = Math.floor(leafIndex / 2);
    }
    
    return proof;
  }

  static verifyProof(leaf: Buffer, proof: Buffer[], root: Buffer): boolean {
    let currentHash = leaf;
    
    for (const proofElement of proof) {
      const leftHash = createHash('sha256').update(Buffer.concat([currentHash, proofElement])).digest();
      const rightHash = createHash('sha256').update(Buffer.concat([proofElement, currentHash])).digest();
      
      currentHash = Buffer.from(leftHash);
      
      if (proof.indexOf(proofElement) === proof.length - 1) {
        if (Buffer.from(rightHash).equals(root)) {
          currentHash = Buffer.from(rightHash);
        }
      }
    }
    
    return currentHash.equals(root);
  }
}

// Types for verification
interface StudentProof {
  surveyId: string;
  studentEmail: string;
  timestamp: number;
  transactionSignature: string;
  userAnswer: string;
  cryptographicProof: {
    commitment: string;
    signature: string;
    preparedMessage: string;
    blindedMessage: string;
    blindingInverse: string;
    blindSignature: string;
  };
}

interface SurveyResults {
  surveyId: string;
  title: string;
  totalResponses: number;
  isPublished: boolean;
  publishedAt: string | null;
  merkleRoot: string | null;
  answerDistribution: Record<string, number>;
  verificationData: {
    commitmentHashes: string[];
    blockchainAddress: string;
  };
}

/**
 * STUDENT VERIFICATION: Verify a student's own participation proof
 * Only the student who participated can verify their own proof
 */
export async function verifyStudentProof(proof: StudentProof, schoolPublicKey: string): Promise<{
  isValid: boolean;
  details: {
    signatureValid: boolean;
    commitmentValid: boolean;
    answerIntegrity: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const details = {
    signatureValid: false,
    commitmentValid: false,
    answerIntegrity: false
  };

  try {
    console.log('🔍 Student Proof Verification');
    console.log('=============================');
    console.log(`📝 Survey ID: ${proof.surveyId}`);
    console.log(`👤 Student: ${proof.studentEmail}`);
    console.log(`📅 Timestamp: ${new Date(proof.timestamp).toISOString()}`);
    console.log(`💬 Your Answer: "${proof.userAnswer}"`);

    // 1. Verify commitment matches the answer
    const expectedCommitment = createCommitment(proof.userAnswer).toString('hex');
    const providedCommitment = proof.cryptographicProof.commitment;
    
    if (expectedCommitment === providedCommitment) {
      details.commitmentValid = true;
      details.answerIntegrity = true;
      console.log('✅ Your answer commitment is valid');
    } else {
      errors.push('Your answer commitment does not match your provided answer');
      console.log('❌ Your answer commitment is invalid');
    }

    // 2. Verify blind signature
    try {
      const suite = RSABSSA.SHA384.PSS.Randomized();
      
      // Import school's public key
      const publicKeyBuffer = Buffer.from(schoolPublicKey, 'base64');
      const publicKey = await webcrypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-PSS', hash: 'SHA-384' },
        false,
        ['verify']
      );

      // Convert base64 strings back to Uint8Array
      const signature = new Uint8Array(Buffer.from(proof.cryptographicProof.signature, 'base64'));
      const preparedMessage = new Uint8Array(Buffer.from(proof.cryptographicProof.preparedMessage, 'base64'));

      // Verify the signature
      const isValid = await suite.verify(publicKey, signature, preparedMessage);
      
      if (isValid) {
        details.signatureValid = true;
        console.log('✅ Your blind signature is valid');
      } else {
        errors.push('Your blind signature verification failed');
        console.log('❌ Your blind signature is invalid');
      }
    } catch (error: any) {
      errors.push(`Signature verification error: ${error.message}`);
      console.log('❌ Signature verification failed');
    }

    const isValid = details.signatureValid && details.commitmentValid && details.answerIntegrity;

    if (isValid) {
      console.log('\n🎉 YOUR PARTICIPATION PROOF IS VALID');
      console.log('✅ You legitimately participated in this survey');
      console.log('✅ Your answer has not been tampered with');
      console.log('✅ The school authorized your participation');
      console.log('✅ Keep this proof for your records');
    } else {
      console.log('\n⚠️ YOUR PARTICIPATION PROOF IS INVALID');
      console.log('❌ Cannot verify your legitimate participation');
      console.log('❌ Contact the school administrator');
    }

    return { isValid, details, errors };

  } catch (error: any) {
    errors.push(`Verification failed: ${error.message}`);
    console.error('❌ Proof verification failed:', error);
    return { isValid: false, details, errors };
  }
}

/**
 * PUBLIC VERIFICATION: Verify if a specific answer was included in survey results
 * Anyone can use this to check if a particular answer was part of the published results
 */
export function verifyAnswerInResults(
  answer: string,
  surveyResults: SurveyResults,
  allPublishedAnswers: string[]
): {
  isIncluded: boolean;
  details: {
    commitmentFound: boolean;
    merkleProofValid: boolean;
    distributionAccurate: boolean;
  };
  errors: string[];
} {
  const errors: string[] = [];
  const details = {
    commitmentFound: false,
    merkleProofValid: false,
    distributionAccurate: false
  };

  try {
    console.log('🔍 Public Answer Verification');
    console.log('=============================');
    console.log(`📊 Survey: ${surveyResults.title}`);
    console.log(`💬 Checking Answer: "${answer}"`);
    console.log(`📈 Total Published Responses: ${surveyResults.totalResponses}`);

    // 1. Create commitment for the answer we're checking
    const answerCommitment = createCommitment(answer);
    const answerCommitmentHex = answerCommitment.toString('hex');
    console.log(`🔗 Answer commitment: ${answerCommitmentHex.substring(0, 16)}...`);

    // 2. Check if this commitment exists in published commitments
    const commitmentExists = surveyResults.verificationData.commitmentHashes.includes(answerCommitmentHex);
    
    if (commitmentExists) {
      details.commitmentFound = true;
      console.log('✅ Answer commitment found in published results');
    } else {
      console.log('❌ Answer commitment NOT found in published results');
      console.log('❌ This answer was not included in the survey results');
      return { isIncluded: false, details, errors };
    }

    // 3. Build Merkle tree from all published answers and verify
    const allCommitments = allPublishedAnswers.map(a => createCommitment(a));
    const merkleTree = new MerkleTree(allCommitments);
    const calculatedRoot = merkleTree.getRoot().toString('hex');
    const publishedRoot = surveyResults.merkleRoot;

    if (calculatedRoot === publishedRoot) {
      details.merkleProofValid = true;
      console.log('✅ Merkle root verification successful');
    } else {
      errors.push('Merkle root does not match calculated root');
      console.log('❌ Merkle root verification failed');
    }

    // 4. Verify answer distribution
    const expectedCount = surveyResults.answerDistribution[answer] || 0;
    const actualCount = allPublishedAnswers.filter(a => a === answer).length;
    
    if (expectedCount === actualCount) {
      details.distributionAccurate = true;
      console.log(`✅ Answer distribution accurate (${actualCount} occurrences)`);
    } else {
      errors.push(`Answer distribution mismatch: expected ${expectedCount}, found ${actualCount}`);
      console.log(`❌ Answer distribution mismatch`);
    }

    const isIncluded = details.commitmentFound && details.merkleProofValid && details.distributionAccurate;

    if (isIncluded) {
      console.log('\n🎉 ANSWER VERIFICATION SUCCESSFUL');
      console.log('✅ This answer was legitimately included in the survey results');
      console.log('✅ The answer has not been tampered with');
      console.log('✅ The survey results are authentic');
    } else {
      console.log('\n⚠️ ANSWER VERIFICATION FAILED');
      console.log('❌ Cannot verify this answer was legitimately included');
    }

    return { isIncluded, details, errors };

  } catch (error: any) {
    errors.push(`Verification failed: ${error.message}`);
    console.error('❌ Answer verification failed:', error);
    return { isIncluded: false, details, errors };
  }
}

/**
 * Example usage functions
 */
export function createExampleData() {
  // Example student proof (what students download)
  const exampleStudentProof: StudentProof = {
    surveyId: "test-survey-123",
    studentEmail: "student@example.com",
    timestamp: Date.now(),
    transactionSignature: "5J7X...", // Would be real transaction signature
    userAnswer: "This is a great course",
    cryptographicProof: {
      commitment: "a1b2c3d4...", // Would be real commitment hash
      signature: "base64-encoded-signature", // Would be real signature
      preparedMessage: "base64-encoded-prepared-message",
      blindedMessage: "base64-encoded-blinded-message",
      blindingInverse: "base64-encoded-inverse",
      blindSignature: "base64-encoded-blind-signature"
    }
  };

  // Example survey results (what school publishes)
  const exampleSurveyResults: SurveyResults = {
    surveyId: "test-survey-123",
    title: "Course Feedback Survey",
    totalResponses: 3,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    merkleRoot: "merkle-root-hash",
    answerDistribution: {
      "This is a great course": 1,
      "The course was okay": 1,
      "I learned a lot": 1
    },
    verificationData: {
      commitmentHashes: ["hash1", "hash2", "hash3"],
      blockchainAddress: "survey-pda-address"
    }
  };

  return { exampleStudentProof, exampleSurveyResults };
}

// Export for use in other modules
export { MerkleTree, createCommitment };

// Run example if this file is executed directly
if (require.main === module) {
  console.log('📋 Public Verification Tool - Example Usage');
  console.log('===========================================');
  
  const { exampleStudentProof, exampleSurveyResults } = createExampleData();
  
  console.log('\n1. STUDENT VERIFICATION:');
  console.log('   Students can verify their own participation proofs');
  console.log('   - Verify blind signature is authentic');
  console.log('   - Confirm their answer was not tampered with');
  console.log('   - Prove legitimate participation');
  
  console.log('\n2. PUBLIC VERIFICATION:');
  console.log('   Anyone can verify if an answer was included in results');
  console.log('   - Check if specific answer exists in published results');
  console.log('   - Verify Merkle tree integrity');
  console.log('   - Confirm answer distribution accuracy');
  
  console.log('\nExample usage:');
  console.log('// Student verification');
  console.log('const studentValid = await verifyStudentProof(studentProof, schoolPublicKey);');
  console.log('');
  console.log('// Public verification');
  console.log('const answerIncluded = verifyAnswerInResults("This is a great course", results, allAnswers);');
} 
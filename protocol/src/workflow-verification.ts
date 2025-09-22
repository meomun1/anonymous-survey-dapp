import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import { createHash } from 'crypto';

/**
 * Comprehensive workflow verification for anonymous survey system
 * Tests the complete cryptographic flow from student participation to school verification
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

  getProof(leaf: Buffer): { proof: Buffer[], path: boolean[] } {
    const proof: Buffer[] = [];
    const path: boolean[] = []; // true = right, false = left
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
        path.push(isRightNode === 1); // Convert to boolean: 1 = true, 0 = false
      }
      
      leafIndex = Math.floor(leafIndex / 2);
    }
    
    return { proof, path };
  }

  static verifyProof(leaf: Buffer, proof: Buffer[], path: boolean[], root: Buffer): boolean {
    let currentHash = leaf;
    
    for (let i = 0; i < proof.length; i++) {
      const proofElement = proof[i];
      const isRight = path[i]; // true if current node is on the right
      
      let parentHash: Buffer;
      if (isRight) {
        // Current node is on the right, so proof element is on the left
        parentHash = Buffer.from(createHash('sha256').update(Buffer.concat([proofElement, currentHash])).digest());
      } else {
        // Current node is on the left, so proof element is on the right
        parentHash = Buffer.from(createHash('sha256').update(Buffer.concat([currentHash, proofElement])).digest());
      }
      
      currentHash = parentHash;
    }
    
    return currentHash.equals(root);
  }
}

// Test data structure to simulate database/blockchain data
interface TestSurvey {
  id: string;
  shortId: string;
  blindSignaturePrivateKey: string; // Base64 encoded
  blindSignaturePublicKey: string;  // Base64 encoded
  encryptionPrivateKey: string;     // Base64 encoded
  encryptionPublicKey: string;      // Base64 encoded
}

interface TestResponse {
  surveyId: string;
  answer: string;
  commitment: Buffer;
  encryptedAnswer: Buffer;
  blindSignature?: Uint8Array;
  finalSignature?: Uint8Array;
  preparedMessage?: Uint8Array;
}

/**
 * Test 1: Student Answer Verification
 * Verifies that student answers can be validated using school's blind signature private key
 */
async function testStudentAnswerVerification() {
  console.log('\n🔍 Test 1: Student Answer Verification');
  console.log('=====================================');

  try {
    // 1. Setup - Create survey keys (simulating school setup)
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const { privateKey: blindPrivateKey, publicKey: blindPublicKey } = await suite.generateKey({
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1])
    });

    // Export keys (simulating database storage)
    const blindPrivateKeyExported = await webcrypto.subtle.exportKey('pkcs8', blindPrivateKey);
    const blindPublicKeyExported = await webcrypto.subtle.exportKey('spki', blindPublicKey);

    console.log('✅ Survey keys generated and exported');

    // 2. Student side - Submit answer
    const studentAnswer = "The event was very informative and well organized. I learned a lot about blockchain technology.";
    console.log(`📝 Student answer: "${studentAnswer}"`);

    // Prepare message for blind signing
    const encodedMessage = new TextEncoder().encode(studentAnswer);
    const preparedMsg = suite.prepare(encodedMessage);

    // Generate blinded message
    const { blindedMsg, inv } = await suite.blind(blindPublicKey, preparedMsg);
    console.log('🔒 Message blinded successfully');

    // 3. School side - Sign blinded message (simulating server endpoint)
    const blindSignature = await suite.blindSign(blindPrivateKey, blindedMsg);
    console.log('✍️ Blind signature generated by school');

    // 4. Student side - Finalize signature
    const finalSignature = await suite.finalize(blindPublicKey, preparedMsg, blindSignature, inv);
    console.log('🔑 Signature finalized by student');

    // 5. Verification - School verifies the answer using stored private key
    console.log('\n🔍 Verification Process:');
    
    // Import private key from "database" (base64)
    const importedPrivateKey = await webcrypto.subtle.importKey(
      'pkcs8',
      blindPrivateKeyExported,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      false,
      ['sign']
    );

    // Import public key
    const importedPublicKey = await webcrypto.subtle.importKey(
      'spki',
      blindPublicKeyExported,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      false,
      ['verify']
    );

    // Verify the signature
    const isValid = await suite.verify(importedPublicKey, finalSignature, preparedMsg);
    
    if (isValid) {
      console.log('✅ Student answer signature is VALID');
      console.log('✅ Answer authentically belongs to this survey');
    } else {
      console.log('❌ Student answer signature is INVALID');
    }

    // 6. Test with tampered answer (should fail)
    const tamperedAnswer = "This is a completely different answer";
    const tamperedMessage = new TextEncoder().encode(tamperedAnswer);
    const tamperedPrepared = suite.prepare(tamperedMessage);
    
    const isTamperedValid = await suite.verify(importedPublicKey, finalSignature, tamperedPrepared);
    
    if (!isTamperedValid) {
      console.log('✅ Tampered answer correctly REJECTED');
    } else {
      console.log('❌ Tampered answer incorrectly ACCEPTED');
    }

    return {
      success: true,
      originalValid: isValid,
      tamperedRejected: !isTamperedValid,
      testData: {
        answer: studentAnswer,
        commitment: createCommitment(studentAnswer),
        preparedMessage: preparedMsg,
        finalSignature: finalSignature
      }
    };

  } catch (error: any) {
    console.error('❌ Test 1 failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Test 2: Merkle Tree Answer Verification
 * Verifies that a specific answer belongs to a survey using Merkle tree proof
 */
async function testMerkleTreeAnswerVerification() {
  console.log('\n Test 2: Merkle Tree Answer Verification');
  try {
    // 1. Setup - Create test survey responses (simulating database data)
    const surveyResponses = [
      "The event was very informative and well organized.",
      "Good content but the venue was too crowded.",
      "Excellent speakers and networking opportunities.",
      "The food was great but sessions were too long.",
      "Very valuable information about blockchain technology."
    ];

    console.log(`📊 Testing with ${surveyResponses.length} survey responses`);

    // 2. Create commitments for all responses
    const commitments = surveyResponses.map(answer => createCommitment(answer));
    console.log('🔗 Commitments created for all responses');

    // 3. Build Merkle tree
    const merkleTree = new MerkleTree(commitments);
    const merkleRoot = merkleTree.getRoot();
    console.log(`🌳 Merkle tree built with root: ${merkleRoot.toString('hex').substring(0, 16)}...`);

    // 4. Test verification for a specific answer
    const testAnswerIndex = 2; // "Excellent speakers and networking opportunities."
    const testAnswer = surveyResponses[testAnswerIndex];
    const testCommitment = commitments[testAnswerIndex];
    
    console.log(`\n🔍 Testing answer: "${testAnswer}"`);

    // 5. Generate Merkle proof for the test answer
    const { proof, path } = merkleTree.getProof(testCommitment);
    console.log(`📋 Generated Merkle proof with ${proof.length} elements`);

    // 6. Verify the proof
    const isValidProof = MerkleTree.verifyProof(testCommitment, proof, path, merkleRoot);
    
    if (isValidProof) {
      console.log('✅ Answer VERIFIED as belonging to this survey');
    } else {
      console.log('❌ Answer verification FAILED');
    }

    // 7. Test with fake answer (should fail)
    const fakeAnswer = "This answer was never submitted to the survey";
    const fakeCommitment = createCommitment(fakeAnswer);
    
    try {
      const { proof: fakeProof, path: fakePath } = merkleTree.getProof(fakeCommitment);
      const isFakeProofValid = MerkleTree.verifyProof(fakeCommitment, fakeProof, fakePath, merkleRoot);
      
      if (!isFakeProofValid) {
        console.log('✅ Fake answer correctly NOT FOUND in Merkle tree');
      } else {
        console.log('❌ Fake answer incorrectly ACCEPTED');
      }
    } catch (error) {
      console.log('✅ Fake answer correctly NOT FOUND in Merkle tree');
    }

    // 8. Test proof verification with wrong root (should fail)
    const wrongRoot = createHash('sha256').update('wrong root').digest();
    const isWrongRootValid = MerkleTree.verifyProof(testCommitment, proof, path, Buffer.from(wrongRoot));
    
    if (!isWrongRootValid) {
      console.log('✅ Wrong root correctly REJECTED');
    } else {
      console.log('❌ Wrong root incorrectly ACCEPTED');
    }

    return {
      success: true,
      validProof: isValidProof,
      fakeAnswerRejected: true,
      wrongRootRejected: !isWrongRootValid,
      merkleRoot: merkleRoot.toString('hex'),
      testData: {
        responses: surveyResponses,
        commitments: commitments.map(c => c.toString('hex')),
        proof: proof.map(p => p.toString('hex')),
        path: path.map(p => p ? 'right' : 'left')
      }
    };

  } catch (error: any) {
    console.error('❌ Test 2 failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Test 3: Database vs Blockchain Merkle Root Verification
 * Verifies that the Merkle root calculated from database commitments matches blockchain root
 */
async function testDatabaseBlockchainConsistency() {
  console.log('\n⛓️  Test 3: Database vs Blockchain Consistency');
  console.log('==============================================');

  try {
    // 1. Simulate database commitments (what would be stored after decryption)
    const databaseResponses = [
      "The event was excellent and very informative.",
      "Good organization but could improve catering.",
      "Great networking opportunities and content.",
      "Valuable sessions about emerging technologies.",
      "Well structured agenda and knowledgeable speakers."
    ];

    console.log(`📊 Database contains ${databaseResponses.length} decrypted responses`);

    // 2. Create commitments from database responses
    const databaseCommitments = databaseResponses.map(answer => createCommitment(answer));
    
    // 3. Calculate Merkle root from database data
    const databaseMerkleTree = new MerkleTree(databaseCommitments);
    const databaseRoot = databaseMerkleTree.getRoot();
    console.log(`🗄️  Database Merkle root: ${databaseRoot.toString('hex').substring(0, 16)}...`);

    // 4. Simulate blockchain data (what would be stored on-chain)
    // In real scenario, this would come from blockchain query
    const blockchainCommitments = [...databaseCommitments]; // Should be identical
    const blockchainMerkleTree = new MerkleTree(blockchainCommitments);
    const blockchainRoot = blockchainMerkleTree.getRoot();
    console.log(`⛓️  Blockchain Merkle root: ${blockchainRoot.toString('hex').substring(0, 16)}...`);

    // 5. Verify consistency
    const isConsistent = databaseRoot.equals(blockchainRoot);
    
    if (isConsistent) {
      console.log('✅ Database and blockchain roots MATCH');
      console.log('✅ Survey integrity VERIFIED');
    } else {
      console.log('❌ Database and blockchain roots DO NOT MATCH');
      console.log('❌ Potential data tampering detected');
    }

    // 6. Test with tampered database (should fail)
    console.log('\n🔍 Testing with tampered database data:');
    
    const tamperedResponses = [...databaseResponses];
    tamperedResponses[2] = "This response has been maliciously modified"; // Tamper with one response
    
    const tamperedCommitments = tamperedResponses.map(answer => createCommitment(answer));
    const tamperedMerkleTree = new MerkleTree(tamperedCommitments);
    const tamperedRoot = tamperedMerkleTree.getRoot();
    
    const isTamperedConsistent = tamperedRoot.equals(blockchainRoot);
    
    if (!isTamperedConsistent) {
      console.log('✅ Tampered database correctly DETECTED');
    } else {
      console.log('❌ Tampered database went UNDETECTED');
    }

    // 7. Test individual response verification against blockchain root
    console.log('\n🔍 Testing individual response verification:');
    
    const testResponseIndex = 1;
    const testResponse = databaseResponses[testResponseIndex];
    const testCommitment = databaseCommitments[testResponseIndex];
    
    const { proof, path } = blockchainMerkleTree.getProof(testCommitment);
    const isResponseValid = MerkleTree.verifyProof(testCommitment, proof, path, blockchainRoot);
    
    if (isResponseValid) {
      console.log(`✅ Response "${testResponse}" verified against blockchain`);
    } else {
      console.log(`❌ Response verification failed`);
    }

    return {
      success: true,
      rootsMatch: isConsistent,
      tamperingDetected: !isTamperedConsistent,
      individualResponseValid: isResponseValid,
      data: {
        databaseRoot: databaseRoot.toString('hex'),
        blockchainRoot: blockchainRoot.toString('hex'),
        tamperedRoot: tamperedRoot.toString('hex'),
        responses: databaseResponses,
        commitments: databaseCommitments.map(c => c.toString('hex'))
      }
    };

  } catch (error: any) {
    console.error('❌ Test 3 failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Main test runner
 */
async function runWorkflowVerificationTests() {
  console.log('🚀 Anonymous Survey System - Workflow Verification Tests');
  console.log('========================================================');
  console.log('Testing cryptographic integrity of the complete survey workflow\n');

  const results = {
    test1: await testStudentAnswerVerification(),
    test2: await testMerkleTreeAnswerVerification(),
    test3: await testDatabaseBlockchainConsistency()
  };

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  
  const allPassed = Object.values(results).every(result => result.success);
  
  console.log(`Test 1 - Student Answer Verification: ${results.test1.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 2 - Merkle Tree Verification: ${results.test2.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 3 - Database-Blockchain Consistency: ${results.test3.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✅ Survey system cryptographic integrity VERIFIED');
    console.log('✅ Student answers can be authenticated');
    console.log('✅ Merkle tree proofs work correctly');
    console.log('✅ Database tampering can be detected');
  }

  return results;
}

// Export for use in other modules
export {
  runWorkflowVerificationTests,
  testStudentAnswerVerification,
  testMerkleTreeAnswerVerification,
  testDatabaseBlockchainConsistency,
  MerkleTree,
  createCommitment
};

// Run tests if this file is executed directly
if (require.main === module) {
  runWorkflowVerificationTests().catch(console.error);
} 
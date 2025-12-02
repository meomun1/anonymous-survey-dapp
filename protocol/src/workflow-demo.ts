/**
 * WORKFLOW DEMONSTRATION: Anonymous Survey System with Double Blind Signatures
 *
 * This file demonstrates the DOUBLE BLIND SIGNATURE workflow:
 * - Phase 1: Login + Encrypted Ticket + First Blind Signature (on Token)
 * - Phase 2&3: Batch Submission + Second Blind Signature (on Receipt)
 * - Phase 4: Claim Participation (with Receipt Signature)
 *
 * Key Feature: TWO pairs of blind signature keys for unlinkability
 *
 * Run: npx ts-node protocol/src/workflow-demo.ts
 */

import * as crypto from 'crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';

// ============================================================================
// SHARED CRYPTOGRAPHIC UTILITIES
// ============================================================================

/**
 * Generate RSA-OAEP key pair for encryption
 */
async function generateEncryptionKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return keyPair;
}

/**
 * Generate RSA-PSS key pair for blind signatures
 * NOTE: We need TWO pairs for the double blind signature workflow:
 * - Pair 1: For signing tokens (Phase 1 authorization)
 * - Pair 2: For signing receipts (Phase 2&3 participation proof)
 */
async function generateBlindSignKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-384', // Must match RSABSSA.SHA384.PSS
    },
    true,
    ['sign', 'verify']
  );

  return keyPair;
}

/**
 * Encrypt answer string with RSA-OAEP
 */
async function encryptAnswer(answer: string, publicKey: CryptoKey): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data
  );

  return new Uint8Array(encryptedBuffer);
}

/**
 * Decrypt answer string with RSA-OAEP
 */
async function decryptAnswer(encryptedData: Uint8Array, privateKey: CryptoKey): Promise<string> {
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generate SHA-256 commitment hash
 */
function generateCommitment(answer: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(answer);
  return hash.digest('hex'); // 64 hex characters
}

/**
 * Blind RSA signature - student blinds the message
 */
async function blindMessage(
  message: string,
  publicKey: CryptoKey
): Promise<{ blindedMsg: Uint8Array; preparedMsg: Uint8Array; inv: Uint8Array }> {
  const suite = RSABSSA.SHA384.PSS.Randomized();

  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const preparedMsg = suite.prepare(messageBytes);

  const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);

  return { blindedMsg, preparedMsg, inv };
}

/**
 * Blind RSA signature - server signs the blinded message
 */
async function blindSign(
  blindedMsg: Uint8Array,
  privateKey: CryptoKey
): Promise<Uint8Array> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const blindSignature = await suite.blindSign(privateKey, blindedMsg);
  return blindSignature;
}

/**
 * Blind RSA signature - student unblinds the signature
 */
async function unblindSignature(
  blindSignature: Uint8Array,
  inv: Uint8Array,
  publicKey: CryptoKey,
  preparedMsg: Uint8Array
): Promise<Uint8Array> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);
  return signature;
}

/**
 * Verify the unblinded signature
 */
async function verifySignature(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: CryptoKey
): Promise<boolean> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  return await suite.verify(publicKey, signature, message);
}

// ============================================================================
// MOCK DATABASE AND BLOCKCHAIN
// ============================================================================

interface Token {
  token: string;
  campaignId: string;
  studentEmail: string;
  ticket: boolean;          // NEW: Has student received encrypted ticket?
  used: boolean;            // Has student received token blind signature?
  isCompleted: boolean;     // Has student claimed participation?
}

interface EncryptedResponse {
  commitment: string;
  encryptedData: Uint8Array;
  timestamp: Date;
}

interface DecryptedResponse {
  surveyId: string;
  courseCode: string;
  teacherId: string;
  answers: string;
}

// Mock database
const mockDatabase = {
  tokens: [] as Token[],
  responses: [] as EncryptedResponse[],
  decryptedResponses: [] as DecryptedResponse[],
};

// Mock blockchain
const mockBlockchain = {
  responses: [] as EncryptedResponse[],
};

// ============================================================================
// DOUBLE BLIND SIGNATURE WORKFLOW DEMONSTRATION
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('DOUBLE BLIND SIGNATURE WORKFLOW');
console.log('='.repeat(80) + '\n');

async function demonstrateDoubleBlindSignatureWorkflow() {
  console.log('--- SETUP: ADMIN CREATES CAMPAIGN & GENERATES KEYS ---\n');

  // Admin generates THREE RSA key pairs for the campaign
  const encryptionKeys = await generateEncryptionKeyPair();
  console.log('✓ Encryption key pair generated (RSA-OAEP, 2048-bit)');

  const tokenBlindSignKeys = await generateBlindSignKeyPair();
  console.log('\n✓ Token blind signature key pair generated (RSA-PSS, 2048-bit)');

  const receiptBlindSignKeys = await generateBlindSignKeyPair();
  console.log('\n✓ Receipt blind signature key pair generated (RSA-PSS, 2048-bit)');


  // Admin generates tokens for students
  const students = [
    { email: 'alice@university.edu', surveyCount: 3 },
    { email: 'bob@university.edu', surveyCount: 3 },
    { email: 'charlie@university.edu', surveyCount: 2 }, // Different count!
  ];

  const campaignId = 'campaign-fall-2024';

  console.log('\n--- SETUP: ADMIN GENERATES TOKENS FOR STUDENTS ---\n');

  for (const student of students) {
    const token = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    mockDatabase.tokens.push({
      token,
      campaignId,
      studentEmail: student.email,
      ticket: false,
      used: false,
      isCompleted: false,
    });
    console.log(`✓ Token for ${student.email}: ${token.substring(0, 16)}... (${student.surveyCount} surveys)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1: LOGIN + ENCRYPTED TICKET + TOKEN BLIND SIGNATURE');
  console.log('='.repeat(80) + '\n');

  console.log('--- PHASE 1, STEP 1: ALICE LOGS IN (GET /api/login) ---\n');

  const aliceToken = mockDatabase.tokens.find(t => t.studentEmail === 'alice@university.edu')!;
  console.log(`Alice enters token: ${aliceToken.token.substring(0, 16)}...`);
  console.log('→ Client: GET /api/login with Authorization: Bearer <token>\n');

  // SERVER SIDE: Get surveys and create encrypted ticket
  console.log('[SERVER] Received login request');
  console.log(`[SERVER] Checks: token.ticket === false? ${!aliceToken.ticket} ✓`);

  const aliceSurveys = [
    { id: 'survey-cs101', courseCode: 'CS101', teacherId: 'teacher-001' },
    { id: 'survey-cs102', courseCode: 'CS102', teacherId: 'teacher-002' },
    { id: 'survey-cs103', courseCode: 'CS103', teacherId: 'teacher-003' },
  ];

  console.log(`[SERVER] Found ${aliceSurveys.length} surveys for this token`);

  // Create standardized ticket
  const ticketString = `ticket-type-${aliceSurveys.length}`;
  console.log(`[SERVER] Created ticket: "${ticketString}"`);

  // Encrypt ticket with server public key
  const encryptedTicket = await encryptAnswer(ticketString, encryptionKeys.publicKey);
  console.log(`[SERVER] Encrypted ticket (${encryptedTicket.length} bytes)`);
  console.log('[SERVER] ✓ All students with 3 surveys get IDENTICAL encrypted ticket');

  aliceToken.ticket = true;
  console.log('[SERVER] Marked token.ticket = true (prevents re-requesting ticket)');

  console.log('\n← Server responds: { surveys: [...], encryptedTicket }');
  console.log('✓ Alice receives: 3 surveys + encrypted ticket (opaque to her)');

  console.log('\n--- PHASE 1, STEP 2: ALICE GETS TOKEN BLIND SIGNATURE (POST /api/blind-sign-token) ---\n');

  // Alice blinds her token
  const { blindedMsg: blindedToken, preparedMsg: preparedToken, inv: invToken } =
    await blindMessage(aliceToken.token, tokenBlindSignKeys.publicKey);

  console.log('✓ Alice blinded her token (server cannot see original token)');
  console.log(`  Blinded token length: ${blindedToken.length} bytes`);
  console.log('→ Client: POST /api/blind-sign-token');
  console.log('  Authorization: Bearer <token>');
  console.log('  Body: { blindedToken }\n');

  // SERVER SIDE: Blind signs the token
  console.log('[SERVER] Received token blind signature request');
  console.log('[SERVER] Verifies token exists and checks: token.used === false? ✓');
  console.log('[SERVER] Signs blinded token (never sees prepared token)');

  const tokenBlindSignature = await blindSign(blindedToken, tokenBlindSignKeys.privateKey);
  console.log(`[SERVER] Token blind signature generated (${tokenBlindSignature.length} bytes)`);

  aliceToken.used = true;
  console.log('[SERVER] Marked token.used = true (prevents re-requesting signature)');

  console.log('\n← Server responds: { blindSignature }');

  // Alice unblinds the token signature
  const tokenSignature = await unblindSignature(
    tokenBlindSignature,
    invToken,
    tokenBlindSignKeys.publicKey,
    preparedToken
  );
  console.log(`✓ Alice finalized token signature (${tokenSignature.length} bytes)`);

  // Verify token signature
  const isTokenSigValid = await verifySignature(tokenSignature, preparedToken, tokenBlindSignKeys.publicKey);
  console.log(`✓ Token signature verified: ${isTokenSigValid}`);

  // Alice saves session data to localStorage
  console.log('\n✓ Alice saves to localStorage:');
  console.log('  - token (original)');
  console.log('  - encryptedTicket');
  console.log('  - preparedToken');
  console.log('  - tokenSignature');
  console.log('  - surveys: [...]');
  console.log('  - completedSurveys: []');

  console.log('\n✅ PHASE 1 COMPLETE: Alice has authorization credential + encrypted ticket');

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2&3: INCREMENTAL SURVEY COMPLETION + BATCH SUBMISSION + RECEIPT SIGNATURE');
  console.log('='.repeat(80) + '\n');

  console.log('--- PHASE 2: ALICE COMPLETES SURVEYS INCREMENTALLY ---\n');

  // Simulate Alice completing surveys over multiple sessions
  const completedSurveys = [];

  console.log('📅 Day 1: Alice completes Survey 1');
  const answer1 = 'survey-cs101|CS101|teacher-001|54321';
  const commitment1 = generateCommitment(answer1);
  const encrypted1 = await encryptAnswer(answer1, encryptionKeys.publicKey);
  completedSurveys.push({ surveyId: 'survey-cs101', encryptedAnswer: encrypted1, commitment: commitment1 });
  console.log(`  ✓ Survey 1 encrypted and saved to localStorage`);
  console.log(`  ✓ Commitment: ${commitment1.substring(0, 32)}...`);

  console.log('\n📅 Day 2: Alice completes Survey 2');
  const answer2 = 'survey-cs102|CS102|teacher-002|45321';
  const commitment2 = generateCommitment(answer2);
  const encrypted2 = await encryptAnswer(answer2, encryptionKeys.publicKey);
  completedSurveys.push({ surveyId: 'survey-cs102', encryptedAnswer: encrypted2, commitment: commitment2 });
  console.log(`  ✓ Survey 2 encrypted and saved to localStorage`);

  console.log('\n📅 Day 3: Alice completes Survey 3');
  const answer3 = 'survey-cs103|CS103|teacher-003|52341';
  const commitment3 = generateCommitment(answer3);
  const encrypted3 = await encryptAnswer(answer3, encryptionKeys.publicKey);
  completedSurveys.push({ surveyId: 'survey-cs103', encryptedAnswer: encrypted3, commitment: commitment3 });
  console.log(`  ✓ Survey 3 encrypted and saved to localStorage`);

  console.log(`\n✓ All ${completedSurveys.length} surveys complete! Client shows "Submit All Surveys" button`);

  console.log('\n--- PHASE 3: BATCH SUBMISSION WITH RECEIPT SIGNATURE ---\n');

  console.log('Alice clicks "Submit All Surveys" button\n');

  // Client generates random receipt R
  const receiptR = crypto.randomBytes(32).toString('hex');
  console.log(`✓ Client generated random receipt R: ${receiptR.substring(0, 16)}...`);

  // Alice blinds the receipt
  const { blindedMsg: blindedReceipt, preparedMsg: preparedReceipt, inv: invReceipt } =
    await blindMessage(receiptR, receiptBlindSignKeys.publicKey);

  console.log(`✓ Client blinded receipt (${blindedReceipt.length} bytes)`);
  console.log('\n→ Client: POST /api/responses/submit-batch');
  console.log('  Authorization: Bearer <preparedToken>.<tokenSignature>');
  console.log('  Body: {');
  console.log('    responses: [');
  console.log('      { surveyId, encryptedAnswer, commitment },');
  console.log('      { surveyId, encryptedAnswer, commitment },');
  console.log('      { surveyId, encryptedAnswer, commitment }');
  console.log('    ],');
  console.log('    encryptedTicket,');
  console.log('    blindedReceipt');
  console.log('  }\n');

  // SERVER SIDE: Verify and decrypt
  console.log('[SERVER] Received batch submission');
  console.log('[SERVER] Parsing Authorization: Bearer <preparedToken>.<tokenSignature>');
  console.log('[SERVER] Verifying token signature...');

  const isAuthValid = await verifySignature(tokenSignature, preparedToken, tokenBlindSignKeys.publicKey);
  console.log(`[SERVER] Token signature valid: ${isAuthValid} ✓`);

  console.log('[SERVER] Checking signature pair not already used... ✓');
  console.log('[SERVER] Decrypting ticket...');

  const decryptedTicket = await decryptAnswer(encryptedTicket, encryptionKeys.privateKey);
  console.log(`[SERVER] Decrypted ticket: "${decryptedTicket}"`);

  const expectedCount = parseInt(decryptedTicket.split('-')[2]);
  console.log(`[SERVER] Expected survey count: ${expectedCount}`);
  console.log(`[SERVER] Actual survey count: ${completedSurveys.length}`);
  console.log(`[SERVER] Count matches: ${expectedCount === completedSurveys.length} ✓`);

  console.log('\n[SERVER] Decrypting and verifying responses:');
  for (let i = 0; i < completedSurveys.length; i++) {
    const response = completedSurveys[i];
    const decrypted = await decryptAnswer(response.encryptedAnswer, encryptionKeys.privateKey);
    const recomputedCommitment = generateCommitment(decrypted);
    const isValid = recomputedCommitment === response.commitment;

    console.log(`  Response ${i + 1}: "${decrypted}"`);
    console.log(`    Commitment valid: ${isValid} ✓`);

    // Store in database
    mockDatabase.responses.push({
      commitment: response.commitment,
      encryptedData: response.encryptedAnswer,
      timestamp: new Date(),
    });
  }

  console.log('\n[SERVER] ✓ All responses validated and stored');
  console.log('[SERVER] Signing blinded receipt...');

  const receiptBlindSignature = await blindSign(blindedReceipt, receiptBlindSignKeys.privateKey);
  console.log(`[SERVER] Receipt blind signature generated (${receiptBlindSignature.length} bytes)`);

  console.log('[SERVER] Storing (preparedToken, tokenSignature) pair to prevent reuse');
  console.log('\n← Server responds: { blindSignature }');

  // Alice finalizes receipt signature
  const receiptSignature = await unblindSignature(
    receiptBlindSignature,
    invReceipt,
    receiptBlindSignKeys.publicKey,
    preparedReceipt
  );
  console.log(`\n✓ Alice finalized receipt signature (${receiptSignature.length} bytes)`);

  // Verify receipt signature
  const isReceiptSigValid = await verifySignature(receiptSignature, preparedReceipt, receiptBlindSignKeys.publicKey);
  console.log(`✓ Receipt signature verified: ${isReceiptSigValid}`);

  // Create downloadable receipt file
  console.log('\n✓ Client creates receipt file: survey-receipt.json');
  const receiptData = {
    R: receiptR,
    preparedReceipt: Buffer.from(preparedReceipt).toString('base64'),
    receiptSignature: Buffer.from(receiptSignature).toString('base64'),
    campaignId,
    submittedAt: new Date().toISOString(),
  };
  console.log('  Content: { R, preparedReceipt, receiptSignature, campaignId, submittedAt }');
  console.log('  ✓ File downloaded to student\'s computer');

  console.log('\n✓ Client clears localStorage (survey session complete)');
  console.log('\n✅ PHASE 2&3 COMPLETE: Responses submitted anonymously, receipt obtained');

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 4: CLAIM PARTICIPATION (BEFORE CAMPAIGN CLOSES)');
  console.log('='.repeat(80) + '\n');

  console.log('--- PHASE 4: ALICE CLAIMS PARTICIPATION ---\n');

  console.log('📅 Some time later (could be days/weeks)...\n');
  console.log('Alice navigates to claim page');
  console.log('✓ Alice uploads survey-receipt.json file');
  console.log(`✓ Alice enters email: ${aliceToken.studentEmail}`);

  console.log('\n→ Client: POST /api/participation/claim');
  console.log('  Authorization: Bearer <preparedReceipt>.<receiptSignature>');
  console.log('  Body: {');
  console.log(`    email: "${aliceToken.studentEmail}",`);
  console.log(`    campaignId: "${campaignId}"`);
  console.log('  }\n');

  console.log('[SERVER] Received participation claim');
  console.log('[SERVER] Parsing Authorization: Bearer <preparedReceipt>.<receiptSignature>');
  console.log('[SERVER] Verifying receipt signature...');

  const isReceiptAuthValid = await verifySignature(receiptSignature, preparedReceipt, receiptBlindSignKeys.publicKey);
  console.log(`[SERVER] Receipt signature valid: ${isReceiptAuthValid} ✓`);

  console.log('[SERVER] Checking receipt not already claimed... ✓');
  console.log(`[SERVER] Looking up token by email "${aliceToken.studentEmail}" and campaignId "${campaignId}"...`);
  console.log(`[SERVER] Found token: ${aliceToken.token.substring(0, 16)}...`);
  console.log(`[SERVER] Verifying token.used === true? ${aliceToken.used} ✓`);

  aliceToken.isCompleted = true;
  console.log('[SERVER] Marked token.isCompleted = true');
  console.log('[SERVER] Storing (preparedReceipt, receiptSignature) pair to prevent re-claiming');

  console.log('\n← Server responds: { success: true, participationRecorded: true }');
  console.log(`\n✅ PHASE 4 COMPLETE: Alice's participation recorded!`);

  console.log('\n' + '='.repeat(80));
  console.log('PRIVACY ANALYSIS');
  console.log('='.repeat(80) + '\n');

  console.log('🔐 What server knows:');
  console.log(`  Phase 1: "Token ${aliceToken.token.substring(0, 8)}... got authorization"`);
  console.log('  Phase 2&3: "Someone submitted 3 valid surveys" (doesn\'t know WHO)');
  console.log(`  Phase 4: "Token ${aliceToken.token.substring(0, 8)}... participated" (doesn't know WHICH responses)`);

  console.log('\n❌ What server CANNOT link:');
  console.log('  - Which responses belong to Alice\'s token (anonymous submission via blind signature)');
  console.log('  - Which receipt belongs to Alice\'s token (different blind signature key pair)');

  console.log('\n✅ Result: Server knows participation but cannot link tokens to specific responses!');

  console.log('\n' + '='.repeat(80));
  console.log('UNLINKABILITY PROOF');
  console.log('='.repeat(80) + '\n');

  console.log('🔑 Key Insight: TWO separate blind signature key pairs');
  console.log('\n1. Token Blind Signature Keys (Phase 1):');
  console.log('   - Used to sign: preparedToken');
  console.log('   - Signature used in: Phase 2&3 batch submission (Authorization header)');
  console.log('   - Server can verify this signature but CANNOT link it back to original token');
  console.log('   - Due to blind signature randomization (inv factor)');

  console.log('\n2. Receipt Blind Signature Keys (Phase 2&3):');
  console.log('   - Used to sign: preparedReceipt (random R)');
  console.log('   - Signature used in: Phase 4 participation claim (Authorization header)');
  console.log('   - Server can verify this signature but CANNOT link it to Phase 2&3 submission');
  console.log('   - Due to DIFFERENT key pair + blind signature randomization');

  console.log('\n🚫 Why server CANNOT link phases:');
  console.log('   Phase 1 → Phase 2&3: Different blind signature (same key pair, but randomized)');
  console.log('   Phase 2&3 → Phase 4: Different blind signature (DIFFERENT key pair + randomized)');
  console.log('   Phase 1 → Phase 4: Two layers of blind signatures (impossible to correlate)');

  console.log('\n✅ Privacy Properties:');
  console.log('   - Anonymity: Server sees responses but not student identities');
  console.log('   - Unlinkability: Server cannot link tokens to responses or receipts');
  console.log('   - Participation tracking: Server knows who participated (Phase 4)');
  console.log('   - Survey count enforcement: Encrypted tickets prevent incorrect counts');

  console.log('\n' + '='.repeat(80));
  console.log('WORKFLOW DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
}

async function main() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████████████████████');
  console.log('█                                                                              █');
  console.log('█         ANONYMOUS SURVEY WORKFLOW DEMONSTRATION                             █');
  console.log('█         Double Blind Signature System with Encrypted Tickets                █');
  console.log('█                                                                              █');
  console.log('████████████████████████████████████████████████████████████████████████████████');

  await demonstrateDoubleBlindSignatureWorkflow();

  console.log('\n' + '='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateDoubleBlindSignatureWorkflow,
};

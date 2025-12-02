/**
 * WORKFLOW DATA TABLE DEMONSTRATION with RANDOMNESS ANALYSIS
 *
 * This file shows exactly what data exists at each step of the workflow,
 * displaying variable names, types, sizes, and sample values in table format.
 *
 * NEW: Explains WHY certain variables are different each time (salt, random padding, etc.)
 * and dives into the blind signature library source code to show randomness sources.
 *
 * Run: npx ts-node protocol/src/workflow-data-table.ts
 */

import * as crypto from 'crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';

// ============================================================================
// TABLE UTILITIES
// ============================================================================

interface DataVariable {
  name: string;
  type: string;
  size: string;
  value: string;
  location: 'Client' | 'Server' | 'Blockchain' | 'Database';
  visibility: 'Public' | 'Private' | 'Encrypted';
}

function printTable(title: string, variables: DataVariable[]) {
  console.log('\n' + '='.repeat(120));
  console.log(title);
  console.log('='.repeat(120));

  // Header
  console.log('┌────────────────────────┬──────────────┬────────────┬──────────────────────────────────────────┬────────────┬────────────┐');
  console.log('│ Variable Name          │ Type         │ Size       │ Value (Sample)                           │ Location   │ Visibility │');
  console.log('├────────────────────────┼──────────────┼────────────┼──────────────────────────────────────────┼────────────┼────────────┤');

  // Rows
  for (const v of variables) {
    const name = v.name.padEnd(22);
    const type = v.type.padEnd(12);
    const size = v.size.padEnd(10);
    const value = v.value.padEnd(40);
    const location = v.location.padEnd(10);
    const visibility = v.visibility.padEnd(10);

    console.log(`│ ${name} │ ${type} │ ${size} │ ${value} │ ${location} │ ${visibility} │`);
  }

  console.log('└────────────────────────┴──────────────┴────────────┴──────────────────────────────────────────┴────────────┴────────────┘');
}

function truncate(str: string, maxLen: number = 40): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// ============================================================================
// CRYPTO UTILITIES (same as workflow-demo.ts)
// ============================================================================

async function generateEncryptionKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
  return keyPair;
}

async function generateBlindSignKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-384',
    },
    true,
    ['sign', 'verify']
  );
  return keyPair;
}

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

async function decryptAnswer(encryptedData: Uint8Array, privateKey: CryptoKey): Promise<string> {
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedData
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

function generateCommitment(answer: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(answer);
  return hash.digest('hex');
}

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

async function blindSign(
  blindedMsg: Uint8Array,
  privateKey: CryptoKey
): Promise<Uint8Array> {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const blindSignature = await suite.blindSign(privateKey, blindedMsg);
  return blindSignature;
}

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

// ============================================================================
// WORKFLOW DATA TRACKING
// ============================================================================

async function demonstrateWorkflowData() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');
  console.log('█                                                                                                                  █');
  console.log('█                          ANONYMOUS SURVEY WORKFLOW - DATA TRACKING TABLE                                        █');
  console.log('█                          Showing all variables and their values at each step                                    █');
  console.log('█                                                                                                                  █');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');

  // ============================================================================
  // STEP 1: ADMIN CREATES CAMPAIGN & GENERATES KEYS
  // ============================================================================

  console.log('\n\n📋 STEP 1: ADMIN CREATES CAMPAIGN & GENERATES KEYS');

  const encryptionKeys = await generateEncryptionKeyPair();
  const blindSignKeys = await generateBlindSignKeyPair();

  const campaignId = 'campaign-fall-2024';
  const studentEmail = 'alice@university.edu';
  const token = crypto.randomBytes(32).toString('hex');

  // Export public keys for display
  const encryptionPubKeyExport = await crypto.subtle.exportKey('spki', encryptionKeys.publicKey);
  const blindSignPubKeyExport = await crypto.subtle.exportKey('spki', blindSignKeys.publicKey);

  printTable('STEP 1: Campaign Creation - Server Side', [
    {
      name: 'campaignId',
      type: 'string',
      size: '19 chars',
      value: truncate(campaignId),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'encryptionPublicKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: truncate(Buffer.from(encryptionPubKeyExport).toString('base64')),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'encryptionPrivateKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: '[SENSITIVE - NOT SHOWN]',
      location: 'Server',
      visibility: 'Private'
    },
    {
      name: 'blindSignPublicKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: truncate(Buffer.from(blindSignPubKeyExport).toString('base64')),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'blindSignPrivateKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: '[SENSITIVE - NOT SHOWN]',
      location: 'Server',
      visibility: 'Private'
    },
  ]);

  printTable('STEP 1: Token Generation - Database', [
    {
      name: 'token',
      type: 'string',
      size: '64 chars',
      value: truncate(token),
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'student_email',
      type: 'string',
      size: '24 chars',
      value: truncate(studentEmail),
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'campaign_id',
      type: 'UUID',
      size: '36 chars',
      value: truncate(campaignId),
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'used',
      type: 'boolean',
      size: '1 bit',
      value: 'false',
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'is_completed',
      type: 'boolean',
      size: '1 bit',
      value: 'false',
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'blockchain_submitted',
      type: 'boolean',
      size: '1 bit',
      value: 'false',
      location: 'Database',
      visibility: 'Private'
    },
  ]);

  // ============================================================================
  // STEP 2: STUDENT RECEIVES TOKEN
  // ============================================================================

  console.log('\n\n📋 STEP 2: STUDENT RECEIVES TOKEN & VALIDATES');

  printTable('STEP 2: Token Validation - Client Side', [
    {
      name: 'token',
      type: 'string',
      size: '64 chars',
      value: truncate(token),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'campaignId',
      type: 'string',
      size: '19 chars',
      value: truncate(campaignId),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'encryptionPublicKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: truncate(Buffer.from(encryptionPubKeyExport).toString('base64')),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'blindSignPublicKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: truncate(Buffer.from(blindSignPubKeyExport).toString('base64')),
      location: 'Client',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 3: STUDENT PREPARES ANSWER
  // ============================================================================

  console.log('\n\n📋 STEP 3: STUDENT PREPARES ANSWER');

  const surveyId = 'survey-cs101-teacher1';
  const courseCode = 'CS101';
  const teacherId = 'teacher-001';
  const answers = '54321'; // 5 ratings
  const answerString = `${surveyId}|${courseCode}|${teacherId}|${answers}`;
  const commitment = generateCommitment(answerString);

  printTable('STEP 3: Answer Preparation - Client Side', [
    {
      name: 'surveyId',
      type: 'string',
      size: '22 chars',
      value: truncate(surveyId),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'courseCode',
      type: 'string',
      size: '5 chars',
      value: truncate(courseCode),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'teacherId',
      type: 'string',
      size: '11 chars',
      value: truncate(teacherId),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'answers',
      type: 'string',
      size: '5 chars',
      value: truncate(answers),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'answerString',
      type: 'string',
      size: '50 chars',
      value: truncate(answerString),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(commitment),
      location: 'Client',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 4: BLIND SIGNATURE PROTOCOL
  // ============================================================================

  console.log('\n\n📋 STEP 4: BLIND SIGNATURE PROTOCOL');

  const { blindedMsg, preparedMsg, inv } = await blindMessage(commitment, blindSignKeys.publicKey);

  printTable('STEP 4a: Client Blinds Commitment', [
    {
      name: 'commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(commitment),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'preparedMsg',
      type: 'Uint8Array',
      size: `${preparedMsg.length} bytes`,
      value: truncate(Buffer.from(preparedMsg).toString('hex')),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'blindedMsg',
      type: 'Uint8Array',
      size: `${blindedMsg.length} bytes`,
      value: truncate(Buffer.from(blindedMsg).toString('hex')),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'inv (blinding factor)',
      type: 'Uint8Array',
      size: `${inv.length} bytes`,
      value: truncate(Buffer.from(inv).toString('hex')),
      location: 'Client',
      visibility: 'Private'
    },
  ]);

  const blindSignature = await blindSign(blindedMsg, blindSignKeys.privateKey);

  printTable('STEP 4b: Server Signs Blinded Message', [
    {
      name: 'blindedMsg (received)',
      type: 'Uint8Array',
      size: `${blindedMsg.length} bytes`,
      value: truncate(Buffer.from(blindedMsg).toString('hex')),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'blindSignPrivateKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: '[USED TO SIGN - NOT SHOWN]',
      location: 'Server',
      visibility: 'Private'
    },
    {
      name: 'blindSignature',
      type: 'Uint8Array',
      size: `${blindSignature.length} bytes`,
      value: truncate(Buffer.from(blindSignature).toString('hex')),
      location: 'Server',
      visibility: 'Public'
    },
  ]);

  console.log('\n🔐 CRITICAL: Server NEVER sees the actual commitment value!');
  console.log('   Server only sees: blindedMsg (random-looking bytes)');
  console.log('   Server cannot link blindedMsg to final signature');

  const signature = await unblindSignature(blindSignature, inv, blindSignKeys.publicKey, preparedMsg);

  printTable('STEP 4c: Client Unblinds Signature', [
    {
      name: 'blindSignature',
      type: 'Uint8Array',
      size: `${blindSignature.length} bytes`,
      value: truncate(Buffer.from(blindSignature).toString('hex')),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'inv (blinding factor)',
      type: 'Uint8Array',
      size: `${inv.length} bytes`,
      value: truncate(Buffer.from(inv).toString('hex')),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'signature (final)',
      type: 'Uint8Array',
      size: `${signature.length} bytes`,
      value: truncate(Buffer.from(signature).toString('hex')),
      location: 'Client',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 5: ENCRYPT ANSWER
  // ============================================================================

  console.log('\n\n📋 STEP 5: ENCRYPT ANSWER');

  const encryptedAnswer = await encryptAnswer(answerString, encryptionKeys.publicKey);

  printTable('STEP 5: Answer Encryption - Client Side', [
    {
      name: 'answerString (plaintext)',
      type: 'string',
      size: '50 chars',
      value: truncate(answerString),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'encryptionPublicKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: '[USED FOR ENCRYPTION]',
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'encryptedAnswer',
      type: 'Uint8Array',
      size: `${encryptedAnswer.length} bytes`,
      value: truncate(Buffer.from(encryptedAnswer).toString('hex')),
      location: 'Client',
      visibility: 'Encrypted'
    },
  ]);

  // ============================================================================
  // STEP 6: CLIENT LOCAL STORAGE (PROOF)
  // ============================================================================

  console.log('\n\n📋 STEP 6: CLIENT SAVES PROOF TO LOCAL STORAGE');

  const proof = {
    surveyId,
    commitment,
    encryptedData: encryptedAnswer,
    signature,
    timestamp: new Date().toISOString(),
  };

  printTable('STEP 6: Proof Stored in Browser localStorage', [
    {
      name: 'surveyId',
      type: 'string',
      size: '22 chars',
      value: truncate(surveyId),
      location: 'Client',
      visibility: 'Private'
    },
    {
      name: 'commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(commitment),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'encryptedData',
      type: 'Uint8Array',
      size: `${encryptedAnswer.length} bytes`,
      value: truncate(Buffer.from(encryptedAnswer).toString('hex')),
      location: 'Client',
      visibility: 'Encrypted'
    },
    {
      name: 'signature',
      type: 'Uint8Array',
      size: `${signature.length} bytes`,
      value: truncate(Buffer.from(signature).toString('hex')),
      location: 'Client',
      visibility: 'Public'
    },
    {
      name: 'timestamp',
      type: 'ISO-8601',
      size: '24 chars',
      value: truncate(proof.timestamp),
      location: 'Client',
      visibility: 'Private'
    },
  ]);

  // ============================================================================
  // STEP 7: SUBMIT TO BLOCKCHAIN
  // ============================================================================

  console.log('\n\n📋 STEP 7: SUBMIT TO BLOCKCHAIN');

  printTable('STEP 7: Blockchain Submission - Transaction Data', [
    {
      name: 'commitment',
      type: 'SHA-256',
      size: '64 hex (32B)',
      value: truncate(commitment),
      location: 'Blockchain',
      visibility: 'Public'
    },
    {
      name: 'encryptedAnswer',
      type: 'Uint8Array',
      size: `${encryptedAnswer.length} bytes`,
      value: truncate(Buffer.from(encryptedAnswer).toString('hex')),
      location: 'Blockchain',
      visibility: 'Encrypted'
    },
    {
      name: 'campaignPDA',
      type: 'Pubkey',
      size: '32 bytes',
      value: '[Solana Account Address]',
      location: 'Blockchain',
      visibility: 'Public'
    },
    {
      name: 'transaction_signature',
      type: 'Signature',
      size: '64 bytes',
      value: '[Solana Transaction Signature]',
      location: 'Blockchain',
      visibility: 'Public'
    },
  ]);

  console.log('\n🔐 CRITICAL: Server does NOT receive this data yet!');
  console.log('   Data goes directly to Solana blockchain');
  console.log('   Server will ingest LATER when admin closes campaign');

  // Update database token status
  printTable('STEP 7: Database Token Update (After Blockchain Submit)', [
    {
      name: 'token',
      type: 'string',
      size: '64 chars',
      value: truncate(token),
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'used',
      type: 'boolean',
      size: '1 bit',
      value: 'true',
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'is_completed',
      type: 'boolean',
      size: '1 bit',
      value: 'true',
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'blockchain_submitted',
      type: 'boolean',
      size: '1 bit',
      value: 'true',
      location: 'Database',
      visibility: 'Private'
    },
    {
      name: 'completed_at',
      type: 'timestamp',
      size: '8 bytes',
      value: new Date().toISOString(),
      location: 'Database',
      visibility: 'Private'
    },
  ]);

  console.log('\n⚠️  NOTE: Database knows Alice completed survey, but NOT which response is hers!');

  // ============================================================================
  // STEP 8: ADMIN CLOSES CAMPAIGN
  // ============================================================================

  console.log('\n\n📋 STEP 8: ADMIN CLOSES CAMPAIGN');

  printTable('STEP 8: Campaign Status Update - Database', [
    {
      name: 'campaign_id',
      type: 'UUID',
      size: '36 chars',
      value: truncate(campaignId),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'status (before)',
      type: 'enum',
      size: '8 chars',
      value: 'launched',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'status (after)',
      type: 'enum',
      size: '6 chars',
      value: 'closed',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'closed_at',
      type: 'timestamp',
      size: '8 bytes',
      value: new Date().toISOString(),
      location: 'Database',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 9: INGEST FROM BLOCKCHAIN
  // ============================================================================

  console.log('\n\n📋 STEP 9: INGEST RESPONSES FROM BLOCKCHAIN');

  printTable('STEP 9: Data Ingested into Database (survey_responses)', [
    {
      name: 'response_id',
      type: 'UUID',
      size: '36 chars',
      value: '[Generated UUID]',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'campaign_id',
      type: 'UUID',
      size: '36 chars',
      value: truncate(campaignId),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(commitment),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'encrypted_response',
      type: 'bytea',
      size: `${encryptedAnswer.length} bytes`,
      value: truncate(Buffer.from(encryptedAnswer).toString('hex')),
      location: 'Database',
      visibility: 'Encrypted'
    },
    {
      name: 'blockchain_tx',
      type: 'string',
      size: '88 chars',
      value: '[Solana Transaction Signature]',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'ingested_at',
      type: 'timestamp',
      size: '8 bytes',
      value: new Date().toISOString(),
      location: 'Database',
      visibility: 'Public'
    },
  ]);

  console.log('\n🔐 PRIVACY CHECK:');
  console.log('   ❌ No student_email column in survey_responses table');
  console.log('   ❌ No FK linking to survey_tokens table');
  console.log('   ✅ Response is anonymous in database!');

  // ============================================================================
  // STEP 10: DECRYPT RESPONSES
  // ============================================================================

  console.log('\n\n📋 STEP 10: ADMIN DECRYPTS RESPONSES');

  const decryptedAnswer = await decryptAnswer(encryptedAnswer, encryptionKeys.privateKey);

  printTable('STEP 10a: Decryption Process - Server Side', [
    {
      name: 'encrypted_response',
      type: 'bytea',
      size: `${encryptedAnswer.length} bytes`,
      value: truncate(Buffer.from(encryptedAnswer).toString('hex')),
      location: 'Server',
      visibility: 'Encrypted'
    },
    {
      name: 'encryptionPrivateKey',
      type: 'CryptoKey',
      size: '2048 bits',
      value: '[USED FOR DECRYPTION - NOT SHOWN]',
      location: 'Server',
      visibility: 'Private'
    },
    {
      name: 'decrypted_string',
      type: 'string',
      size: `${decryptedAnswer.length} chars`,
      value: truncate(decryptedAnswer),
      location: 'Server',
      visibility: 'Public'
    },
  ]);

  // Verify commitment
  const recomputedCommitment = generateCommitment(decryptedAnswer);
  const isValid = recomputedCommitment === commitment;

  printTable('STEP 10b: Commitment Verification', [
    {
      name: 'stored_commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(commitment),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'decrypted_string',
      type: 'string',
      size: `${decryptedAnswer.length} chars`,
      value: truncate(decryptedAnswer),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'recomputed_commitment',
      type: 'SHA-256',
      size: '64 hex',
      value: truncate(recomputedCommitment),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'is_valid',
      type: 'boolean',
      size: '1 bit',
      value: isValid.toString(),
      location: 'Server',
      visibility: 'Public'
    },
  ]);

  // Parse answer
  const parts = decryptedAnswer.split('|');

  printTable('STEP 10c: Parse Decrypted Answer', [
    {
      name: 'surveyId (parsed)',
      type: 'string',
      size: `${parts[0].length} chars`,
      value: truncate(parts[0]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'courseCode (parsed)',
      type: 'string',
      size: `${parts[1].length} chars`,
      value: truncate(parts[1]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'teacherId (parsed)',
      type: 'string',
      size: `${parts[2].length} chars`,
      value: truncate(parts[2]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'answers (parsed)',
      type: 'string',
      size: `${parts[3].length} chars`,
      value: truncate(parts[3]),
      location: 'Server',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 11: STORE DECRYPTED DATA
  // ============================================================================

  console.log('\n\n📋 STEP 11: STORE DECRYPTED & PARSED DATA');

  printTable('STEP 11a: Decrypted Responses Table', [
    {
      name: 'id',
      type: 'UUID',
      size: '36 chars',
      value: '[Generated UUID]',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'survey_response_id',
      type: 'UUID',
      size: '36 chars',
      value: '[FK to survey_responses]',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'decrypted_answer',
      type: 'text',
      size: `${decryptedAnswer.length} chars`,
      value: truncate(decryptedAnswer),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'commitment_verified',
      type: 'boolean',
      size: '1 bit',
      value: 'true',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'decrypted_at',
      type: 'timestamp',
      size: '8 bytes',
      value: new Date().toISOString(),
      location: 'Database',
      visibility: 'Public'
    },
  ]);

  printTable('STEP 11b: Parsed Responses Table (per question)', [
    {
      name: 'id',
      type: 'UUID',
      size: '36 chars',
      value: '[Generated UUID]',
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'survey_id',
      type: 'UUID',
      size: '36 chars',
      value: truncate(parts[0]),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'course_code',
      type: 'string',
      size: `${parts[1].length} chars`,
      value: truncate(parts[1]),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'teacher_id',
      type: 'UUID',
      size: '36 chars',
      value: truncate(parts[2]),
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'question_1_rating',
      type: 'integer',
      size: '4 bytes',
      value: parts[3][0],
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'question_2_rating',
      type: 'integer',
      size: '4 bytes',
      value: parts[3][1],
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'question_3_rating',
      type: 'integer',
      size: '4 bytes',
      value: parts[3][2],
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'question_4_rating',
      type: 'integer',
      size: '4 bytes',
      value: parts[3][3],
      location: 'Database',
      visibility: 'Public'
    },
    {
      name: 'question_5_rating',
      type: 'integer',
      size: '4 bytes',
      value: parts[3][4],
      location: 'Database',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // STEP 12: ADMIN VIEWS ANALYTICS
  // ============================================================================

  console.log('\n\n📋 STEP 12: ADMIN VIEWS ANALYTICS');

  printTable('STEP 12: Analytics API Response', [
    {
      name: 'surveyId',
      type: 'string',
      size: `${parts[0].length} chars`,
      value: truncate(parts[0]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'courseCode',
      type: 'string',
      size: `${parts[1].length} chars`,
      value: truncate(parts[1]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'teacherId',
      type: 'string',
      size: `${parts[2].length} chars`,
      value: truncate(parts[2]),
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'total_responses',
      type: 'integer',
      size: '4 bytes',
      value: '1',
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'avg_question_1',
      type: 'float',
      size: '8 bytes',
      value: parts[3][0],
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'avg_question_2',
      type: 'float',
      size: '8 bytes',
      value: parts[3][1],
      location: 'Server',
      visibility: 'Public'
    },
    {
      name: 'student_identity',
      type: 'N/A',
      size: 'N/A',
      value: '❌ UNKNOWN (anonymous)',
      location: 'Server',
      visibility: 'Public'
    },
  ]);

  // ============================================================================
  // SUMMARY: DATA FLOW DIAGRAM
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('DATA FLOW SUMMARY: What Data Exists Where?');
  console.log('='.repeat(120));

  console.log('\n📍 CLIENT (Browser):');
  console.log('   • Token (64 hex chars)');
  console.log('   • Answer plaintext (e.g., "survey-cs101|CS101|teacher-001|54321")');
  console.log('   • Commitment (SHA-256 hash)');
  console.log('   • Blinding factor inv (for unlinkability)');
  console.log('   • Encrypted answer (256 bytes)');
  console.log('   • Signature (256 bytes)');
  console.log('   • Proof in localStorage (surveyId + commitment + encrypted + signature)');

  console.log('\n📍 SERVER:');
  console.log('   • Campaign encryption keys (public + private, 2048-bit RSA-OAEP)');
  console.log('   • Campaign blind signature keys (public + private, 2048-bit RSA-PSS)');
  console.log('   • Blinded message during signature request (NEVER sees actual commitment!)');
  console.log('   • After ingestion: encrypted responses + commitments from blockchain');
  console.log('   • After decryption: plaintext answers + parsed ratings');
  console.log('   ❌ NEVER has: Link between student identity and specific answer');

  console.log('\n📍 DATABASE (PostgreSQL):');
  console.log('   • survey_tokens: token, student_email, campaign_id, used, is_completed');
  console.log('   • survey_responses: commitment, encrypted_response, blockchain_tx');
  console.log('   • decrypted_responses: decrypted_answer, commitment_verified');
  console.log('   • parsed_responses: survey_id, ratings for each question');
  console.log('   ❌ NO FK from responses to students (preserves anonymity!)');

  console.log('\n📍 BLOCKCHAIN (Solana):');
  console.log('   • Campaign PDA (Program Derived Address)');
  console.log('   • Array of commitments (32 bytes each)');
  console.log('   • Array of encrypted responses (256 bytes each)');
  console.log('   • Total responses count');
  console.log('   • Merkle root (after campaign published)');
  console.log('   • Immutable, publicly verifiable');

  console.log('\n\n' + '='.repeat(120));
  console.log('PRIVACY PROPERTIES');
  console.log('='.repeat(120));

  console.log('\n✅ What IS Protected:');
  console.log('   1. Server cannot link students to their specific answers');
  console.log('   2. Server cannot see commitment during blind signature (only blindedMsg)');
  console.log('   3. Same plaintext → different ciphertext (RSA-OAEP randomization)');
  console.log('   4. Same commitment → different blindedMsg (blind signature randomization)');
  console.log('   5. Database has no FK from responses to students');
  console.log('   6. Blockchain submission bypasses server (no real-time correlation)');

  console.log('\n⚠️  What is NOT Protected:');
  console.log('   1. Server knows which students participated (survey_tokens.is_completed)');
  console.log('   2. Server knows how many students submitted (COUNT)');
  console.log('   3. If only 1 student submits, that response is obviously theirs');
  console.log('   4. Blind signature endpoint currently has NO authentication (vulnerability!)');

  console.log('\n💰 Data Storage Costs:');
  console.log('   • Blockchain: 5.76 MB account = 40 SOL rent (~$5,200 upfront)');
  console.log('   • Database: ~1 KB per response (negligible with PostgreSQL)');
  console.log('   • Client localStorage: ~1 KB per proof');

  console.log('\n\n' + '='.repeat(120));
  console.log('END OF DATA TRACKING DEMONSTRATION');
  console.log('='.repeat(120) + '\n');

  // ============================================================================
  // RANDOMNESS ANALYSIS - WHY DATA DIFFERS EACH TIME
  // ============================================================================

  await demonstrateRandomnessAnalysis();
}

// ============================================================================
// RANDOMNESS ANALYSIS
// ============================================================================

async function demonstrateRandomnessAnalysis() {
  console.log('\n\n');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');
  console.log('█                                                                                                                  █');
  console.log('█                          RANDOMNESS ANALYSIS: Why Data Differs Each Time                                        █');
  console.log('█                          Deep Dive into Sources of Randomness                                                   █');
  console.log('█                                                                                                                  █');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');

  console.log('\n📋 OVERVIEW\n');
  console.log('From the same-answer-demo.ts, we saw that even with IDENTICAL answerString,');
  console.log('most cryptographic values are DIFFERENT between Alice and Bob:');
  console.log('');
  console.log('✅ SAME:  answerString, commitment');
  console.log('❌ DIFF:  token, preparedMsg, inv, blindedMsg, blindSignature, signature, encryptedAnswer');
  console.log('');
  console.log('But WHY are they different? Let\'s trace the source of randomness in each step...');

  console.log('\n\n' + '='.repeat(120));
  console.log('SOURCE 1: crypto.randomBytes() - Token Generation');
  console.log('='.repeat(120));

  console.log('\n📍 WHERE: Admin token generation');
  console.log('📝 CODE:  const token = crypto.randomBytes(32).toString(\'hex\');');
  console.log('\n🔍 WHAT HAPPENS:');
  console.log('   • crypto.randomBytes(32) generates 32 random bytes using Node.js CSPRNG');
  console.log('   • CSPRNG = Cryptographically Secure Pseudo-Random Number Generator');
  console.log('   • On Linux: reads from /dev/urandom (kernel entropy pool)');
  console.log('   • On Windows: uses CryptGenRandom');
  console.log('   • .toString(\'hex\') converts to 64 hex characters');

  const token1 = crypto.randomBytes(32).toString('hex');
  const token2 = crypto.randomBytes(32).toString('hex');

  console.log('\n📊 DEMONSTRATION:');
  console.log(`   Token 1: ${token1}`);
  console.log(`   Token 2: ${token2}`);
  console.log(`   Same?    ${token1 === token2 ? 'YES' : 'NO'}`);

  console.log('\n💡 WHY DIFFERENT:');
  console.log('   • Each call to crypto.randomBytes() uses fresh kernel entropy');
  console.log('   • Collision probability: ~2^-128 (astronomically unlikely)');
  console.log('   • Purpose: Unique identifier for each student');

  console.log('\n\n' + '='.repeat(120));
  console.log('SOURCE 2: suite.prepare() - Random Prefix in preparedMsg');
  console.log('='.repeat(120));

  console.log('\n📍 WHERE: BlindRSA.prepare(msg) in @cloudflare/blindrsa-ts');
  console.log('📝 CODE:  const preparedMsg = suite.prepare(messageBytes);');
  console.log('\n🔍 LIBRARY SOURCE CODE (@cloudflare/blindrsa-ts/lib/src/blindrsa.js):');
  console.log('');
  console.log('   prepare(msg) {');
  console.log('       const msg_prefix_len = this.params.prepareType;  // 32 for Randomized');
  console.log('       const msg_prefix = crypto.getRandomValues(new Uint8Array(msg_prefix_len));');
  console.log('       return joinAll([msg_prefix, msg]);');
  console.log('   }');
  console.log('');
  console.log('🔍 WHAT HAPPENS:');
  console.log('   • RSABSSA.SHA384.PSS.Randomized() sets prepareType = PrepareType.Randomized = 32');
  console.log('   • crypto.getRandomValues() generates 32 RANDOM bytes (Web Crypto API)');
  console.log('   • preparedMsg = [32 random bytes] + commitment');
  console.log('   • Result: Even same commitment → different preparedMsg!');

  console.log('\n📊 DEMONSTRATION:');

  const blindSignKeys = await generateBlindSignKeyPair();
  const commitment = 'c11c8acd63f245407bdff8e1fde994189c083...';  // Same commitment
  const suite = RSABSSA.SHA384.PSS.Randomized();

  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(commitment); // Array of bytes

  const prepared1 = suite.prepare(msgBytes);   // Array of bytes + random 32 bytes prefix 
  const prepared2 = suite.prepare(msgBytes);   // Array of bytes + random 32 bytes prefix 

  console.log(`   Input commitment (same):  ${Buffer.from(msgBytes.slice(0, 40)).toString('hex')}...`);
  console.log(`   preparedMsg 1:            ${Buffer.from(prepared1.slice(0, 40)).toString('hex')}...`);
  console.log(`   preparedMsg 2:            ${Buffer.from(prepared2.slice(0, 40)).toString('hex')}...`);
  console.log(`   Same?                     ${Buffer.from(prepared1).toString('hex') === Buffer.from(prepared2).toString('hex') ? 'YES' : 'NO'}`);

  console.log('\n💡 WHY DIFFERENT:');
  console.log('   • 32-byte random prefix is regenerated each time');
  console.log('   • Uses browser/Node.js crypto.getRandomValues() (Web Crypto API)');
  console.log('   • Format: preparedMsg = [32 random bytes] + [64 hex commitment]');
  console.log('   • Total size: 32 + 64 = 96 bytes');
  console.log('');
  console.log('🔐 PRIVACY BENEFIT:');
  console.log('   • Server cannot build "commitment dictionary" from preparedMsg');
  console.log('   • Same commitment looks completely different after prepare()');

  console.log('\n\n' + '='.repeat(120));
  console.log('SOURCE 3: suite.blind() - Random Blinding Factor (inv)');
  console.log('='.repeat(120));

  console.log('\n📍 WHERE: BlindRSA.blind(publicKey, preparedMsg) in @cloudflare/blindrsa-ts');
  console.log('📝 CODE:  const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);');
  console.log('\n🔍 LIBRARY SOURCE CODE (@cloudflare/blindrsa-ts/lib/src/blindrsa.js):');
  console.log('');
  console.log('   async blind(publicKey, msg) {');
  console.log('       // ... extract key params ...');
  console.log('       const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);');
  console.log('       const m = os2ip(encoded_msg);');
  console.log('       ');
  console.log('       // 6. r = random_integer_uniform(1, n)  ← RANDOM GENERATION HERE!');
  console.log('       const r = random_integer_uniform(n, kLen);');
  console.log('       ');
  console.log('       // 7. inv = inverse_mod(r, n)');
  console.log('       let inv;');
  console.log('       try {');
  console.log('           inv = i2osp(r.inverseMod(n), kLen);  // Store inverse for unblinding');
  console.log('       } catch (e) {');
  console.log('           throw new Error(`blinding error: ${e.toString()}`);');
  console.log('       }');
  console.log('       ');
  console.log('       // 9. x = RSAVP1(pk, r)  // x = r^e mod n');
  console.log('       const x = rsavp1(pk, r);');
  console.log('       ');
  console.log('       // 10. z = m * x mod n    // Blind the message');
  console.log('       const z = m.mulmod(x, n);');
  console.log('       ');
  console.log('       // 11. blinded_msg = int_to_bytes(z, modulus_len)');
  console.log('       const blindedMsg = i2osp(z, kLen);');
  console.log('       ');
  console.log('       return { blindedMsg, inv };');
  console.log('   }');
  console.log('');
  console.log('🔍 LIBRARY SOURCE CODE (util.js - random_integer_uniform):');
  console.log('');
  console.log('   export function random_integer_uniform(n, kLen) {');
  console.log('       const MAX_NUM_TRIES = 128;');
  console.log('       for (let i = 0; i < MAX_NUM_TRIES; i++) {');
  console.log('           // Generate random bytes using Web Crypto API');
  console.log('           const r = os2ip(crypto.getRandomValues(new Uint8Array(kLen)));');
  console.log('           if (!(r.greaterEquals(n) || r.equals(0))) {');
  console.log('               return r;  // Returns uniformly random r where 1 <= r < n');
  console.log('           }');
  console.log('       }');
  console.log('       throw new Error(\'reached maximum tries for random integer generation\');');
  console.log('   }');
  console.log('');
  console.log('🔍 WHAT HAPPENS:');
  console.log('   1. Generate random blinding factor r using crypto.getRandomValues()');
  console.log('   2. r is chosen uniformly at random from [1, n) where n is RSA modulus');
  console.log('   3. Compute inv = r^(-1) mod n (modular inverse for unblinding later)');
  console.log('   4. Compute x = r^e mod n (raise r to public exponent e)');
  console.log('   5. Compute blindedMsg = m * x mod n (multiply message by x)');
  console.log('');
  console.log('📐 MATH:');
  console.log('   • r = random integer where 1 <= r < n (2048-bit modulus → ~256 bytes)');
  console.log('   • inv = r^(-1) mod n  (multiplicative inverse)');
  console.log('   • x = r^e mod n       (e = 65537, public exponent)');
  console.log('   • blindedMsg = m * r^e mod n');

  console.log('\n💡 WHY DIFFERENT:');
  console.log('   • Random r is generated fresh each time via crypto.getRandomValues()');
  console.log('   • Each r value produces different:');
  console.log('     - inv (the modular inverse r^(-1) mod n)');
  console.log('     - blindedMsg (m * r^e mod n)');
  console.log('   • Even same m (prepared message) → different blindedMsg!');

  console.log('\n🔐 PRIVACY BENEFIT:');
  console.log('   • Blind Signature Unlinkability:');
  console.log('     Server sees: blindedMsg = m * r^e mod n');
  console.log('     Server signs: blindSig = (m * r^e)^d mod n = m^d * r mod n');
  console.log('     Client unblinds: sig = blindSig * inv = m^d * r * r^(-1) = m^d mod n');
  console.log('   • Server CANNOT link blindedMsg to final signature!');
  console.log('   • Random r makes correlation computationally infeasible');

  console.log('\n\n' + '='.repeat(120));
  console.log('SOURCE 4: emsa_pss_encode() - PSS Salt in Blind Signature');
  console.log('='.repeat(120));

  console.log('\n📍 WHERE: Inside BlindRSA.blind() before blinding');
  console.log('📝 CODE:  const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);');
  console.log('\n🔍 WHAT IS PSS?');
  console.log('   • PSS = Probabilistic Signature Scheme');
  console.log('   • RSA-PSS adds RANDOM SALT to message before signing');
  console.log('   • Salt length: 48 bytes (for SHA-384, defined in RSABSSA spec)');
  console.log('');
  console.log('🔍 EMSA-PSS-ENCODE ALGORITHM (RFC 8017):');
  console.log('   1. mHash = Hash(M)           // Hash the message');
  console.log('   2. salt = random(sLen)       // Generate RANDOM salt! ← SOURCE OF RANDOMNESS');
  console.log('   3. M\' = [8 zeros] || mHash || salt');
  console.log('   4. H = Hash(M\')              // Hash with salt included');
  console.log('   5. DB = PS || 0x01 || salt   // Construct data block');
  console.log('   6. dbMask = MGF(H, ...)      // Mask generation function');
  console.log('   7. maskedDB = DB ⊕ dbMask');
  console.log('   8. EM = maskedDB || H || 0xbc');

  console.log('\n💡 WHY DIFFERENT:');
  console.log('   • PSS salt is generated randomly each time (48 bytes)');
  console.log('   • Uses crypto.getRandomValues() inside emsa_pss_encode()');
  console.log('   • Same preparedMsg → different encoded_msg due to random salt');
  console.log('   • This affects:');
  console.log('     - m (the integer representation of encoded_msg)');
  console.log('     - blindedMsg (depends on m)');
  console.log('     - blindSignature (depends on blindedMsg)');
  console.log('     - final signature (depends on blindSignature)');

  console.log('\n🔐 SECURITY BENEFIT:');
  console.log('   • Prevents signature forgery attacks');
  console.log('   • Same message → different signatures (probabilistic)');
  console.log('   • Protects against chosen message attacks');

  console.log('\n\n' + '='.repeat(120));
  console.log('SOURCE 5: RSA-OAEP Padding - Random Seed in Encryption');
  console.log('='.repeat(120));

  console.log('\n📍 WHERE: crypto.subtle.encrypt() for answer encryption');
  console.log('📝 CODE:  const encryptedBuffer = await crypto.subtle.encrypt({ name: \'RSA-OAEP\' }, publicKey, data);');
  console.log('\n🔍 WHAT IS OAEP?');
  console.log('   • OAEP = Optimal Asymmetric Encryption Padding');
  console.log('   • RSA-OAEP adds RANDOM SEED to plaintext before encryption');
  console.log('   • Seed length: 32 bytes (for SHA-256 hash)');
  console.log('');
  console.log('🔍 OAEP ENCODING ALGORITHM (RFC 8017):');
  console.log('   1. seed = random(hLen)       // Generate RANDOM seed! ← SOURCE OF RANDOMNESS');
  console.log('   2. DB = lHash || PS || 0x01 || M  // Data block with message M');
  console.log('   3. dbMask = MGF(seed, k - hLen - 1)');
  console.log('   4. maskedDB = DB ⊕ dbMask');
  console.log('   5. seedMask = MGF(maskedDB, hLen)');
  console.log('   6. maskedSeed = seed ⊕ seedMask');
  console.log('   7. EM = 0x00 || maskedSeed || maskedDB');
  console.log('   8. c = RSAEP(EM)  // c = EM^e mod n');

  console.log('\n📊 DEMONSTRATION:');

  const encryptionKeys = await generateEncryptionKeyPair();
  const plaintext = 'survey-cs101|CS101|teacher-001|54321';

  const encrypted1 = await encryptAnswer(plaintext, encryptionKeys.publicKey);
  const encrypted2 = await encryptAnswer(plaintext, encryptionKeys.publicKey);

  console.log(`   Plaintext (same):  ${plaintext}`);
  console.log(`   Encrypted 1:       ${Buffer.from(encrypted1.slice(0, 40)).toString('hex')}...`);
  console.log(`   Encrypted 2:       ${Buffer.from(encrypted2.slice(0, 40)).toString('hex')}...`);
  console.log(`   Same?              ${Buffer.from(encrypted1).toString('hex') === Buffer.from(encrypted2).toString('hex') ? 'YES' : 'NO'}`);

  console.log('\n💡 WHY DIFFERENT:');
  console.log('   • OAEP seed is generated randomly each encryption (32 bytes for SHA-256)');
  console.log('   • Uses browser/Node.js crypto implementation (Web Crypto API)');
  console.log('   • Same plaintext → completely different ciphertext');
  console.log('   • Encryption is NON-DETERMINISTIC');

  console.log('\n🔐 SECURITY BENEFIT:');
  console.log('   • IND-CPA Security: Indistinguishability under Chosen-Plaintext Attack');
  console.log('   • Attacker cannot tell if two ciphertexts encrypt same plaintext');
  console.log('   • Prevents pattern analysis (e.g., "commitment dictionary attack")');
  console.log('   • Semantic security: No information leaks from ciphertext');

  console.log('\n\n' + '='.repeat(120));
  console.log('SUMMARY TABLE: Sources of Randomness');
  console.log('='.repeat(120));

  console.log('\n┌───────────────────────┬────────────────────────────────┬──────────────┬────────────────────────────────────────────────┐');
  console.log('│ Variable              │ Source of Randomness           │ Size         │ Impact                                         │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ token                 │ crypto.randomBytes(32)         │ 32 bytes     │ Unique student identifier                      │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ preparedMsg           │ crypto.getRandomValues(32)     │ 32 bytes     │ Random prefix added by suite.prepare()         │');
  console.log('│                       │ (in suite.prepare())           │ prefix       │ Same commitment → diff preparedMsg             │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ encoded_msg (PSS)     │ crypto.getRandomValues(48)     │ 48 bytes     │ PSS salt in emsa_pss_encode()                  │');
  console.log('│                       │ (in emsa_pss_encode())         │ salt         │ Same preparedMsg → diff encoded_msg            │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ inv (blinding factor) │ crypto.getRandomValues(256)    │ ~256 bytes   │ Random r, then inv = r^(-1) mod n              │');
  console.log('│                       │ (in random_integer_uniform())  │ (2048-bit)   │ Different r → different inv                    │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ blindedMsg            │ Derived from random r          │ 256 bytes    │ blindedMsg = m * r^e mod n                     │');
  console.log('│                       │ (suite.blind())                │              │ Random r → different blindedMsg                │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ blindSignature        │ Derived from blindedMsg        │ 256 bytes    │ Server signs: (m * r^e)^d = m^d * r mod n      │');
  console.log('│                       │ (server blindSign())           │              │ Different blindedMsg → different blindSig      │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ signature (final)     │ Derived from blindSig + inv    │ 256 bytes    │ sig = blindSig * inv = m^d mod n               │');
  console.log('│                       │ (client finalize())            │              │ Different inv → different final sig            │');
  console.log('├───────────────────────┼────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ encryptedAnswer       │ crypto OAEP seed (32 bytes)    │ 32 bytes     │ RSA-OAEP random seed                           │');
  console.log('│                       │ (Web Crypto API)               │ seed         │ Same plaintext → diff ciphertext               │');
  console.log('└───────────────────────┴────────────────────────────────┴──────────────┴────────────────────────────────────────────────┘');

  console.log('\n\n' + '='.repeat(120));
  console.log('KEY INSIGHTS');
  console.log('='.repeat(120));

  console.log('\n1️⃣  DETERMINISTIC vs PROBABILISTIC:');
  console.log('   ✅ DETERMINISTIC (always same):');
  console.log('      • commitment = SHA256(answerString)  ← No randomness');
  console.log('   ');
  console.log('   ❌ PROBABILISTIC (different each time):');
  console.log('      • preparedMsg (32-byte random prefix)');
  console.log('      • encoded_msg (48-byte PSS salt)');
  console.log('      • inv (random blinding factor r)');
  console.log('      • blindedMsg (depends on random r)');
  console.log('      • signatures (depends on PSS salt + r)');
  console.log('      • encryptedAnswer (32-byte OAEP seed)');

  console.log('\n2️⃣  RANDOMNESS API:');
  console.log('   • Node.js:  crypto.randomBytes()         → Uses kernel CSPRNG (/dev/urandom)');
  console.log('   • Browser:  crypto.getRandomValues()     → Web Crypto API (uses OS CSPRNG)');
  console.log('   • Both are cryptographically secure (unpredictable)');

  console.log('\n3️⃣  LAYERED RANDOMNESS:');
  console.log('   Same answerString gets randomness added at MULTIPLE layers:');
  console.log('   ');
  console.log('   answerString (input)');
  console.log('        ↓');
  console.log('   commitment = SHA256(answerString)  ← Deterministic');
  console.log('        ↓');
  console.log('   preparedMsg = [32 random bytes] + commitment  ← Random layer 1');
  console.log('        ↓');
  console.log('   encoded_msg = EMSA_PSS(preparedMsg + 48-byte salt)  ← Random layer 2');
  console.log('        ↓');
  console.log('   blindedMsg = encoded_msg * r^e mod n  ← Random layer 3 (random r)');
  console.log('        ↓');
  console.log('   signature = (blindedMsg^d * inv) mod n  ← Depends on all layers');

  console.log('\n4️⃣  WHY SO MUCH RANDOMNESS?');
  console.log('   • preparedMsg randomness: Prevents commitment dictionary attack');
  console.log('   • PSS salt randomness:    Prevents signature forgery');
  console.log('   • Blinding factor r:      Provides unlinkability (server cannot correlate)');
  console.log('   • OAEP seed randomness:   Provides IND-CPA security (semantic security)');
  console.log('   ');
  console.log('   Each layer serves a DIFFERENT security purpose!');

  console.log('\n5️⃣  PRIVACY GUARANTEE:');
  console.log('   Even if Alice and Bob submit IDENTICAL answers:');
  console.log('   • Server sees different blindedMsg (cannot detect same commitment)');
  console.log('   • Server sees different signatures (PSS salt + blinding factor)');
  console.log('   • Blockchain sees different encrypted answers (OAEP seed)');
  console.log('   • Server CANNOT link students to responses!');

  console.log('\n\n' + '='.repeat(120));
  console.log('END OF RANDOMNESS ANALYSIS');
  console.log('='.repeat(120) + '\n');
}

// ============================================================================
// RUN DEMONSTRATION
// ============================================================================

if (require.main === module) {
  demonstrateWorkflowData().catch(console.error);
}

export { demonstrateWorkflowData };

#!/usr/bin/env ts-node
/**
 * Test Script: Test Specific Token
 * Tests the double blind signature workflow with a specific token
 */

import axios from 'axios';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Use the provided token
const TEST_TOKEN = process.argv[2] || '77ea9bb62af9595ce4282abb807cd7f0cea5e50bf21e36879c55d432189ae8a2';

let campaignId: string;
let studentEmail: string;
let ticketCommitment: string;
let surveys: any[] = [];

// Blind signature data
let suite: any;
let publicKey: any;
let blindingResult: any;
let unblindedTokenSignature: Uint8Array;
let blindingResultReceipt: any;
let unblindedReceiptSignature: Uint8Array;

/**
 * Step 0: Verify token and setup
 */
async function verifyToken() {
  console.log('\n🔍 Step 0: Verifying Token...');
  console.log(`Token: ${TEST_TOKEN}`);

  try {
    // Verify token
    const response = await axios.post(`${API_URL}/tokens/verify`, {
      token: TEST_TOKEN
    });

    const tokenData = response.data.tokenData;
    campaignId = tokenData.campaignId;
    studentEmail = tokenData.studentEmail;

    console.log(`✅ Token is valid!`);
    console.log(`   Campaign ID: ${campaignId}`);
    console.log(`   Student Email: ${studentEmail}`);
    console.log(`   Is Completed: ${tokenData.isCompleted}`);

    // Check token status
    const statusRes = await axios.get(`${API_URL}/tokens/student/${studentEmail}`, {
      params: { campaignId }
    });

    const token = statusRes.data[0];
    console.log(`\n   Token Status:`);
    console.log(`   - Ticket Issued: ${token.ticket ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Token Used: ${token.used ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Survey Completed: ${token.isCompleted ? '✅ YES' : '❌ NO'}`);

    if (token.ticket) {
      console.log(`\n   ⚠️  WARNING: Token already has ticket issued!`);
      console.log(`   This means Phase 1.1 was already completed.`);
      console.log(`   You may need a fresh token for full testing.`);
    }

    if (token.used) {
      console.log(`\n   ⚠️  WARNING: Token is already used!`);
      console.log(`   This means Phase 1.2 was already completed.`);
      console.log(`   You may need a fresh token for full testing.`);
    }

    if (token.isCompleted) {
      console.log(`\n   ⚠️  WARNING: Token is already completed!`);
      console.log(`   This token has finished the entire workflow.`);
      console.log(`   You need a fresh token for testing.`);
      return false;
    }

    // Get campaign public key for blind signatures
    const pubKeyRes = await axios.get(`${API_URL}/crypto/campaigns/${campaignId}/public-keys`);
    const pubKeyBase64 = pubKeyRes.data.blindSignaturePublicKey;

    const pubKeyBuffer = Buffer.from(pubKeyBase64, 'base64');
    publicKey = await webcrypto.subtle.importKey(
      'spki',
      pubKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    suite = RSABSSA.SHA384.PSS.Randomized();
    console.log('✅ Loaded campaign public key for blind signatures');

    return true;

  } catch (error: any) {
    console.error('\n❌ Token verification failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

/**
 * Phase 1.1: Get Ticket & Surveys
 */
async function phase1GetTicketAndSurveys() {
  console.log('\n🎫 Phase 1.1: Get Ticket & Surveys');
  console.log(`GET ${API_URL}/tokens/login`);
  console.log(`Authorization: Bearer ${TEST_TOKEN.substring(0, 20)}...`);

  const response = await axios.get(`${API_URL}/tokens/login`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`
    }
  });

  surveys = response.data.surveys;
  ticketCommitment = response.data.ticketCommitment;
  campaignId = response.data.campaignId;

  console.log(`✅ Received ticket commitment: ${ticketCommitment}`);
  console.log(`✅ Received ${surveys.length} surveys:`);
  surveys.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.title}`);
    console.log(`      Course: ${s.courseCode} - ${s.courseName}`);
    console.log(`      Teacher: ${s.teacherName}`);
  });

  return response.data;
}

/**
 * Phase 1.2: Blind Sign Token
 */
async function phase1BlindSignToken() {
  console.log('\n🔏 Phase 1.2: Blind Sign Token');

  // Prepare token message - blind the actual token string itself!
  const tokenMessage = Buffer.from(TEST_TOKEN); // Use the actual token hex string
  console.log(`Token message: ${TEST_TOKEN.substring(0, 32)}...`);
  console.log(`Token message length: ${tokenMessage.length} bytes`);

  // Prepare and blind the token
  console.log('Preparing message...');
  const preparedToken = suite.prepare(tokenMessage);
  console.log(`Prepared token length: ${preparedToken.length} bytes`);
  console.log('Blinding message...');
  blindingResult = await suite.blind(publicKey, preparedToken);
  console.log('Blinding result:', {
    hasBlindedMsg: !!blindingResult.blindedMsg,
    hasInv: !!blindingResult.inv,
    blindedMsgType: blindingResult.blindedMsg?.constructor.name,
    invType: blindingResult.inv?.constructor.name,
    blindedMsgLength: blindingResult.blindedMsg?.length,
    invLength: blindingResult.inv?.length
  });
  const blindedToken = Buffer.from(blindingResult.blindedMsg).toString('base64');

  console.log(`Blinded token: ${blindedToken.substring(0, 50)}...`);
  console.log(`POST ${API_URL}/tokens/blind-sign-token`);

  const response = await axios.post(
    `${API_URL}/tokens/blind-sign-token`,
    {
      blindedToken,
      campaignId
    },
    {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`
      }
    }
  );

  if (!response.data.blindSignature) {
    console.error('❌ No blind signature in response:', response.data);
    throw new Error('Server did not return blind signature');
  }

  const blindSignature = Buffer.from(response.data.blindSignature, 'base64');
  console.log(`✅ Received blind signature: ${response.data.blindSignature.substring(0, 50)}...`);
  console.log(`   Blind signature length: ${blindSignature.length} bytes`);
  console.log(`   Blinding inverse length: ${blindingResult.inv.length} bytes`);

  // Unblind the signature
  try {
    unblindedTokenSignature = await suite.finalize(
      publicKey,
      preparedToken,
      blindSignature,
      blindingResult.inv
    );
  } catch (error: any) {
    console.error('❌ Failed to unblind signature:', error.message);
    console.error('   Blinding result:', blindingResult);
    throw error;
  }

  console.log(`✅ Unblinded token signature: ${Buffer.from(unblindedTokenSignature).toString('base64').substring(0, 50)}...`);

  // Verify the unblinded signature
  const isValid = await suite.verify(publicKey, unblindedTokenSignature, preparedToken);

  if (!isValid) {
    throw new Error('Token signature verification failed!');
  }

  console.log('✅ Token signature verified successfully');

  // Store preparedToken for Phase 3
  (global as any).preparedToken = preparedToken;

  return response.data;
}

/**
 * Phase 2: Complete Surveys (Simulated Client-Side)
 */
async function phase2CompleteSurveys() {
  console.log('\n📝 Phase 2: Complete Surveys (Client-Side Simulation)');

  const responses = [];

  for (const survey of surveys) {
    console.log(`\nCompleting survey: ${survey.title}`);

    // Generate random answers (1-5 scale, 25 questions)
    const answers = Array.from({ length: 25 }, () => Math.floor(Math.random() * 5) + 1);
    const answersString = answers.join('');

    // Format answer string: surveyId|courseCode|teacherId|answers
    const answerString = `${survey.id}|${survey.courseCode}|${survey.teacherId}|${answersString}`;
    console.log(`Answer string: ${answerString.substring(0, 80)}...`);

    // Get campaign public encryption key
    const pubKeyRes = await axios.get(`${API_URL}/crypto/campaigns/${campaignId}/public-keys`);
    const encPubKeyBase64 = pubKeyRes.data.encryptionPublicKey;
    const encPubKeyBuffer = Buffer.from(encPubKeyBase64, 'base64');

    const encPublicKey = await webcrypto.subtle.importKey(
      'spki',
      encPubKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );

    // Encrypt answer
    const answerBuffer = new TextEncoder().encode(answerString);
    const encryptedAnswer = await webcrypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      encPublicKey,
      answerBuffer
    );

    // Generate commitment
    const commitmentRes = await axios.post(`${API_URL}/crypto/generate-commitment`, {
      message: answerString
    });
    const commitment = commitmentRes.data.commitment;

    console.log(`✅ Encrypted and committed answer`);
    console.log(`   Commitment: ${commitment.substring(0, 50)}...`);

    responses.push({
      surveyId: survey.id,
      encryptedAnswer: Buffer.from(encryptedAnswer).toString('base64'),
      commitment
    });
  }

  console.log(`\n✅ Completed ${responses.length} surveys`);
  return responses;
}

/**
 * Phase 3: Submit Batch Responses
 */
async function phase3SubmitBatch(responses: any[]) {
  console.log('\n📤 Phase 3: Submit Batch Responses');

  // Generate random receipt R (like in protocol demo)
  const crypto = require('crypto');
  const receiptR = crypto.randomBytes(32).toString('hex');
  const receiptMessage = Buffer.from(receiptR);
  console.log(`Receipt R: ${receiptR.substring(0, 32)}...`);

  // Prepare and blind the receipt
  console.log('Preparing receipt message...');
  const preparedReceipt = suite.prepare(receiptMessage);
  console.log('Blinding receipt...');
  blindingResultReceipt = await suite.blind(publicKey, preparedReceipt);
  const blindedReceipt = Buffer.from(blindingResultReceipt.blindedMsg).toString('base64');

  console.log(`Blinded receipt: ${blindedReceipt.substring(0, 50)}...`);

  // Prepare authorization header using stored preparedToken from Phase 1
  const preparedToken = (global as any).preparedToken;
  const authToken = `${Buffer.from(preparedToken).toString('base64')}.${Buffer.from(unblindedTokenSignature).toString('base64')}`;

  console.log(`Authorization: Bearer ${authToken.substring(0, 100)}...`);
  console.log(`POST ${API_URL}/responses/submit-batch`);

  const response = await axios.post(
    `${API_URL}/responses/submit-batch`,
    {
      campaignId,
      responses,
      ticketCommitment,
      blindedReceipt
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  );

  const blindReceiptSignature = Buffer.from(response.data.blindSignature, 'base64');
  console.log(`✅ Received receipt blind signature`);
  console.log(`✅ Processed ${response.data.processedCount} responses`);
  console.log(`✅ Submitted at: ${response.data.submittedAt}`);

  // Unblind the receipt signature
  unblindedReceiptSignature = await suite.finalize(
    publicKey,
    preparedReceipt,
    blindReceiptSignature,
    blindingResultReceipt.inv
  );

  console.log(`✅ Unblinded receipt signature`);

  // Verify the receipt signature
  const isValid = await suite.verify(publicKey, unblindedReceiptSignature, preparedReceipt);

  if (!isValid) {
    throw new Error('Receipt signature verification failed!');
  }

  console.log('✅ Receipt signature verified successfully');

  // Store preparedReceipt for Phase 4
  (global as any).preparedReceipt = preparedReceipt;

  return response.data;
}

/**
 * Phase 4: Claim Participation
 */
async function phase4ClaimParticipation() {
  console.log('\n🏆 Phase 4: Claim Participation');

  // Prepare authorization header with receipt signature using stored preparedReceipt from Phase 3
  const preparedReceipt = (global as any).preparedReceipt;
  const authReceipt = `${Buffer.from(preparedReceipt).toString('base64')}.${Buffer.from(unblindedReceiptSignature).toString('base64')}`;

  console.log(`Authorization: Bearer ${authReceipt.substring(0, 100)}...`);
  console.log(`POST ${API_URL}/tokens/participation/claim`);

  const response = await axios.post(
    `${API_URL}/tokens/participation/claim`,
    {
      email: studentEmail,
      campaignId
    },
    {
      headers: {
        Authorization: `Bearer ${authReceipt}`
      }
    }
  );

  console.log(`✅ Participation claimed successfully`);
  console.log(`✅ Success: ${response.data.success}`);
  console.log(`✅ Participation recorded: ${response.data.participationRecorded}`);
  console.log(`✅ Claimed at: ${response.data.claimedAt}`);

  return response.data;
}

/**
 * Verification: Check token completion status
 */
async function verifyCompletion() {
  console.log('\n✅ Verification: Check Token Completion Status');

  const response = await axios.get(`${API_URL}/tokens/student/${studentEmail}`, {
    params: { campaignId }
  });

  const token = response.data[0];

  console.log(`\nFinal Token Status for ${studentEmail}:`);
  console.log(`  Campaign ID: ${token.campaignId}`);
  console.log(`  Ticket Issued: ${token.ticket ? '✅ YES' : '❌ NO'}`);
  console.log(`  Token Used: ${token.used ? '✅ YES' : '❌ NO'}`);
  console.log(`  Survey Completed: ${token.isCompleted ? '✅ YES' : '❌ NO'}`);
  console.log(`  Created At: ${token.createdAt}`);
  console.log(`  Used At: ${token.usedAt || 'N/A'}`);
  console.log(`  Completed At: ${token.completedAt || 'N/A'}`);

  if (!token.ticket || !token.used || !token.isCompleted) {
    throw new Error('Token workflow incomplete!');
  }

  console.log('\n✅ All token flags correctly set!');
  console.log('✅ Workflow completed successfully!');
}

/**
 * Main test runner
 */
async function runTest() {
  console.log('🚀 Testing Double Blind Signature Workflow');
  console.log('=' .repeat(60));

  try {
    const isValid = await verifyToken();

    if (!isValid) {
      console.log('\n⚠️  Token validation failed. Please check token status above.');
      process.exit(1);
    }

    await phase1GetTicketAndSurveys();
    await phase1BlindSignToken();
    const responses = await phase2CompleteSurveys();
    await phase3SubmitBatch(responses);
    await phase4ClaimParticipation();
    await verifyCompletion();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed successfully!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Test failed!');
    console.error('='.repeat(60));

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Run the test
runTest();

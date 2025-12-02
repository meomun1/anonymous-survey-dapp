/**
 * SAME ANSWER DEMONSTRATION
 *
 * Shows what happens when two students (Alice and Bob) submit IDENTICAL answers.
 * Which variables are the same? Which are different?
 *
 * Run: npx ts-node protocol/src/same-answer-demo.ts
 */

import * as crypto from 'crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';

// ============================================================================
// CRYPTO UTILITIES
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
// TABLE UTILITIES
// ============================================================================

function truncate(str: string, maxLen: number = 40): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function compareBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

async function demonstrateSameAnswer() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');
  console.log('█                                                                                                                  █');
  console.log('█                          SAME ANSWER DEMONSTRATION                                                              █');
  console.log('█                          Two students submit IDENTICAL answers                                                 █');
  console.log('█                                                                                                                  █');
  console.log('████████████████████████████████████████████████████████████████████████████████████████████████████████████████████');

  // Generate campaign keys (shared)
  const encryptionKeys = await generateEncryptionKeyPair();
  const blindSignKeys = await generateBlindSignKeyPair();

  console.log('\n✅ Campaign keys generated (shared by all students)');
  console.log('   • Encryption keys: RSA-OAEP 2048-bit');
  console.log('   • Blind signature keys: RSA-PSS 2048-bit');

  // ============================================================================
  // SCENARIO: Alice and Bob both give the same ratings
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('SCENARIO: Alice and Bob both rate their CS101 teacher:');
  console.log('  Question 1 (Knowledge): 5');
  console.log('  Question 2 (Clarity): 4');
  console.log('  Question 3 (Engagement): 3');
  console.log('  Question 4 (Availability): 2');
  console.log('  Question 5 (Overall): 1');
  console.log('='.repeat(120));

  // Same answer string for both students
  const surveyId = 'survey-cs101-teacher1';
  const courseCode = 'CS101';
  const teacherId = 'teacher-001';
  const answers = '54321'; // IDENTICAL ratings

  const answerString = `${surveyId}|${courseCode}|${teacherId}|${answers}`;

  console.log(`\n📝 Identical answerString: "${answerString}"`);

  // ============================================================================
  // ALICE's WORKFLOW
  // ============================================================================

  console.log('\n\n' + '─'.repeat(120));
  console.log('👩 ALICE\'S WORKFLOW');
  console.log('─'.repeat(120));

  // Alice's token
  const aliceToken = crypto.randomBytes(32).toString('hex');
  console.log(`\n1. Alice's token: ${truncate(aliceToken)}`);

  // Alice generates commitment
  const aliceCommitment = generateCommitment(answerString);
  console.log(`2. Alice's commitment: ${truncate(aliceCommitment)}`);

  // Alice blinds commitment
  const aliceBlind = await blindMessage(aliceCommitment, blindSignKeys.publicKey);
  console.log(`3. Alice's blindedMsg: ${truncate(bytesToHex(aliceBlind.blindedMsg))}`);
  console.log(`   Alice's inv (blinding factor): ${truncate(bytesToHex(aliceBlind.inv))}`);
  console.log(`   Alice's preparedMsg: ${truncate(bytesToHex(aliceBlind.preparedMsg))}`);

  // Server signs Alice's blinded message
  const aliceBlindSignature = await blindSign(aliceBlind.blindedMsg, blindSignKeys.privateKey);
  console.log(`4. Alice's blindSignature (from server): ${truncate(bytesToHex(aliceBlindSignature))}`);

  // Alice unblinds signature
  const aliceSignature = await unblindSignature(
    aliceBlindSignature,
    aliceBlind.inv,
    blindSignKeys.publicKey,
    aliceBlind.preparedMsg
  );
  console.log(`5. Alice's final signature: ${truncate(bytesToHex(aliceSignature))}`);

  // Alice encrypts answer
  const aliceEncrypted = await encryptAnswer(answerString, encryptionKeys.publicKey);
  console.log(`6. Alice's encrypted answer: ${truncate(bytesToHex(aliceEncrypted))}`);

  // ============================================================================
  // BOB's WORKFLOW (SAME ANSWER!)
  // ============================================================================

  console.log('\n\n' + '─'.repeat(120));
  console.log('👨 BOB\'S WORKFLOW (with IDENTICAL answer)');
  console.log('─'.repeat(120));

  // Bob's token (different from Alice)
  const bobToken = crypto.randomBytes(32).toString('hex');
  console.log(`\n1. Bob's token: ${truncate(bobToken)}`);

  // Bob generates commitment (SAME as Alice because same answerString)
  const bobCommitment = generateCommitment(answerString);
  console.log(`2. Bob's commitment: ${truncate(bobCommitment)}`);

  // Bob blinds commitment (DIFFERENT from Alice due to random blinding factor)
  const bobBlind = await blindMessage(bobCommitment, blindSignKeys.publicKey);
  console.log(`3. Bob's blindedMsg: ${truncate(bytesToHex(bobBlind.blindedMsg))}`);
  console.log(`   Bob's inv (blinding factor): ${truncate(bytesToHex(bobBlind.inv))}`);
  console.log(`   Bob's preparedMsg: ${truncate(bytesToHex(bobBlind.preparedMsg))}`);

  // Server signs Bob's blinded message (DIFFERENT from Alice)
  const bobBlindSignature = await blindSign(bobBlind.blindedMsg, blindSignKeys.privateKey);
  console.log(`4. Bob's blindSignature (from server): ${truncate(bytesToHex(bobBlindSignature))}`);

  // Bob unblinds signature (DIFFERENT from Alice)
  const bobSignature = await unblindSignature(
    bobBlindSignature,
    bobBlind.inv,
    blindSignKeys.publicKey,
    bobBlind.preparedMsg
  );
  console.log(`5. Bob's final signature: ${truncate(bytesToHex(bobSignature))}`);

  // Bob encrypts answer (DIFFERENT from Alice due to random OAEP padding)
  const bobEncrypted = await encryptAnswer(answerString, encryptionKeys.publicKey);
  console.log(`6. Bob's encrypted answer: ${truncate(bytesToHex(bobEncrypted))}`);

  // ============================================================================
  // COMPARISON TABLE
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('COMPARISON: What is SAME vs DIFFERENT?');
  console.log('='.repeat(120));

  console.log('\n┌────────────────────────────┬──────────────┬──────────────────────────────────────────┬──────────────────────────────────────────┬────────────┐');
  console.log('│ Variable                   │ Same/Diff?   │ Alice\'s Value                            │ Bob\'s Value                              │ Why?       │');
  console.log('├────────────────────────────┼──────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┼────────────┤');

  // Row 1: answerString
  console.log(`│ answerString               │ ✅ SAME      │ ${truncate(answerString, 40)} │ ${truncate(answerString, 40)} │ Input      │`);

  // Row 2: commitment
  const commitmentSame = aliceCommitment === bobCommitment;
  console.log(`│ commitment (SHA-256)       │ ${commitmentSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(aliceCommitment, 40)} │ ${truncate(bobCommitment, 40)} │ Determin.  │`);

  // Row 3: token
  const tokenSame = aliceToken === bobToken;
  console.log(`│ token                      │ ${tokenSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(aliceToken, 40)} │ ${truncate(bobToken, 40)} │ Random     │`);

  // Row 4: preparedMsg
  const preparedMsgSame = compareBytes(aliceBlind.preparedMsg, bobBlind.preparedMsg);
  console.log(`│ preparedMsg                │ ${preparedMsgSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceBlind.preparedMsg), 40)} │ ${truncate(bytesToHex(bobBlind.preparedMsg), 40)} │ Random     │`);

  // Row 5: inv (blinding factor)
  const invSame = compareBytes(aliceBlind.inv, bobBlind.inv);
  console.log(`│ inv (blinding factor)      │ ${invSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceBlind.inv), 40)} │ ${truncate(bytesToHex(bobBlind.inv), 40)} │ Random     │`);

  // Row 6: blindedMsg
  const blindedMsgSame = compareBytes(aliceBlind.blindedMsg, bobBlind.blindedMsg);
  console.log(`│ blindedMsg                 │ ${blindedMsgSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceBlind.blindedMsg), 40)} │ ${truncate(bytesToHex(bobBlind.blindedMsg), 40)} │ Random     │`);

  // Row 7: blindSignature
  const blindSigSame = compareBytes(aliceBlindSignature, bobBlindSignature);
  console.log(`│ blindSignature             │ ${blindSigSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceBlindSignature), 40)} │ ${truncate(bytesToHex(bobBlindSignature), 40)} │ Derived    │`);

  // Row 8: signature (final)
  const signatureSame = compareBytes(aliceSignature, bobSignature);
  console.log(`│ signature (final)          │ ${signatureSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceSignature), 40)} │ ${truncate(bytesToHex(bobSignature), 40)} │ Derived    │`);

  // Row 9: encrypted answer
  const encryptedSame = compareBytes(aliceEncrypted, bobEncrypted);
  console.log(`│ encryptedAnswer            │ ${encryptedSame ? '✅ SAME' : '❌ DIFF'}      │ ${truncate(bytesToHex(aliceEncrypted), 40)} │ ${truncate(bytesToHex(bobEncrypted), 40)} │ Random     │`);

  console.log('└────────────────────────────┴──────────────┴──────────────────────────────────────────┴──────────────────────────────────────────┴────────────┘');

  // ============================================================================
  // DETAILED EXPLANATION
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('DETAILED EXPLANATION');
  console.log('='.repeat(120));

  console.log('\n✅ VARIABLES THAT ARE THE SAME:');
  console.log('');
  console.log('1. answerString');
  console.log('   Value: "survey-cs101-teacher1|CS101|teacher-001|54321"');
  console.log('   Why: Both students gave identical ratings (5, 4, 3, 2, 1)');
  console.log('');
  console.log('2. commitment (SHA-256 hash)');
  console.log(`   Value: ${aliceCommitment}`);
  console.log('   Why: SHA-256 is deterministic - same input always produces same output');
  console.log('   Formula: SHA256(answerString)');
  console.log('   ⚠️  PRIVACY ISSUE: Server could build a "commitment dictionary" by hashing common answers!');

  console.log('\n\n❌ VARIABLES THAT ARE DIFFERENT:');
  console.log('');
  console.log('1. token');
  console.log(`   Alice: ${aliceToken}`);
  console.log(`   Bob:   ${bobToken}`);
  console.log('   Why: Generated with crypto.randomBytes(32) - unique for each student');
  console.log('   Purpose: Identifies student for token validation');
  console.log('');
  console.log('2. preparedMsg (prepared commitment for blind signature)');
  console.log(`   Alice: ${truncate(bytesToHex(aliceBlind.preparedMsg), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobBlind.preparedMsg), 80)}`);
  console.log('   Why: RSABSSA.prepare() adds 32-byte RANDOM prefix to commitment');
  console.log('   Formula: preparedMsg = [random 32 bytes] + commitment');
  console.log('   🔐 PRIVACY PROTECTION: Even same commitment → different preparedMsg!');
  console.log('');
  console.log('3. inv (blinding factor)');
  console.log(`   Alice: ${truncate(bytesToHex(aliceBlind.inv), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobBlind.inv), 80)}`);
  console.log('   Why: Randomly generated during suite.blind() call');
  console.log('   Purpose: Used to "unblind" the blind signature later');
  console.log('   🔐 CRITICAL: Server NEVER sees this value!');
  console.log('');
  console.log('4. blindedMsg');
  console.log(`   Alice: ${truncate(bytesToHex(aliceBlind.blindedMsg), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobBlind.blindedMsg), 80)}`);
  console.log('   Why: Derived from preparedMsg + random inv');
  console.log('   Formula: blindedMsg = preparedMsg * (inv^e) mod N');
  console.log('   🔐 UNLINKABILITY: Server cannot tell these came from same commitment!');
  console.log('');
  console.log('5. blindSignature (from server)');
  console.log(`   Alice: ${truncate(bytesToHex(aliceBlindSignature), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobBlindSignature), 80)}`);
  console.log('   Why: Server signs different blindedMsg values');
  console.log('   Formula: blindSignature = (blindedMsg^d) mod N');
  console.log('   Server perspective: "These look like two completely different signature requests"');
  console.log('');
  console.log('6. signature (final, after unblinding)');
  console.log(`   Alice: ${truncate(bytesToHex(aliceSignature), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobSignature), 80)}`);
  console.log('   Why: Derived from different blindSignatures and inv values');
  console.log('   Formula: signature = blindSignature * inv mod N');
  console.log('   Result: Two VALID signatures on different preparedMsg (but same commitment!)');
  console.log('');
  console.log('7. encryptedAnswer');
  console.log(`   Alice: ${truncate(bytesToHex(aliceEncrypted), 80)}`);
  console.log(`   Bob:   ${truncate(bytesToHex(bobEncrypted), 80)}`);
  console.log('   Why: RSA-OAEP includes RANDOM padding/seed');
  console.log('   Formula: encrypt(plaintext + random_padding)');
  console.log('   🔐 IND-CPA SECURITY: Same plaintext → different ciphertext every time!');

  // ============================================================================
  // PRIVACY ANALYSIS
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('PRIVACY ANALYSIS: Can Server Detect Same Answers?');
  console.log('='.repeat(120));

  console.log('\n🔍 What Server Sees:');
  console.log('');
  console.log('Request 1 (Alice):');
  console.log(`  • blindedMsg: ${truncate(bytesToHex(aliceBlind.blindedMsg), 80)}`);
  console.log('  • Returns blindSignature');
  console.log('');
  console.log('Request 2 (Bob):');
  console.log(`  • blindedMsg: ${truncate(bytesToHex(bobBlind.blindedMsg), 80)}`);
  console.log('  • Returns blindSignature');
  console.log('');
  console.log('❓ Can server tell these are from the same commitment?');
  console.log('   ❌ NO! The blindedMsg values look completely random and unrelated.');
  console.log('   ❌ Server cannot reverse-engineer the commitment from blindedMsg.');
  console.log('   ❌ Server cannot build a "signature database" to match later.');

  console.log('\n\n🔍 What Server Sees on Blockchain:');
  console.log('');
  console.log('Response 1 (Alice):');
  console.log(`  • commitment: ${aliceCommitment}`);
  console.log(`  • encrypted: ${truncate(bytesToHex(aliceEncrypted), 70)}`);
  console.log('');
  console.log('Response 2 (Bob):');
  console.log(`  • commitment: ${bobCommitment}`);
  console.log(`  • encrypted: ${truncate(bytesToHex(bobEncrypted), 70)}`);
  console.log('');
  console.log('❓ Can server tell these are from the same answerString?');
  console.log('   ⚠️  YES! commitments are IDENTICAL (SHA-256 is deterministic)');
  console.log('   ❌ But encrypted answers are DIFFERENT (RSA-OAEP randomization)');
  console.log('');
  console.log('🚨 POTENTIAL ATTACK: Commitment Dictionary');
  console.log('   Server could pre-compute commitments for common answer combinations:');
  console.log('   SHA256("survey-cs101|CS101|teacher-001|55555") = abc123...');
  console.log('   SHA256("survey-cs101|CS101|teacher-001|11111") = def456...');
  console.log('   SHA256("survey-cs101|CS101|teacher-001|54321") = ' + aliceCommitment);
  console.log('');
  console.log('   If commitment matches, server knows the answers WITHOUT decryption!');
  console.log('');
  console.log('🛡️  MITIGATIONS:');
  console.log('   1. Add random salt to answerString before hashing (NOT currently implemented)');
  console.log('      Formula: commitment = SHA256(answerString + randomSalt)');
  console.log('      Trade-off: Cannot verify commitment after decryption');
  console.log('');
  console.log('   2. Use large answer space (many questions, many options)');
  console.log('      Example: 25 questions × 5 options = 5^25 ≈ 3×10^17 combinations');
  console.log('      Pre-computing dictionary becomes infeasible');
  console.log('');
  console.log('   3. Add free-text questions (not just ratings)');
  console.log('      Makes dictionary attack impossible');

  console.log('\n\n❓ Can server tell WHO submitted these identical answers?');
  console.log('   ❌ NO! Even though commitments are same:');
  console.log('      • Server cannot link commitment to blindedMsg (unlinkability)');
  console.log('      • Server cannot link commitment to student token');
  console.log('      • Blockchain submission bypasses server (no timing correlation)');
  console.log('      • Database has no FK from responses to students');

  // ============================================================================
  // SUMMARY TABLE
  // ============================================================================

  console.log('\n\n' + '='.repeat(120));
  console.log('SUMMARY: Privacy Properties with Same Answers');
  console.log('='.repeat(120));

  console.log('\n┌────────────────────────────────────────────────┬──────────────┬────────────────────────────────────────────────┐');
  console.log('│ Question                                       │ Answer       │ Explanation                                    │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same answerString?                             │ ✅ YES       │ Both students gave same ratings                │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same commitment?                               │ ✅ YES       │ SHA-256 is deterministic                       │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same preparedMsg?                              │ ❌ NO        │ Random 32-byte prefix added                    │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same blindedMsg?                               │ ❌ NO        │ Random blinding factor                         │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same blindSignature?                           │ ❌ NO        │ Derived from different blindedMsg              │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same final signature?                          │ ❌ NO        │ Different unblinding factors                   │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Same encrypted answer?                         │ ❌ NO        │ RSA-OAEP random padding                        │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Can server link blindedMsg to commitment?      │ ❌ NO        │ Blind signature unlinkability                  │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Can server detect same answers from encrypted? │ ❌ NO        │ Ciphertexts are different                      │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Can server detect same answers from commitment?│ ⚠️  YES      │ Commitments are identical (attack possible)    │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ Can server link commitment to student?         │ ❌ NO        │ No link between blind sig and submission       │');
  console.log('├────────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────┤');
  console.log('│ After decryption, can admin tell who answered? │ ❌ NO        │ No FK to students table                        │');
  console.log('└────────────────────────────────────────────────┴──────────────┴────────────────────────────────────────────────┘');

  console.log('\n\n' + '='.repeat(120));
  console.log('CONCLUSION');
  console.log('='.repeat(120));

  console.log('\n✅ GOOD NEWS:');
  console.log('   • Server CANNOT link students to their specific answers');
  console.log('   • Same plaintext → different ciphertext (encryption randomization)');
  console.log('   • Same commitment → different blind signatures (signature randomization)');
  console.log('   • Unlinkability property holds even with identical answers');

  console.log('\n⚠️  POTENTIAL VULNERABILITY:');
  console.log('   • Same answerString → same commitment (deterministic hash)');
  console.log('   • Server could pre-compute commitment dictionary for common answers');
  console.log('   • With small answer space, server could guess answers without decryption');

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   • Use large question sets (25+ questions) to make dictionary attack infeasible');
  console.log('   • Include free-text questions (infinite answer space)');
  console.log('   • Consider adding random salt to commitment (trade-off: loses verifiability)');
  console.log('   • Current implementation is ACCEPTABLE for typical course evaluations');
  console.log('   • For high-security scenarios, implement salted commitments');

  console.log('\n\n' + '='.repeat(120));
  console.log('END OF SAME ANSWER DEMONSTRATION');
  console.log('='.repeat(120) + '\n');
}

// ============================================================================
// RUN DEMONSTRATION
// ============================================================================

if (require.main === module) {
  demonstrateSameAnswer().catch(console.error);
}

export { demonstrateSameAnswer };

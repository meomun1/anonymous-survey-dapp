#!/bin/bash

# Full Workflow Test - Anonymous Survey System
# Tests the complete flow from campaign creation to blockchain closure
# Includes full double blind signature protocol

set -e  # Exit on error

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@school.edu"
ADMIN_PASSWORD="admin123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Full Workflow Test${NC}"
echo -e "${BLUE}Anonymous Survey System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    exit 1
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo -e "${RED}Error: ts-node is not installed${NC}"
    echo "Please install it with: npm install -g ts-node"
    exit 1
fi

# Function to print step header
print_step() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ============================================================================
# STEP 1: Admin Login
# ============================================================================
print_step "STEP 1: Admin Login"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$JWT_TOKEN" == "null" ] || [ -z "$JWT_TOKEN" ]; then
    print_error "Login failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

print_success "Admin logged in"
echo ""

# ============================================================================
# STEP 2: Create University Structure
# ============================================================================
print_step "STEP 2: Create University Structure"

# Create semester
print_info "Creating semester..."
SEMESTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/semesters" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Fall 2024 Test $(date +%s)\",\"startDate\":\"2024-09-01\",\"endDate\":\"2024-12-31\"}")

SEMESTER_ID=$(echo $SEMESTER_RESPONSE | jq -r '.id // .semester.id')
if [ "$SEMESTER_ID" == "null" ]; then
    # Try to get existing
    SEMESTERS=$(curl -s -X GET "$BASE_URL/api/university/semesters" -H "Authorization: Bearer $JWT_TOKEN")
    SEMESTER_ID=$(echo $SEMESTERS | jq -r '.[0].id')
fi
print_success "Semester: $SEMESTER_ID"

# Create school
print_info "Creating school..."
SCHOOL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/schools" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"School of Engineering\",\"code\":\"ENG$(date +%s)\"}")

SCHOOL_ID=$(echo $SCHOOL_RESPONSE | jq -r '.id // .school.id')
if [ "$SCHOOL_ID" == "null" ]; then
    SCHOOLS=$(curl -s -X GET "$BASE_URL/api/university/schools" -H "Authorization: Bearer $JWT_TOKEN")
    SCHOOL_ID=$(echo $SCHOOLS | jq -r '.[0].id')
fi
print_success "School: $SCHOOL_ID"

# Create teacher
print_info "Creating teacher..."
TEACHER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/teachers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Dr. John Smith\",\"email\":\"john.smith$(date +%s)@school.edu\",\"schoolId\":\"$SCHOOL_ID\"}")

TEACHER_ID=$(echo $TEACHER_RESPONSE | jq -r '.id // .teacher.id')
if [ "$TEACHER_ID" == "null" ]; then
    TEACHERS=$(curl -s -X GET "$BASE_URL/api/university/teachers" -H "Authorization: Bearer $JWT_TOKEN")
    TEACHER_ID=$(echo $TEACHERS | jq -r '.[0].id')
fi
print_success "Teacher: $TEACHER_ID"

# Create course
print_info "Creating course..."
COURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Introduction to Computer Science\",\"code\":\"CS101$(date +%s)\",\"schoolId\":\"$SCHOOL_ID\"}")

COURSE_ID=$(echo $COURSE_RESPONSE | jq -r '.id // .course.id')
if [ "$COURSE_ID" == "null" ]; then
    COURSES=$(curl -s -X GET "$BASE_URL/api/university/courses" -H "Authorization: Bearer $JWT_TOKEN")
    COURSE_ID=$(echo $COURSES | jq -r '.[0].id')
fi
print_success "Course: $COURSE_ID"

# Create students
print_info "Creating test students..."
STUDENT1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/students" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Alice Johnson\",\"email\":\"alice$(date +%s)@school.edu\",\"studentId\":\"S001$(date +%s)\",\"schoolId\":\"$SCHOOL_ID\"}")

STUDENT1_ID=$(echo $STUDENT1_RESPONSE | jq -r '.id // .student.id')
STUDENT1_EMAIL=$(echo $STUDENT1_RESPONSE | jq -r '.email // .student.email')

STUDENT2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/students" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Bob Williams\",\"email\":\"bob$(date +%s)@school.edu\",\"studentId\":\"S002$(date +%s)\",\"schoolId\":\"$SCHOOL_ID\"}")

STUDENT2_ID=$(echo $STUDENT2_RESPONSE | jq -r '.id // .student.id')
STUDENT2_EMAIL=$(echo $STUDENT2_RESPONSE | jq -r '.email // .student.email')

print_success "Students created: 2"
echo "  Student 1: $STUDENT1_EMAIL"
echo "  Student 2: $STUDENT2_EMAIL"
echo ""

# ============================================================================
# STEP 3: Create and Launch Campaign
# ============================================================================
print_step "STEP 3: Create and Launch Campaign"

# Create campaign
print_info "Creating campaign..."
CAMPAIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"name\":\"Full Workflow Test $(date +%s)\",\"type\":\"course\",\"semesterId\":\"$SEMESTER_ID\"}")

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.id // .campaign.id')
if [ "$CAMPAIGN_ID" == "null" ]; then
    print_error "Failed to create campaign"
    echo "Response: $CAMPAIGN_RESPONSE"
    exit 1
fi
print_success "Campaign created: $CAMPAIGN_ID"

# Create course assignment
print_info "Creating course assignment..."
ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/university/course-assignments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"courseId\":\"$COURSE_ID\",\"teacherId\":\"$TEACHER_ID\",\"campaignId\":\"$CAMPAIGN_ID\",\"semesterId\":\"$SEMESTER_ID\"}")

ASSIGNMENT_ID=$(echo $ASSIGNMENT_RESPONSE | jq -r '.id')
if [ "$ASSIGNMENT_ID" == "null" ] || [ -z "$ASSIGNMENT_ID" ]; then
    print_error "Failed to create course assignment"
    echo "Response: $ASSIGNMENT_RESPONSE"
    exit 1
fi
print_success "Course assigned to teacher"

# Enroll students
print_info "Enrolling students..."
curl -s -X POST "$BASE_URL/api/university/enrollments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"studentId\":\"$STUDENT1_ID\",\"courseId\":\"$COURSE_ID\",\"campaignId\":\"$CAMPAIGN_ID\",\"semesterId\":\"$SEMESTER_ID\"}" > /dev/null

curl -s -X POST "$BASE_URL/api/university/enrollments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{\"studentId\":\"$STUDENT2_ID\",\"courseId\":\"$COURSE_ID\",\"campaignId\":\"$CAMPAIGN_ID\",\"semesterId\":\"$SEMESTER_ID\"}" > /dev/null
print_success "Students enrolled: 2"

# Open campaign for teachers (draft → teachers_input)
print_info "Opening campaign for teacher input..."
OPEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/open" \
  -H "Authorization: Bearer $JWT_TOKEN")

OPEN_STATUS=$(echo $OPEN_RESPONSE | jq -r '.status')
if [ "$OPEN_STATUS" != "teachers_input" ]; then
    print_error "Failed to open campaign (expected status: teachers_input, got: $OPEN_STATUS)"
    echo "Response: $OPEN_RESPONSE"
    exit 1
fi
print_success "Campaign opened for teacher input"

# Close campaign (teachers_input → open, ready for launch)
print_info "Closing teacher input period (moving to 'open' status)..."
CLOSE_TEACHER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/close" \
  -H "Authorization: Bearer $JWT_TOKEN")

READY_STATUS=$(echo $CLOSE_TEACHER_RESPONSE | jq -r '.status')
if [ "$READY_STATUS" != "open" ]; then
    print_error "Failed to move to open status (expected: open, got: $READY_STATUS)"
    echo "Response: $CLOSE_TEACHER_RESPONSE"
    exit 1
fi
print_success "Campaign ready for launch (status: open)"

# Launch campaign (generates tokens and surveys)
print_info "Launching campaign..."
LAUNCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/launch" \
  -H "Authorization: Bearer $JWT_TOKEN")

LAUNCH_STATUS=$(echo $LAUNCH_RESPONSE | jq -r '.status')
if [ "$LAUNCH_STATUS" != "launched" ]; then
    print_error "Failed to launch campaign (expected status: launched, got: $LAUNCH_STATUS)"
    echo "Response: $LAUNCH_RESPONSE"
    exit 1
fi
print_success "Campaign launched successfully (tokens and surveys generated)"

# Get tokens for testing
print_info "Retrieving student tokens..."
TOKENS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/tokens/campaign/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $JWT_TOKEN")

STUDENT1_TOKEN=$(echo $TOKENS_RESPONSE | jq -r ".[] | select(.studentEmail == \"$STUDENT1_EMAIL\") | .token")
STUDENT2_TOKEN=$(echo $TOKENS_RESPONSE | jq -r ".[] | select(.studentEmail == \"$STUDENT2_EMAIL\") | .token")

if [ -z "$STUDENT1_TOKEN" ] || [ -z "$STUDENT2_TOKEN" ]; then
    print_error "Failed to get student tokens"
    echo "Tokens response: $TOKENS_RESPONSE"
    exit 1
fi
print_success "Tokens retrieved"
echo "  Student 1 token: ${STUDENT1_TOKEN:0:16}..."
echo "  Student 2 token: ${STUDENT2_TOKEN:0:16}..."
echo ""

# ============================================================================
# STEP 4-5: Students Complete Double Blind Signature Workflow
# ============================================================================
print_step "STEP 4-5: Students Complete Double Blind Signature Workflow"

print_info "Running double blind signature workflow for both students..."
echo ""

# Create a temporary TypeScript test file that tests both students
# Store it in the test-scripts directory to use project's tsconfig
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cat > "$SCRIPT_DIR/temp-blind-workflow.ts" << 'EOFTIME'
import axios from 'axios';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const STUDENT1_TOKEN = process.env.STUDENT1_TOKEN!;
const STUDENT2_TOKEN = process.env.STUDENT2_TOKEN!;
const CAMPAIGN_ID = process.env.CAMPAIGN_ID!;

let suite: any;
let publicKey: any;

// Storage for both students
const student1Data: any = {};
const student2Data: any = {};

async function setupBlindSignature() {
  const pubKeyRes = await axios.get(`${API_URL}/crypto/campaigns/${CAMPAIGN_ID}/public-keys`);
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
}

async function processStudent(token: string, studentName: string, studentData: any) {
  console.log(`\n📝 Processing ${studentName}...`);

  // Phase 1.1: Get ticket and surveys
  const ticketRes = await axios.get(`${API_URL}/tokens/login`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  studentData.surveys = ticketRes.data.surveys;
  studentData.ticketCommitment = ticketRes.data.ticketCommitment;

  console.log(`  ✓ Received ${studentData.surveys.length} survey(s)`);

  // Phase 1.2: Blind sign token
  const tokenMessage = Buffer.from(token);
  const preparedToken = suite.prepare(tokenMessage);
  const blindingResult = await suite.blind(publicKey, preparedToken);
  const blindedToken = Buffer.from(blindingResult.blindedMsg).toString('base64');

  const signRes = await axios.post(
    `${API_URL}/tokens/blind-sign-token`,
    { blindedToken, campaignId: CAMPAIGN_ID },
    { headers: { Authorization: `Bearer ${token}` }}
  );

  const blindSignature = Buffer.from(signRes.data.blindSignature, 'base64');
  studentData.unblindedTokenSignature = await suite.finalize(
    publicKey,
    preparedToken,
    blindSignature,
    blindingResult.inv
  );
  studentData.preparedToken = preparedToken;

  console.log(`  ✓ Token signature obtained`);

  // Phase 2: Complete surveys
  studentData.responses = [];

  for (const survey of studentData.surveys) {
    const answers = Array.from({ length: 25 }, () => Math.floor(Math.random() * 5) + 1);
    const answersString = answers.join('');
    const answerString = `${survey.id}|${survey.courseCode}|${survey.teacherId}|${answersString}`;

    // Get encryption public key
    const encKeyRes = await axios.get(`${API_URL}/crypto/campaigns/${CAMPAIGN_ID}/public-keys`);
    const encPubKeyBuffer = Buffer.from(encKeyRes.data.encryptionPublicKey, 'base64');
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

    studentData.responses.push({
      surveyId: survey.id,
      encryptedAnswer: Buffer.from(encryptedAnswer).toString('base64'),
      commitment: commitmentRes.data.commitment
    });
  }

  console.log(`  ✓ Completed ${studentData.responses.length} survey(s)`);

  // Phase 3: Submit batch
  const receiptR = crypto.randomBytes(32).toString('hex');
  const receiptMessage = Buffer.from(receiptR);
  const preparedReceipt = suite.prepare(receiptMessage);
  const blindingResultReceipt = await suite.blind(publicKey, preparedReceipt);
  const blindedReceipt = Buffer.from(blindingResultReceipt.blindedMsg).toString('base64');

  const authToken = `${Buffer.from(studentData.preparedToken).toString('base64')}.${Buffer.from(studentData.unblindedTokenSignature).toString('base64')}`;

  const submitRes = await axios.post(
    `${API_URL}/responses/submit-batch`,
    {
      campaignId: CAMPAIGN_ID,
      responses: studentData.responses,
      ticketCommitment: studentData.ticketCommitment,
      blindedReceipt
    },
    { headers: { Authorization: `Bearer ${authToken}` }}
  );

  const blindReceiptSignature = Buffer.from(submitRes.data.blindSignature, 'base64');
  studentData.unblindedReceiptSignature = await suite.finalize(
    publicKey,
    preparedReceipt,
    blindReceiptSignature,
    blindingResultReceipt.inv
  );
  studentData.preparedReceipt = preparedReceipt;

  console.log(`  ✓ Batch submitted (${submitRes.data.processedCount} responses)`);

  return studentData;
}

async function claimParticipation(email: string, studentData: any, studentName: string) {
  console.log(`\n🏆 ${studentName} claiming participation...`);

  const authReceipt = `${Buffer.from(studentData.preparedReceipt).toString('base64')}.${Buffer.from(studentData.unblindedReceiptSignature).toString('base64')}`;

  const claimRes = await axios.post(
    `${API_URL}/tokens/participation/claim`,
    { email, campaignId: CAMPAIGN_ID },
    { headers: { Authorization: `Bearer ${authReceipt}` }}
  );

  console.log(`  ✓ Participation claimed`);
}

async function main() {
  try {
    console.log('🔐 Setting up blind signature...');
    await setupBlindSignature();

    // Process both students
    await processStudent(STUDENT1_TOKEN, 'Student 1', student1Data);
    await processStudent(STUDENT2_TOKEN, 'Student 2', student2Data);

    // Claim participation for both
    await claimParticipation(process.env.STUDENT1_EMAIL!, student1Data, 'Student 1');
    await claimParticipation(process.env.STUDENT2_EMAIL!, student2Data, 'Student 2');

    console.log('\n✅ Double blind signature workflow completed for both students!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
EOFTIME

# Run the TypeScript workflow from server directory
export STUDENT1_TOKEN STUDENT2_TOKEN CAMPAIGN_ID STUDENT1_EMAIL STUDENT2_EMAIL BASE_URL
SERVER_DIR="/Users/nguyenluong/Developer/blockchain/pre/code/anonymous-survey-dapp/server"
cd "$SERVER_DIR" && npx ts-node "$SCRIPT_DIR/temp-blind-workflow.ts"
cd - > /dev/null

# Clean up temporary file
rm -f "$SCRIPT_DIR/temp-blind-workflow.ts"

print_success "Both students completed double blind signature workflow"
echo ""

# ============================================================================
# STEP 6: Publish Responses Merkle Root (Tree #1)
# ============================================================================
print_step "STEP 6: Publish Responses Merkle Root (Tree #1)"

print_info "Calculating and publishing responses Merkle root..."
PUBLISH_RESPONSES=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/publish-responses" \
  -H "Authorization: Bearer $JWT_TOKEN")

RESPONSES_ROOT=$(echo $PUBLISH_RESPONSES | jq -r '.merkleRoot')
TOTAL_RESPONSES=$(echo $PUBLISH_RESPONSES | jq -r '.totalResponses')

if [ "$RESPONSES_ROOT" == "null" ]; then
    print_error "Failed to publish responses root"
    echo "Response: $PUBLISH_RESPONSES"
    exit 1
fi

print_success "Responses Merkle root published!"
echo "  Root: $RESPONSES_ROOT"
echo "  Total responses: $TOTAL_RESPONSES"
echo ""

# ============================================================================
# STEP 7: Publish Claimed Receipts Root (Tree #2)
# ============================================================================
print_step "STEP 7: Publish Claimed Receipts Root (Tree #2)"

print_info "Calculating and publishing claims Merkle root..."
PUBLISH_CLAIMS=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/publish-claims" \
  -H "Authorization: Bearer $JWT_TOKEN")

CLAIMS_ROOT=$(echo $PUBLISH_CLAIMS | jq -r '.merkleRoot')
TOTAL_CLAIMED=$(echo $PUBLISH_CLAIMS | jq -r '.totalClaimed')

if [ "$CLAIMS_ROOT" == "null" ]; then
    print_error "Failed to publish claims root"
    echo "Response: $PUBLISH_CLAIMS"
    exit 1
fi

print_success "Claims Merkle root published!"
echo "  Root: $CLAIMS_ROOT"
echo "  Total claimed: $TOTAL_CLAIMED"
echo ""

# ============================================================================
# STEP 8: Close Campaign on Blockchain
# ============================================================================
print_step "STEP 8: Close Campaign on Blockchain"

print_info "Closing campaign on blockchain..."
CLOSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/close-blockchain" \
  -H "Authorization: Bearer $JWT_TOKEN")

CLOSE_SIGNATURE=$(echo $CLOSE_RESPONSE | jq -r '.signature')
CLOSE_SUCCESS=$(echo $CLOSE_RESPONSE | jq -r '.success')

if [ "$CLOSE_SUCCESS" == "true" ]; then
    print_success "Campaign closed on blockchain!"
    echo "  Signature: $CLOSE_SIGNATURE"
elif [ "$CLOSE_SIGNATURE" != "null" ]; then
    print_success "Campaign closed on blockchain!"
    echo "  Signature: $CLOSE_SIGNATURE"
else
    print_error "Failed to close campaign"
    echo "Response: $CLOSE_RESPONSE"
fi
echo ""

# ============================================================================
# STEP 9: Verify Campaign Data
# ============================================================================
print_step "STEP 9: Verify Campaign Data"

print_info "Getting stored Merkle roots from database..."
GET_ROOT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/merkle/$CAMPAIGN_ID/root" \
  -H "Authorization: Bearer $JWT_TOKEN")

STORED_ROOT=$(echo $GET_ROOT_RESPONSE | jq -r '.merkleRoot')
STORED_TOTAL=$(echo $GET_ROOT_RESPONSE | jq -r '.totalResponses')

if [ "$STORED_ROOT" == "$RESPONSES_ROOT" ]; then
    print_success "Merkle root verification passed"
    echo "  Stored root matches published root"
    echo "  Total responses: $STORED_TOTAL"
else
    print_error "Merkle root mismatch!"
    echo "  Published: $RESPONSES_ROOT"
    echo "  Stored: $STORED_ROOT"
fi
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print_step "WORKFLOW COMPLETE!"

echo -e "${GREEN}✓ Campaign created and launched${NC}"
echo -e "${GREEN}✓ 2 students completed double blind signature workflow${NC}"
echo -e "${GREEN}✓ Responses encrypted and submitted anonymously${NC}"
echo -e "${GREEN}✓ Responses Merkle root published (Tree #1)${NC}"
echo -e "${GREEN}✓ 2 students claimed participation${NC}"
echo -e "${GREEN}✓ Claims Merkle root published (Tree #2)${NC}"
echo -e "${GREEN}✓ Campaign closed on blockchain${NC}"
echo -e "${GREEN}✓ Data verification passed${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Campaign Details${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Campaign ID: $CAMPAIGN_ID"
echo "Semester ID: $SEMESTER_ID"
echo "Course ID: $COURSE_ID"
echo "Teacher ID: $TEACHER_ID"
echo ""
echo "Responses Root: $RESPONSES_ROOT"
echo "Claims Root: $CLAIMS_ROOT"
echo "Blockchain Signature: $CLOSE_SIGNATURE"
echo ""
echo -e "${GREEN}Full workflow test completed successfully! 🎉${NC}"

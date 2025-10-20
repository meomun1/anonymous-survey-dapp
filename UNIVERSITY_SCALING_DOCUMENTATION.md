# University Scaling Project Documentation

## 📋 Project Overview

**Goal**: Scale anonymous survey system from single surveys to university-wide usage supporting 1000-2000 students, 4000-8000 course surveys per semester.

**Current System**: Single survey with 25-question template, blind signatures, encryption, and blockchain storage.

## 🏫 University Structure

```
University
├── Schools (e.g., "School of Computer Science and Engineering")
│   ├── Teachers (100-200 total)
│   ├── Courses (150-200 per program)
│   └── Students (1000-2000 per semester)
└── Programs (e.g., Bachelor of Engineering in IT)
```

## 📊 System Scale Requirements

- **Students**: 1000-2000 per semester
- **Teachers**: 100-200 total
- **Courses**: 4000-8000 enrollments per semester
- **Survey Responses**: 100,000-200,000 answers (25 × 4000-8000 surveys)
- **Schools**: Multiple departments/schools within university

## 🔍 Current System Analysis

### Single Survey Flow
1. Student answers 25 questions → `"123451...123"` (string format)
2. Server blind signs the string for verification
3. String is encrypted and sent to blockchain
4. **No token in response** - responses are completely anonymous
5. Responses only accessible after fetching and decrypting from blockchain

### Key Principles
- **Tokens**: NOT anonymous, linked to student emails (DoS prevention)
- **Responses**: Completely anonymous (no identity linkage)
- **Privacy Method**: Blind signatures + encryption
- **Verification**: Public verification via Merkle proofs

### Revised Cryptographic System
- **Key Storage**: `survey_campaigns` table stores encryption/decryption keys
- **Survey Creation**: Keys generated when admin creates survey campaign
- **Key Access**: Server uses stored keys for encryption/decryption operations
- **Database Tables**:
  - `survey_campaigns`: Contains ALL cryptographic keys (public and private)
  - `surveys`: Lightweight units that inherit crypto settings from campaigns
  - **No more `survey_private_keys`** - keys moved to campaigns

## 📝 Survey Types

- **Course Surveys**: High frequency, identical 25-question template (`teaching_quality_25q`)
- **Event Surveys**: Low frequency, custom templates
- **Template**: 25 questions with 1-5 rating scale

## 🗄️ Revised Database Schema

> **⚠️ IMPORTANT CORRECTION**: The `survey_responses` table does **NOT** contain `survey_id`. Only `campaign_id` is stored at the campaign level. The `survey_id` is extracted from the `answer_string` during the decryption process.

### Key Changes from Original Schema

#### 1. **Survey Campaigns as Main Entity**
- **`survey_campaigns`** now holds ALL cryptographic settings
- **Individual `surveys`** are lightweight units that inherit from campaign
- **No more `survey_private_keys`** table - keys moved to campaigns

#### 2. **Explicit Survey Type Distinction**
```sql
-- survey_campaigns table
"type" TEXT NOT NULL CHECK ("type" IN ('course', 'event'))

-- surveys table
"course_id" TEXT, -- NULL for event surveys
"teacher_id" TEXT, -- NULL for event surveys
```

#### 3. **Enhanced Student Completion Tracking**
- **`survey_completions`** table tracks individual survey completion
- **Campaign-level completion**: Students not completed in campaign
- **Individual participation rate**: "Student A: 4 out of 8 completed"
- **Enrollment-level tracking**: Specific courses not completed

#### 4. **Corrected Response Flow**
```
Student submits → Encrypted response goes to blockchain → NOT server
Admin wants stats → Server fetches from blockchain → Stores encrypted_data (campaign_id only) → Decrypts → Extracts survey_id from answer_string → Stores answer_string
```

#### 5. **Corrected Response Storage Structure**
```sql
-- 1. survey_responses (encrypted from blockchain)
"campaign_id" TEXT NOT NULL, -- Only campaign-level info (NO survey_id)
"encrypted_data" TEXT NOT NULL, -- From blockchain
"commitment" TEXT NOT NULL UNIQUE,

-- 2. decrypted_responses (after decryption)
"answer_string" TEXT NOT NULL, -- "surveyId|courseCode|teacherId|123451...123"
"survey_id" TEXT NOT NULL, -- Extracted from answer_string

-- 3. parsed_responses (for analytics)
"survey_id" TEXT NOT NULL, -- From decrypted_responses
"course_code" TEXT NOT NULL,
"teacher_id" TEXT NOT NULL,
"answers" INTEGER[] NOT NULL, -- [1,2,3,4,5,1...]
```

## 🔄 User Workflows

### Student Workflow
1. **Receive Token**: Get token via SMTP email
2. **Enter Dashboard**: Use token to access student dashboard
3. **View Surveys**: See available course surveys for their enrolled courses
4. **Complete Surveys**: Answer surveys one by one, answers stored locally
5. **Switch Between**: Can switch between surveys before final submission
6. **Batch Submit**: Submit all completed surveys to blockchain at once
7. **Token Completion**: Token marked as completed after successful submission

### Teacher Workflow
1. **Campaign Opened**: Admin opens semester survey campaign
2. **Input Courses**: Teacher inputs their assigned courses first
3. **Course Windows**: UI shows course windows (e.g., 8 courses)
4. **Select Course**: Choose one course to input student information
5. **Input Students**: Fill in student information for selected course
6. **Submit Course**: Submit each course individually (not all at once)
7. **Repeat**: Continue for all assigned courses

### Admin Workflow (5 Main Processes)

#### 1. Data Input (Separated Process)
- **Schools**: Input school information first
- **Teachers & Courses**: Input teachers and courses per school
- **Students**: Input student information and enrollments
- Bulk import via CSV or manual entry

#### 2. Survey Campaign Creation
- Create "Semester Quality Survey Check" campaign
- **Campaign Status**: "opened" allows teachers to input courses, "closed" prevents input
- **Open/Close Control**: Admin opens campaign for teacher input, then closes when ready

#### 3. Survey Campaign Launch
- System auto-generates surveys from teacher inputs
- Generate tokens for all enrolled students
- Send tokens via SMTP to students

#### 4. Survey Campaign Closure
- Close surveys to prevent new submissions
- No submissions accepted after closure

#### 5. Response Decryption
- Admin clicks to start decryption process
- System fetches encrypted responses from blockchain
- Decrypts all responses for analytics

## 📊 Admin Analytics Dashboard

After decryption, admin needs three main views:

1. **Overall Survey Information**
   - Total surveys conducted
   - Overall participation rates
   - University-wide statistics

2. **Teacher Performance Analysis**
   - Overall performance of each teacher
   - Drill down to specific courses
   - Course-specific teacher performance

3. **Student Completion Tracking**
   - List of students who haven't completed all surveys
   - Participation tracking per student
   - Completion rates by course/school

## 🗄️ Data Model Design

### Core Tables
```typescript
interface School {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  email: string;
  name: string;
  studentId: string;
  schoolId: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  schoolId: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  schoolId: string;
}

interface SurveyCampaign {
  id: string;
  name: string;
  semester: string;
  type: 'course' | 'event';
  status: 'draft' | 'teachers_input' | 'open' | 'closed';
  createdBy: string;
  openedAt?: Date;
  closedAt?: Date;
}

interface Survey {
  id: string;
  campaignId: string;
  courseId: string;
  teacherId: string;
  semester: string;
  templateId: string;
  status: 'draft' | 'active' | 'closed' | 'published';
  totalResponses: number;
  createdAt: Date;
  openedAt?: Date;
  closedAt?: Date;
}

interface SurveyToken {
  token: string;
  campaignId: string;
  studentEmail: string;
  used: boolean;
  usedAt?: Date;
  completed: boolean;
  completedAt?: Date;
}
```

### Response Storage Strategy

#### Enhanced Answer String Format
```typescript
// Current: "123451...123" (25 digits)
// New: "surveyId|courseCode|teacherId|123451...123" (survey + course + teacher + 25 digits)

interface SurveyResponse {
  id: string;
  campaignId: string;
  // NO token field - completely anonymous
  answerString: string;            // "surveyId|CS101|TEACHER001|123451...123"
  encryptedData: string;           // Encrypted for blockchain
  commitment: string;              // Hash for verification
  submittedAt: Date;
  blockchainTxId?: string;         // Transaction reference
}

// Parsed for Analytics
interface ParsedResponse {
  surveyId: string;
  courseCode: string;              // Extracted from answerString (e.g., "CS101")
  teacherId: string;               // Extracted from answerString (e.g., "TEACHER001")
  answers: number[];               // [1,2,3,4,5,1...] (25 numbers)
  submittedAt: Date;
}
```

## 🔧 Technical Implementation

### Smart Contract Requirements & Modifications

#### Current Contract Analysis (`lib.rs`)
- **Single Response**: `submit_response()` handles one response at a time
- **Storage**: `encrypted_answers: Vec<[u8; 256]>` and `commitments: Vec<[u8; 32]>`
- **Publishing**: Clears encrypted answers after publishing (space optimization)
- **Limit**: `MAX_RESPONSES: usize = 10` (needs increase for university scale)

#### Required Modifications
1. **Batch Submission Function**
   ```rust
   pub fn submit_batch_responses(
       ctx: Context<SubmitBatchResponse>,
       commitments: Vec<[u8; 32]>,
       encrypted_answers: Vec<[u8; 256]>
   ) -> Result<()>
   ```

2. **Response Retrieval Function**
   ```rust
   pub fn get_encrypted_responses(
       ctx: Context<GetResponses>
   ) -> Result<Vec<[u8; 256]>>
   ```

3. **Increase Response Limits**
   - Change `MAX_RESPONSES` from 10 to 1000+ for university scale
   - Adjust account size calculations accordingly

4. **Enhanced Response Storage**
   - Store responses with course code/teacher ID metadata
   - Maintain encrypted answers longer for decryption process
   - Add response indexing for efficient retrieval

### Transaction Cost Optimization
- **Batch Submission**: Students submit all surveys in single transaction
- **Local Storage**: Store answers locally until final submission
- **Reduced Costs**: One transaction per student per semester instead of per survey

## 🚀 Implementation Phases

### Phase 1: Database Schema Enhancement
- Add university structure tables
- Create survey campaign management
- Design response storage for 100K+ answers
- Add analytics tables

### Phase 2: Survey Campaign System
- Admin campaign creation interface
- Teacher course/student assignment interface
- Auto-survey generation
- Token generation and distribution

### Phase 3: Multi-Survey Student Experience
- Student dashboard with multiple surveys
- Local answer storage and switching
- Batch submission interface
- Progress tracking

### Phase 4: Smart Contract & Batch Submission
- Modify smart contract for batch submissions
- Implement offline survey completion
- Batch blockchain submission system

### Phase 5: Analytics & Performance Tracking
- Response decryption process
- Analytics generation system
- Admin dashboard with three main views
- Teacher performance tracking

## 🔧 Technical Implementation Details

### Decryption Process Flow
1. **Admin clicks decryption** → System fetches encrypted responses from blockchain
2. **Decrypt responses** → Using keys from `survey_campaigns` table
3. **Parse answer strings** → Extract survey/course/teacher from `"surveyId|courseCode|teacherId|123451...123"`
4. **Generate analytics** → Parse answers to `[1,2,3,4,5,1...]` for statistics
5. **Store in analytics tables** → For admin dashboard views

### Batch Decryption Performance
- **4000-8000 responses**: Manageable for backend
- **Process**: Fetch from blockchain → Decrypt → Parse → Save to database
- **Optimization**: Batch processing with progress indicators

### Analytics Generation Strategy
Based on admin's 3 main dashboard views:

1. **Overall Survey Information**
   - Aggregate all survey statistics
   - University-wide participation rates
   - Total responses across all surveys

2. **Teacher Performance Analysis**
   - Group by `teacherId` from parsed responses
   - Calculate average scores per teacher
   - Course-specific performance drill-down

3. **Student Completion Tracking**
   - Track token completion status
   - Identify students with incomplete surveys
   - Generate completion reports by course/school

## 📅 Timeline Considerations

- **Course Surveys**: End of semester
- **Event Surveys**: Random based on school events
- **Admin Control**: Manual survey opening/closing
- **Token Distribution**: When admin opens surveys

## 🔧 Implementation Details & Error Handling

### Data Input Process
- **Separated Input**: Schools → Teachers & Courses → Students
- **Admin-Defined Formats**: Teacher IDs and course codes defined by admin
- **Lighter Process**: Reduced complexity through separation

### Campaign Lifecycle Management
- **Open/Close Control**: Admin opens campaign for teacher input, closes when ready
- **Proceed Regardless**: Continue even with incomplete teacher inputs
- **Incomplete Tracking**: Monitor and report teachers who didn't complete input

### Batch Submission & Error Handling
- **Batch Size**: Depends on number of enrolled courses per student
- **Partial Failure**: If batch submission fails partially, student must redo entire batch
- **Retry Mechanism**: No partial retry - complete batch resubmission required

### Analytics & Storage Strategy
- **Permanent Storage**: Analytics data stored permanently in database
- **Recalculation**: Good data model enables easy recalculation when needed
- **No Compliance Concerns**: Data retention policies not a current priority

### Decryption & Blockchain Handling
- **Decryption Failure**: Retry decryption process for failed responses
- **Response Storage**: Store encrypted responses after fetching for retry capability
- **Blockchain Safety**: To be determined after smart contract modifications
- **Corrupted Data**: Handling strategy to be defined after testing blockchain interactions

### Performance Considerations (Future)
- **Indexing**: Database indexing for large-scale queries
- **Caching**: Caching strategy for analytics dashboards
- **Response Times**: Performance testing after system implementation

---

## 🎯 Implementation Priority

**Phase 1: Database Schema Enhancement** (START HERE)
- Define university structure tables
- Create survey campaign management
- Design response storage for 100K+ answers
- Add analytics tables

**Phase 2: Smart Contract Modifications** (AFTER DATABASE)
- Batch submission functions
- Response retrieval functions
- Increase response limits
- Enhanced response storage

**Phase 3: Backend & Frontend Development**
- Survey campaign system
- Multi-survey student experience
- Analytics generation
- Admin dashboard

---

**Last Updated**: January 2025
**Status**: Planning Phase
**Next Steps**: Begin Phase 1 - Database Schema Enhancement
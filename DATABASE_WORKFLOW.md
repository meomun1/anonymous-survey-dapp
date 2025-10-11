# Database Workflow - University Survey System

## 📋 Overview

This document explains how database tables are updated throughout the university survey workflow using the **revised schema** with campaign-based cryptographic inheritance and enhanced completion tracking.

> **⚠️ IMPORTANT CORRECTION**: The `survey_responses` table does **NOT** contain `survey_id`. Only `campaign_id` is stored at the campaign level. The `survey_id` is extracted from the `answer_string` during the decryption process.

## 🔄 Complete Workflow with Table Updates

### Phase 1: University Data Input (Admin Only)

#### 1.1 School Setup
**Tables Updated:**
- `schools` - **INSERT** new schools

**Updated By:** Admin

#### 1.2 Teacher and Course Input
**Tables Updated:**
- `teacher_logins` - **INSERT** teacher login credentials
- `teachers` - **INSERT** teachers per school
- `courses` - **INSERT** courses per school

**Updated By:** Admin

#### 1.3 Student Input
**Tables Updated:**
- `students` - **INSERT** students (NO enrollments yet)

**Updated By:** Admin

### Phase 2: Survey Campaign Creation (Admin)

#### 2.1 Create Semester and Campaign
**Tables Updated:**
- `semesters` - **INSERT** new semester
- `survey_campaigns` - **INSERT** survey campaign with cryptographic keys

**Updated By:** Admin

#### 2.2 Admin Opens Campaign for Teacher Input
**Tables Updated:**
- `survey_campaigns` - **UPDATE** status to 'teachers_input'

**Updated By:** Admin

### Phase 3: Teacher Input Phase (Teachers)

#### 3.1 Teacher Chooses Course and Adds Students
**Tables Updated:**
- `course_assignments` - **INSERT** when teacher chooses course
- `enrollments` - **INSERT** when teacher adds students to course
- `course_assignments` - **UPDATE** students_input_completed = true

**Updated By:** Teacher

### Phase 4: Survey Generation and Token Distribution (Admin)

#### 4.1 Admin Closes Campaign and Launches Surveys
**Tables Updated:**
- `survey_campaigns` - **UPDATE** status to 'open' and set closed_at
- `surveys` - **INSERT** lightweight surveys (inherit crypto from campaign)

**Updated By:** Admin

#### 4.2 Generate and Distribute Tokens (Campaign-level)
**Tables Updated:**
- `survey_tokens` - **INSERT** campaign-level tokens for all enrolled students
- `survey_completions` - **INSERT** completion tracking for each survey

**Updated By:** Admin

### Phase 5: Student Participation (Students)

#### 5.1 Student Uses Token
**Tables Updated:**
- `survey_tokens` - **UPDATE** mark token as used

**Updated By:** Student

#### 5.2 Student Submits Batch Survey Responses
**Tables Updated:**
- `survey_completions` - **UPDATE** mark individual surveys as completed
- `survey_tokens` - **UPDATE** mark token as completed

**Updated By:** Student

**Note:** Student submits encrypted responses directly to blockchain, NOT to server database

### Phase 6: Admin Fetches Responses from Blockchain
**Tables Updated:**
- `survey_responses` - **INSERT** encrypted responses fetched from blockchain (campaign_id only, NO survey_id)
- `surveys` - **UPDATE** total_responses count

**Updated By:** Admin

**Note:** `survey_responses` table only stores `campaign_id`, `encrypted_data`, and `commitment`. No `survey_id` is stored here.

### Phase 7: Survey Closure (Admin)

#### 7.1 Admin Closes Surveys
**Tables Updated:**
- `survey_campaigns` - **UPDATE** status to 'closed'

**Updated By:** Admin

### Phase 8: Response Decryption and Analytics (Admin)

#### 8.1 Admin Initiates Decryption
**Tables Updated:**
- `decrypted_responses` - **INSERT** decrypted responses from blockchain data
- `parsed_responses` - **INSERT** parsed responses from decrypted answer_string
- `survey_analytics` - **INSERT** survey-level analytics
- `teacher_performance` - **INSERT** teacher performance metrics
- `student_completion` - **INSERT** student completion tracking

**Updated By:** Admin

## 📊 Table Update Summary by Workflow Phase

### Phase 1: Data Input
**Updated By:** Admin
- **schools**: INSERT
- **teacher_logins**: INSERT
- **teachers**: INSERT
- **courses**: INSERT
- **students**: INSERT

### Phase 2: Campaign Setup
**Updated By:** Admin
- **semesters**: INSERT
- **survey_campaigns**: INSERT + UPDATE (status)

### Phase 3: Teacher Input
**Updated By:** Teacher
- **course_assignments**: INSERT + UPDATE (completion)
- **enrollments**: INSERT

### Phase 4: Survey Launch
**Updated By:** Admin
- **survey_campaigns**: UPDATE (status, closed_at)
- **surveys**: INSERT (lightweight surveys)
- **survey_tokens**: INSERT
- **survey_completions**: INSERT

### Phase 5: Student Participation
**Updated By:** Student
- **survey_tokens**: UPDATE (used, completed)
- **survey_completions**: UPDATE (completed)

### Phase 6: Admin Fetches from Blockchain
**Updated By:** Admin
- **survey_responses**: INSERT (encrypted from blockchain)
- **surveys**: UPDATE (total_responses)

### Phase 7: Survey Closure
**Updated By:** Admin
- **survey_campaigns**: UPDATE (status to 'closed')

### Phase 8: Analytics Generation
**Updated By:** Admin
- **decrypted_responses**: INSERT
- **parsed_responses**: INSERT
- **survey_analytics**: INSERT
- **teacher_performance**: INSERT
- **student_completion**: INSERT

## 🔄 Key Update Patterns

### INSERT Operations
- **Admin**: schools, teacher_logins, teachers, courses, students, semesters, survey_campaigns, surveys, survey_tokens, survey_completions, survey_responses, decrypted_responses, parsed_responses, survey_analytics, teacher_performance, student_completion
- **Teacher**: course_assignments, enrollments

### UPDATE Operations
- **Admin**: survey_campaigns (status changes), surveys (response counts)
- **Teacher**: course_assignments (completion status)
- **Student**: survey_tokens (usage, completion), survey_completions (completion)

### READ Operations (No Updates)
- **Student Dashboard**: Fetch available surveys for token
- **Teacher Interface**: Fetch assigned courses and students
- **Admin Analytics**: Fetch aggregated performance data

## 🎯 Critical Update Sequences

### 1. Campaign Lifecycle (Admin)
`survey_campaigns`: draft → teachers_input → open → closed

### 2. Token Lifecycle (Student)
`survey_tokens`: created → used → completed

### 3. Teacher Input Tracking (Teacher)
`course_assignments`: students_input_completed = false → true

### 4. Response Processing (Admin)
`survey_responses` → `decrypted_responses` → `parsed_responses` → analytics tables

## 🎯 Student Completion Queries

### 1. Students Not Completed in Campaign (Campaign-level):
```sql
-- Using campaign_completion_status view
SELECT * FROM campaign_completion_status 
WHERE campaign_id = 'campaign-id' 
AND token_completed = false;
```

### 2. Student Participation Rate (Individual survey completion):
```sql
-- Using student_participation_rate view
SELECT * FROM student_participation_rate 
WHERE student_email = 'student@university.edu' 
AND campaign_id = 'campaign-id';
-- Shows: Student A completed 4 out of 8 surveys (50%)
```

### 3. Specific Student Enrollments Not Completed:
```sql
-- Using enrollment_completion_status view
SELECT * FROM enrollment_completion_status 
WHERE student_email = 'student@university.edu' 
AND campaign_id = 'campaign-id' 
AND survey_completed = false;
```

This workflow ensures data consistency and provides comprehensive tracking throughout the entire university survey process.

---

**Last Updated**: January 2025  
**Status**: Complete Analysis  
**Next**: Implementation of these workflows in backend services

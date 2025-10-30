# Client Application Design Documentation

## Overview
Anonymous Survey DApp with three user roles: Admin, Teachers, and Students. Built with Next.js, TypeScript, and Tailwind CSS.

## User Workflows & UI Design

### 1. ADMIN WORKFLOW

#### 1.1 Login Page
- **UI**: Simple login form with email/password
- **Operations**: 
  - `POST /api/auth/login`
  - Store JWT token in localStorage
  - Redirect to semester selection

#### 1.2 Semester Selection
- **UI**: List of semesters with campaign overview cards
- **Operations**: 
  - `GET /api/university/semesters`
  - `GET /api/campaigns` (campaigns for selected semester)
- **Features**: Choose semester to manage campaigns

#### 1.3 Campaign Management (Per Semester)
- **UI**: Campaign list with status badges, action buttons
- **Operations**:
  - `POST /api/campaigns` (create campaign)
  - `GET /api/campaigns/{id}` (view campaign details)
  - `PUT /api/campaigns/{id}` (edit campaign)
  - `DELETE /api/campaigns/{id}` (delete campaign)

#### 1.4 Campaign Details Page
- **UI**: Campaign overview with status management and sections
- **Sections**:
  - **Status Management**: Open/Close/Launch buttons based on current state
  - **Process Responses**: Ingest from blockchain, decrypt responses
  - **Analytics**: School-wise breakdown, completion tracking, teacher performance
  - **Publish Results**: Generate Merkle root, make results public
- **Operations**:
  - `POST /api/campaigns/{id}/open` (open for teacher input)
  - `POST /api/campaigns/{id}/close` (close teacher input)
  - `POST /api/campaigns/{id}/launch` (launch for students)
  - `POST /api/responses/ingest/{campaignId}` (process responses)
  - `POST /api/analytics/campaigns/{campaignId}/analytics` (get analytics)
  - `POST /api/analytics/merkle/calculate-root` (publish results)

#### 1.5 University Data Import
- **UI**: File upload interface for CSV imports
- **Operations**:
  - `POST /api/university/students/bulk-import` (import students from CSV)
  - `POST /api/university/enrollments/bulk-import` (import enrollments from CSV)
- **Features**: Bulk import university data, validation, error reporting
- **Note**: Schools, teachers, courses must be created individually via CRUD endpoints

### 2. TEACHER WORKFLOW

#### 2.1 Teacher Login
- **UI**: Login form
- **Operations**: 
  - `POST /api/auth/login` (with teacher credentials)

#### 2.2 Teacher Dashboard
- **UI**: List of opened campaigns (course type only)
- **Operations**:
  - `GET /api/campaigns?status=open&type=course` (get open course campaigns)

#### 2.3 Course Assignment Management
- **UI**: Campaign selection → Course list → Assignment interface
- **Operations**:
  - `GET /api/university/teachers/{id}/assignments` (get teacher assignments)
  - `POST /api/university/course-assignments` (create assignments)
  - `DELETE /api/university/course-assignments/{id}` (remove assignments)

#### 2.4 Student Enrollment Management
- **UI**: Course selection → Student input interface
- **Operations**:
  - `POST /api/university/enrollments` (create enrollments)
  - `DELETE /api/university/enrollments/{id}` (remove enrollments)
- **Features**: Input student IDs/names to create enrollments

### 3. STUDENT WORKFLOW

#### 3.1 Student Access
- **UI**: Token input form
- **Operations**:
  - `GET /api/tokens/validate/{token}` (validate token)
  - `GET /api/surveys/token/{token}` (get surveys for token)

#### 3.2 Survey Taking
- **UI**: List of available surveys with course/teacher names
- **Operations**:
  - `GET /api/surveys/token/{token}` (get available surveys)
  - `POST /api/crypto/campaigns/{campaignId}/blind-sign` (get blind signature)
- **Features**: Show course and teacher names for each survey

#### 3.3 Survey Completion
- **UI**: Multi-step form with progress indicator
- **Operations**:
  - Store responses locally (not submitted yet)
  - `POST /api/responses/submit` (submit all responses to blockchain using school's private key)
  - `POST /api/tokens/{token}/complete` (mark token as completed)
- **Features**: Complete all surveys, then submit all at once
- **Note**: Students submit via server API which uses school's Solana private key

#### 3.4 Completion Confirmation
- **UI**: Success page with completion status
- **Operations**:
  - `GET /api/tokens/validate/{token}` (check completion status)

## Technical Implementation

### Frontend Architecture
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + useReducer
- **HTTP Client**: Axios with interceptors
- **Crypto**: Web Crypto API for client-side encryption

### Key Components
1. **AuthProvider**: JWT token management
2. **SurveyForm**: Dynamic form based on templates
3. **CryptoService**: Client-side encryption/decryption
4. **ApiClient**: Centralized API calls
5. **Layout**: Role-based navigation

### Security Considerations
- JWT tokens in httpOnly cookies (preferred) or localStorage
- Client-side encryption before submission
- Token validation on every request
- Role-based route protection

### Data Flow
1. **Admin**: Creates campaign → Opens → Closes → Launches
2. **Teacher**: Reviews surveys during open phase
3. **Student**: Uses token → Takes surveys → Submits encrypted responses
4. **Admin**: Processes responses → Generates analytics → Publishes results

## File Structure (Next.js App Router)
```
client/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Landing/home page
│   │   ├── globals.css              # Global styles
│   │   ├── admin/                   # Admin routes
│   │   │   ├── layout.tsx           # Admin layout with sidebar
│   │   │   ├── page.tsx             # Semester selection page
│   │   │   ├── semesters/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Campaign list for semester
│   │   │   │       ├── campaigns/
│   │   │   │       │   ├── create/
│   │   │   │       │   │   └── page.tsx # Create campaign
│   │   │   │       │   └── [campaignId]/
│   │   │   │       │       ├── page.tsx # Campaign details
│   │   │   │       │       └── edit/
│   │   │   │       │           └── page.tsx # Edit campaign
│   │   │   │       └── import/
│   │   │   │           └── page.tsx # University data import
│   │   │   └── analytics/
│   │   │       └── [campaignId]/
│   │   │           └── page.tsx     # Campaign analytics
│   │   ├── teacher/                 # Teacher routes
│   │   │   ├── layout.tsx           # Teacher layout
│   │   │   ├── page.tsx             # Teacher dashboard (open campaigns)
│   │   │   ├── campaigns/
│   │   │   │   └── [campaignId]/
│   │   │   │       ├── page.tsx     # Course assignment management
│   │   │   │       └── courses/
│   │   │   │           └── [courseId]/
│   │   │   │               └── page.tsx # Student enrollment management
│   │   ├── student/                 # Student routes
│   │   │   ├── layout.tsx           # Student layout
│   │   │   ├── page.tsx             # Token input page
│   │   │   ├── surveys/
│   │   │   │   ├── page.tsx         # Available surveys list
│   │   │   │   └── [surveyId]/
│   │   │   │       └── page.tsx     # Take survey
│   │   │   └── completion/
│   │   │       └── page.tsx         # Completion confirmation
│   │   └── login/                   # Auth routes
│   │       ├── page.tsx             # General login form
│   │       └── teacher/
│   │           └── page.tsx         # Teacher login
│   ├── components/                  # Reusable components
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── spinner.tsx
│   │   │   └── chart.tsx
│   │   ├── auth/                    # Authentication components
│   │   │   ├── LoginForm.tsx        # Login form component
│   │   │   ├── ProtectedRoute.tsx   # Route protection
│   │   │   ├── RoleGuard.tsx        # Role-based access
│   │   │   └── AuthProvider.tsx     # Auth context provider
│   │   ├── layout/                  # Layout components
│   │   │   ├── Header.tsx           # App header
│   │   │   ├── Sidebar.tsx          # Admin sidebar
│   │   │   ├── Navigation.tsx       # Main navigation
│   │   │   ├── Footer.tsx           # App footer
│   │   │   └── Breadcrumb.tsx       # Breadcrumb navigation
│   │   ├── admin/                   # Admin-specific components
│   │   │   ├── CampaignCard.tsx     # Campaign display card
│   │   │   ├── CampaignForm.tsx     # Create/edit campaign
│   │   │   ├── CampaignList.tsx     # Campaign list table
│   │   │   ├── CampaignStatus.tsx   # Status badge/indicator
│   │   │   ├── UniversityTable.tsx  # Generic university data table
│   │   │   ├── UniversityForm.tsx   # Generic university form
│   │   │   ├── AnalyticsChart.tsx   # Chart component
│   │   │   ├── AnalyticsTable.tsx   # Analytics data table
│   │   │   ├── MerkleProof.tsx      # Merkle proof display
│   │   │   └── ExportButton.tsx     # Data export functionality
│   │   ├── teacher/                 # Teacher-specific components
│   │   │   ├── CourseCard.tsx       # Course display card
│   │   │   ├── CourseList.tsx       # Assigned courses list
│   │   │   ├── SurveyPreview.tsx    # Survey preview component
│   │   │   └── AssignmentTable.tsx  # Course assignments table
│   │   ├── student/                 # Student-specific components
│   │   │   ├── TokenInput.tsx       # Token input form
│   │   │   ├── SurveyForm.tsx       # Survey taking form
│   │   │   ├── SurveyProgress.tsx   # Progress indicator
│   │   │   ├── SurveyCard.tsx       # Survey display card
│   │   │   ├── CompletionStatus.tsx # Completion confirmation
│   │   │   └── CryptoStatus.tsx     # Encryption status indicator
│   │   ├── survey/                  # Survey-related components
│   │   │   ├── QuestionRenderer.tsx # Dynamic question rendering
│   │   │   ├── AnswerInput.tsx      # Answer input component
│   │   │   ├── SurveyTemplate.tsx   # Survey template display
│   │   │   └── ResponseValidator.tsx # Response validation
│   │   └── shared/                  # Shared/common components
│   │       ├── LoadingSpinner.tsx   # Loading indicator
│   │       ├── ErrorBoundary.tsx    # Error handling
│   │       ├── ConfirmDialog.tsx    # Confirmation dialog
│   │       ├── DataTable.tsx        # Generic data table
│   │       ├── SearchInput.tsx      # Search functionality
│   │       ├── Pagination.tsx       # Pagination component
│   │       ├── StatusBadge.tsx      # Status indicator
│   │       ├── DatePicker.tsx       # Date selection
│   │       ├── FileUpload.tsx       # File upload component
│   │       └── CopyToClipboard.tsx  # Copy functionality
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts               # Authentication hook
│   │   ├── useApi.ts                # API call hook
│   │   ├── useCampaigns.ts          # Campaign data hook
│   │   ├── useSurveys.ts            # Survey data hook
│   │   ├── useUniversity.ts         # University data hook
│   │   ├── useCrypto.ts             # Crypto operations hook
│   │   ├── useLocalStorage.ts       # Local storage hook
│   │   ├── useDebounce.ts           # Debounce hook
│   │   └── usePagination.ts         # Pagination hook
│   ├── lib/                         # Utility libraries
│   │   ├── api/                     # API client
│   │   │   ├── client.ts            # Axios configuration
│   │   │   ├── auth.ts              # Auth API calls
│   │   │   ├── campaigns.ts         # Campaign API calls
│   │   │   ├── surveys.ts           # Survey API calls
│   │   │   ├── university.ts        # University API calls
│   │   │   ├── crypto.ts            # Crypto API calls
│   │   │   └── analytics.ts         # Analytics API calls
│   │   ├── crypto/                  # Client-side crypto
│   │   │   ├── encryption.ts        # RSA encryption
│   │   │   ├── blind-signature.ts   # Blind signature
│   │   │   ├── commitment.ts        # Commitment generation
│   │   │   └── merkle.ts            # Merkle tree operations
│   │   ├── auth/                    # Authentication utilities
│   │   │   ├── jwt.ts               # JWT handling
│   │   │   ├── storage.ts           # Token storage
│   │   │   └── validation.ts        # Input validation
│   │   ├── utils/                   # General utilities
│   │   │   ├── formatters.ts        # Data formatting
│   │   │   ├── validators.ts        # Form validation
│   │   │   ├── constants.ts         # App constants
│   │   │   └── helpers.ts           # Helper functions
│   │   └── types/                   # TypeScript types
│   │       ├── api.ts               # API response types
│   │       ├── auth.ts              # Auth types
│   │       ├── campaign.ts          # Campaign types
│   │       ├── survey.ts            # Survey types
│   │       ├── university.ts        # University types
│   │       └── crypto.ts            # Crypto types
│   └── contexts/                    # React contexts
│       ├── AppContext.tsx           # Main app context
│       ├── AuthContext.tsx          # Authentication context
│       └── ThemeContext.tsx         # Theme context
```

## Detailed Page Descriptions

### Root Pages
- **`app/layout.tsx`**: Root layout with AuthProvider, ThemeProvider, global navigation
- **`app/page.tsx`**: Landing page with role selection (Admin/Teacher/Student login links)

### Admin Pages

#### **`app/admin/layout.tsx`**
- Admin-specific layout with sidebar navigation
- Role-based access control
- Header with user info and logout

#### **`app/admin/page.tsx`** - Semester Selection
- **Components**: `SemesterCard`, `CampaignOverview`
- **Features**: List semesters with campaign counts, select semester
- **API Calls**: `GET /api/university/semesters`, `GET /api/campaigns`

#### **`app/admin/semesters/[id]/page.tsx`** - Campaign List for Semester
- **Components**: `CampaignList`, `CampaignCard`, `CampaignStatus`
- **Features**: Campaign CRUD operations, status management
- **API Calls**: `GET /api/campaigns`, `POST /api/campaigns`, `DELETE /api/campaigns/{id}`

#### **`app/admin/semesters/[id]/campaigns/create/page.tsx`** - Create Campaign
- **Components**: `CampaignForm`, `SemesterSelector`
- **Features**: Form validation, campaign type selection
- **API Calls**: `POST /api/campaigns`, `GET /api/university/semesters`

#### **`app/admin/semesters/[id]/campaigns/[campaignId]/page.tsx`** - Campaign Details
- **Components**: `CampaignOverview`, `StatusManager`, `ProcessResponses`, `AnalyticsSection`, `PublishResults`
- **Sections**:
  - **Status Management**: Open/Close/Launch buttons
  - **Process Responses**: Ingest from blockchain, decrypt responses
  - **Analytics**: School-wise breakdown, completion tracking, teacher performance
  - **Publish Results**: Generate Merkle root, make results public
- **API Calls**: `GET /api/campaigns/{id}`, `POST /api/campaigns/{id}/open`, `POST /api/campaigns/{id}/close`, `POST /api/campaigns/{id}/launch`

#### **`app/admin/semesters/[id]/campaigns/[campaignId]/edit/page.tsx`** - Edit Campaign
- **Components**: `CampaignForm`, `SemesterSelector`
- **Features**: Edit campaign details, change semester
- **API Calls**: `PUT /api/campaigns/{id}`, `GET /api/university/semesters`

#### **`app/admin/semesters/[id]/import/page.tsx`** - University Data Import
- **Components**: `FileUpload`, `ImportProgress`, `ValidationResults`
- **Features**: CSV import for students and enrollments
- **API Calls**: `POST /api/university/students/bulk-import`, `POST /api/university/enrollments/bulk-import`

#### **`app/admin/analytics/[campaignId]/page.tsx`** - Campaign Analytics
- **Components**: `AnalyticsChart`, `AnalyticsTable`, `SchoolBreakdown`, `CompletionTracking`, `TeacherPerformance`
- **Features**: 
  - School-wise analytics breakdown
  - Student completion tracking (who didn't complete)
  - Teacher performance metrics
  - Export functionality
- **API Calls**: `POST /api/analytics/campaigns/{campaignId}/analytics`, `POST /api/analytics/campaigns/{campaignId}/student-completion`

### Teacher Pages

#### **`app/teacher/layout.tsx`**
- Teacher-specific layout with navigation
- Role-based access control

#### **`app/teacher/page.tsx`** - Teacher Dashboard
- **Components**: `CampaignCard`, `CampaignList`
- **Features**: List of opened campaigns (course type only)
- **API Calls**: `GET /api/campaigns?status=open&type=course`

#### **`app/teacher/campaigns/[campaignId]/page.tsx`** - Course Assignment Management
- **Components**: `CourseList`, `AssignmentInterface`, `CourseSelector`
- **Features**: Select courses to assign to teacher, save assignments
- **API Calls**: `GET /api/university/teachers/{id}/assignments`, `POST /api/university/course-assignments`, `DELETE /api/university/course-assignments/{id}`

#### **`app/teacher/campaigns/[campaignId]/courses/[courseId]/page.tsx`** - Student Enrollment Management
- **Components**: `StudentInput`, `EnrollmentList`, `StudentSelector`
- **Features**: Input student IDs/names to create enrollments
- **API Calls**: `POST /api/university/enrollments`, `DELETE /api/university/enrollments/{id}`

### Student Pages

#### **`app/student/layout.tsx`**
- Student-specific layout (minimal)
- No authentication required

#### **`app/student/page.tsx`** - Token Input
- **Components**: `TokenInput`, `LoadingSpinner`
- **Features**: Token validation, error handling
- **API Calls**: `GET /api/tokens/validate/{token}`

#### **`app/student/surveys/page.tsx`** - Available Surveys
- **Components**: `SurveyCard`, `SurveyProgress`, `CryptoStatus`
- **Features**: List surveys with course/teacher names, progress tracking
- **API Calls**: `GET /api/surveys/token/{token}`

#### **`app/student/surveys/[surveyId]/page.tsx`** - Take Survey
- **Components**: `SurveyForm`, `QuestionRenderer`, `AnswerInput`, `SurveyProgress`
- **Features**: Multi-step form, progress indicator, local storage
- **API Calls**: `POST /api/crypto/campaigns/{campaignId}/blind-sign`

#### **`app/student/completion/page.tsx`** - Completion Confirmation
- **Components**: `CompletionStatus`, `SubmitButton`, `CryptoStatus`
- **Features**: Submit all responses to blockchain, mark token as completed
- **API Calls**: `POST /api/responses/submit`, `POST /api/tokens/{token}/complete`
- **Note**: Students submit via server API which uses school's Solana private key

### Authentication Pages

#### **`app/login/page.tsx`** - General Login
- **Components**: `LoginForm`, `RoleGuard`
- **Features**: Role selection, form validation
- **API Calls**: `POST /api/auth/login`

#### **`app/login/teacher/page.tsx`** - Teacher Login
- **Components**: `LoginForm`
- **Features**: Teacher-specific login form
- **API Calls**: `POST /api/auth/login`

## Component Details

### UI Components (shadcn/ui)
- **`button.tsx`**: Primary, secondary, destructive variants
- **`input.tsx`**: Text, email, password, search inputs
- **`card.tsx`**: Content containers with header, body, footer
- **`table.tsx`**: Data tables with sorting, filtering
- **`dialog.tsx`**: Modal dialogs for forms and confirmations
- **`form.tsx`**: Form components with validation
- **`badge.tsx`**: Status indicators and labels
- **`progress.tsx`**: Progress bars and indicators
- **`tabs.tsx`**: Tab navigation components
- **`select.tsx`**: Dropdown select components
- **`textarea.tsx`**: Multi-line text input
- **`checkbox.tsx`**: Checkbox input components
- **`radio-group.tsx`**: Radio button groups
- **`toast.tsx`**: Notification toasts
- **`alert.tsx`**: Alert messages and warnings
- **`spinner.tsx`**: Loading spinners
- **`chart.tsx`**: Chart components for analytics

### Authentication Components
- **`LoginForm.tsx`**: Reusable login form with validation
- **`ProtectedRoute.tsx`**: Route protection wrapper
- **`RoleGuard.tsx`**: Role-based access control
- **`AuthProvider.tsx`**: Authentication context provider

### Layout Components
- **`Header.tsx`**: App header with navigation and user menu
- **`Sidebar.tsx`**: Admin sidebar with navigation links
- **`Navigation.tsx`**: Main navigation component
- **`Footer.tsx`**: App footer with links and info
- **`Breadcrumb.tsx`**: Breadcrumb navigation

### Admin Components
- **`SemesterCard.tsx`**: Semester display with campaign counts
- **`CampaignCard.tsx`**: Campaign display with status and actions
- **`CampaignForm.tsx`**: Create/edit campaign form
- **`CampaignList.tsx`**: Campaign list with filtering and pagination
- **`CampaignStatus.tsx`**: Status badge with color coding
- **`StatusManager.tsx`**: Open/Close/Launch campaign buttons
- **`ProcessResponses.tsx`**: Ingest and decrypt responses interface
- **`AnalyticsSection.tsx`**: Analytics display with school breakdown
- **`SchoolBreakdown.tsx`**: School-wise analytics breakdown
- **`CompletionTracking.tsx`**: Student completion tracking (who didn't complete)
- **`TeacherPerformance.tsx`**: Teacher performance metrics
- **`PublishResults.tsx`**: Publish results with Merkle root generation
- **`FileUpload.tsx`**: CSV file upload for university data
- **`ImportProgress.tsx`**: Import progress indicator
- **`ValidationResults.tsx`**: Import validation results display
- **`ExportButton.tsx`**: Data export functionality

### Teacher Components
- **`CampaignCard.tsx`**: Campaign display for teacher selection
- **`CourseList.tsx`**: List of available courses
- **`AssignmentInterface.tsx`**: Course assignment management
- **`CourseSelector.tsx`**: Course selection interface
- **`StudentInput.tsx`**: Student ID/name input form
- **`EnrollmentList.tsx`**: List of enrolled students
- **`StudentSelector.tsx`**: Student selection interface

### Student Components
- **`TokenInput.tsx`**: Token input form with validation
- **`SurveyCard.tsx`**: Survey display with course/teacher names
- **`SurveyForm.tsx`**: Survey taking form with progress
- **`SurveyProgress.tsx`**: Progress indicator
- **`CompletionStatus.tsx`**: Completion confirmation
- **`SubmitButton.tsx`**: Submit all responses to blockchain
- **`CryptoStatus.tsx`**: Encryption status indicator

### Survey Components
- **`QuestionRenderer.tsx`**: Dynamic question rendering
- **`AnswerInput.tsx`**: Answer input component
- **`SurveyTemplate.tsx`**: Survey template display
- **`ResponseValidator.tsx`**: Response validation

### Shared Components
- **`LoadingSpinner.tsx`**: Loading indicator
- **`ErrorBoundary.tsx`**: Error handling wrapper
- **`ConfirmDialog.tsx`**: Confirmation dialog
- **`DataTable.tsx`**: Generic data table
- **`SearchInput.tsx`**: Search functionality
- **`Pagination.tsx`**: Pagination component
- **`StatusBadge.tsx`**: Status indicator
- **`DatePicker.tsx`**: Date selection
- **`FileUpload.tsx`**: File upload component
- **`CopyToClipboard.tsx`**: Copy functionality

## API Integration Points
- Authentication endpoints
- Campaign management
- University data CRUD
- Survey operations
- Crypto operations (blind signatures, encryption)
- Analytics and reporting

## Key Design Changes & Thoughts

### **Simplified Workflow Approach**
The design has been simplified to match your actual requirements:

1. **Admin Workflow**: Semester-first approach where admin selects semester → manages campaigns → handles analytics
2. **Teacher Workflow**: Focus on course assignments and student enrollments, not survey review
3. **Student Workflow**: Token-based access with local storage and batch submission

### **University Data Management**
- **CSV Import Only**: No manual CRUD interfaces, only bulk import via CSV files
- **School-based Organization**: All data organized by schools for better scalability
- **Bulk Operations**: Efficient handling of large datasets (30,000-45,000 students)

### **Analytics Improvements**
- **School-wise Breakdown**: Analytics split by schools to handle hundreds of teachers
- **Completion Tracking**: Clear visibility of students who didn't complete surveys
- **Teacher Performance**: Focused metrics for individual teachers
- **Merkle Root**: Moved to publish results phase for better workflow

### **Campaign Management**
- **Status-based Flow**: Clear Open → Close → Launch progression
- **Semester Context**: All campaigns tied to specific semesters
- **Integrated Analytics**: Analytics embedded in campaign details page

### **Student Experience**
- **Local Storage**: Responses stored locally until all surveys completed
- **Batch Submission**: Single submission to blockchain after all surveys done
- **Clear Progress**: Visual progress tracking through all surveys

### **Technical Considerations**
- **Scalability**: School-based organization handles large universities
- **Performance**: Bulk operations and efficient data structures
- **Security**: Maintained cryptographic integrity with simplified UX
- **Maintainability**: Clear separation of concerns and role-based access

This design balances simplicity with functionality, making it practical for real-world university use while maintaining the security and anonymity features of the system.

## Route Corrections & Missing Endpoints

### **Corrected Routes**
- **University routes**: `/api/university/*` (not `/api/universities/*`)
- **Analytics routes**: `/api/analytics/campaigns/{campaignId}/analytics` (not `/api/analytics/campaign/{id}`)
- **Merkle routes**: `/api/analytics/merkle/calculate-root` (not `/api/analytics/calculate-merkle-root`)

### **✅ Newly Added Routes**
1. **Teacher assignments**: `/api/university/teachers/{id}/assignments` ✅ - Added to university routes
2. **Campaign filtering**: `/api/campaigns?status=open&type=course` ✅ - Added query parameter support
3. **Student submission**: `/api/responses/submit` ✅ - Added for student blockchain submission

### **Available Import Routes**
- **Students**: `/api/university/students/bulk-import` ✅
- **Enrollments**: `/api/university/enrollments/bulk-import` ✅
- **Schools/Teachers/Courses**: Must use individual CRUD endpoints (no bulk import)

### **Blockchain Integration**
- **Student submission**: `/api/responses/submit` ✅ - Server uses school's Solana private key
- **Response ingestion**: `/api/responses/ingest/{campaignId}` ✅
- **Response decryption**: `/api/responses/decrypt-campaign/{campaignId}` ✅

### **Token Management**
- **Validation**: `/api/tokens/validate/{token}` ✅
- **Completion**: `/api/tokens/{token}/complete` ✅
- **Campaign tokens**: `/api/tokens/campaign/{campaignId}` ✅

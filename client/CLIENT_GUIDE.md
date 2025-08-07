# Anonymous Survey Client Project Guide

## 🎯 Project Overview

This is the **frontend client application** for the Anonymous Survey System using blockchain and cryptographic techniques. It provides both **student interfaces** for anonymous survey participation and **admin interfaces** for survey management.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                        │
│                      (Next.js)                              │
├─────────────────────────────────────────────────────────────┤
│  👥 Student Interface     │  🔧 Admin Interface             │
│  • Token entry           │  • Authentication               │
│  • Survey participation  │  • Survey creation              │
│  • Anonymous submission  │  • Token management             │
│  • Result verification   │  • Analytics dashboard          │
└─────────────────────────────────────────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                           │
│                   (Express.js)                              │
├─────────────────────────────────────────────────────────────┤
│  • Authentication        │  • Cryptographic operations     │
│  • Token management      │  • Blind signatures             │
│  • Survey CRUD           │  • Blockchain integration       │
│  • Email distribution    │  • Database operations          │
└─────────────────────────────────────────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────┐              ┌─────────────────┐
│   PostgreSQL    │              │ Solana Blockchain│
│   Database      │              │    Program      │
│                 │              │                 │
│ • Surveys       │              │ • Survey data   │
│ • Tokens        │              │ • Commitments   │
│ • Responses     │              │ • Merkle proofs │
│ • Private keys  │              │ • Verification  │
└─────────────────┘              └─────────────────┘
```

## 📱 Application Interfaces

### 👥 **Student Interface** (No Technical Knowledge Required)

Students interact through a simple, intuitive interface:

1. **Token Entry** (`/surveys/token`)
   - Enter unique token received via email
   - Automatic validation and survey redirection

2. **Survey Participation** (`/surveys/{id}/participate`)
   - Clean, simple form interface
   - Real-time validation
   - Progress indicators

3. **Completion Confirmation** (`/surveys/{id}/completed`)
   - Participation proof download
   - Survey completion confirmation
   - Thank you message

4. **Public Verification** (`/surveys/{id}/results`)
   - View anonymized results
   - Verify survey integrity
   - Cryptographic proof validation

### 🔧 **Admin Interface** (School Administrators)

Comprehensive management dashboard for school staff:

1. **Authentication** (`/login`)
   - JWT-based secure login
   - Session management
   - Auto-logout on inactivity

2. **Dashboard** (`/admin`)
   - Survey statistics overview
   - Quick action buttons
   - Recent activity feed

3. **Survey Management** (`/admin/surveys`)
   - Create new surveys
   - View all surveys list
   - Edit/delete surveys
   - Publish/unpublish surveys

4. **Survey Details** (`/admin/surveys/{id}`)
   - Individual survey analytics
   - Response statistics
   - Participation tracking
   - Security features display

5. **Token Management** (`/admin/surveys/{id}/tokens`)
   - Generate tokens in bulk
   - Email distribution
   - Token status tracking
   - Resend functionality

## 🔐 Security & Privacy Features

### **Client-Side Cryptography**

All cryptographic operations happen in the browser to ensure maximum privacy:

```typescript
// Located in src/lib/crypto/blindSignatures.ts

1. **Blind Signature Creation**
   - Student creates blinded message
   - School signs without seeing content
   - Student finalizes signature

2. **Answer Encryption**
   - RSA-OAEP encryption in browser
   - Only school can decrypt
   - Secure random number generation

3. **Commitment Generation**
   - Hash-based commitments
   - Tamper-proof verification
   - Merkle tree integration
```

### **Privacy Protection**

- **No personal data collection** - only survey responses
- **End-to-end encryption** using RSA-OAEP
- **Anonymous participation** via blind signatures
- **Client-side key generation** for sensitive operations

### **Integrity Verification**

- **Cryptographic commitments** prevent response tampering
- **Merkle tree proofs** for public verification
- **Blockchain immutability** ensures data integrity
- **Verifiable signature chains** from token to submission

## 📊 Technical Implementation

### **Technology Stack**

```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "state_management": "React Hooks + Context",
  "http_client": "Axios",
  "cryptography": "@cloudflare/blindrsa-ts",
  "blockchain": "@solana/web3.js",
  "build_tool": "Webpack (via Next.js)"
}
```

### **Key Dependencies**

```typescript
// Production Dependencies
"@cloudflare/blindrsa-ts": "^0.4.4",    // Blind signatures
"@solana/web3.js": "^1.98.2",           // Blockchain integration
"axios": "^1.9.0",                      // HTTP client
"next": "14.2.0",                       // React framework
"react": "^18",                         // UI library
"tailwindcss": "^3.4.1"                 // CSS framework

// Development Dependencies
"typescript": "^5",                      // Type safety
"eslint": "^8",                         // Code quality
"@types/*": "various"                   // Type definitions
```

### **Environment Configuration**

```bash
# Required environment variables
NEXT_PUBLIC_API_URL=http://localhost:3000     # Backend server URL
NEXT_PUBLIC_RPC_URL=your_solana_rpc           # Solana RPC endpoint
NEXT_PUBLIC_PROGRAM_ID=your_program_id        # Solana program ID
```

## 🗂️ Project File Structure

```
client/
├── 📄 Documentation
│   ├── README.md                    → Client-specific documentation
│   ├── NEXTJS_GUIDE.md             → Next.js concepts explained
│   └── CLIENT_PROJECT_GUIDE.md     → This file
│
├── 📄 Configuration
│   ├── package.json                → Dependencies and scripts
│   ├── next.config.js              → Next.js configuration
│   ├── tsconfig.json               → TypeScript settings
│   ├── tailwind.config.js          → CSS framework config
│   └── eslint.config.mjs           → Code quality rules
│
├── 📁 public/                      → Static assets
│   └── *.svg                       → Icons and images
│
└── 📁 src/                         → Source code
    ├── 📁 app/                     → Next.js pages (App Router)
    │   ├── layout.tsx              → Root layout wrapper
    │   ├── page.tsx                → Home page (/)
    │   ├── login/                  → Admin login (/login)
    │   ├── admin/                  → Admin interface (/admin/*)
    │   └── surveys/                → Survey interfaces (/surveys/*)
    │
    ├── 📁 components/              → Reusable UI components
    │   ├── auth/                   → Authentication components
    │   ├── layout/                 → Layout components
    │   └── survey/                 → Survey-specific components
    │
    ├── 📁 hooks/                   → Custom React hooks
    │   ├── useAuth.ts              → Authentication logic
    │   ├── useSurveys.ts           → Survey operations
    │   └── useTokens.ts            → Token management
    │
    ├── 📁 lib/                     → Utility libraries
    │   ├── api/                    → Server communication
    │   └── crypto/                 → Cryptographic operations
    │
    ├── 📁 contexts/                → React context providers
    │   └── AppContext.tsx          → Global state management
    │
    └── 📁 styles/                  → CSS and styling
        └── globals.css             → Global styles
```

## 🔄 Data Flow & State Management

### **Authentication Flow**

```typescript
1. Admin enters credentials → Login page
2. useAuth hook validates → API call to /api/auth/login
3. JWT token received → Stored in localStorage
4. Protected routes check → useAuth hook verifies token
5. Auto-logout on expiry → Redirect to login
```

### **Survey Creation Flow**

```typescript
1. Admin fills form → Create survey page
2. useSurveys hook → API call to /api/surveys
3. Server generates → Crypto keys + blockchain setup
4. Response received → Survey created in database
5. Redirect to → Survey management page
```

### **Student Participation Flow**

```typescript
1. Student enters token → Token validation page
2. Token verified → Redirect to survey participation
3. Answer submitted → Crypto operations in browser
4. Blinded signature → Request to school
5. Final submission → Blockchain transaction
6. Confirmation → Completion page with proof
```

## 🎨 User Interface Design

### **Design Principles**

- **Simplicity First**: Especially for student interface
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-first design approach
- **Professional**: Clean, modern aesthetic
- **Secure**: Visual security indicators

### **Component Architecture**

```typescript
// Atomic Design Pattern
├── Atoms (Basic UI elements)
│   ├── Button, Input, Label
│   ├── Loading spinner, Error message
│   └── Typography components
│
├── Molecules (Simple combinations)
│   ├── TokenInput (label + input + validation)
│   ├── SurveyCard (title + description + actions)
│   └── Navigation items
│
├── Organisms (Complex combinations)
│   ├── Header (logo + navigation + user menu)
│   ├── SurveyForm (multiple inputs + validation)
│   └── Dashboard stats panel
│
└── Templates (Page layouts)
    ├── AdminLayout (sidebar + content)
    ├── StudentLayout (minimal + focused)
    └── PublicLayout (header + content)
```

### **Styling System**

```typescript
// Tailwind CSS utility classes
- Colors: Consistent brand palette
- Typography: Responsive font scales
- Spacing: 8px grid system
- Breakpoints: Mobile-first responsive
- Components: Reusable component classes
```

## 🧪 Testing & Quality Assurance

### **Code Quality Tools**

```bash
npm run lint          # ESLint code quality checks
npm run type-check    # TypeScript type validation
npm run build         # Production build verification
```

### **Browser Compatibility**

- **Chrome 90+** (Recommended)
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

Required browser features:
- WebCrypto API for cryptographic operations
- ES2020 JavaScript support
- WebAssembly support
- LocalStorage for session management

## 🚀 Development Workflow

### **Getting Started**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3002
```

### **Development Features**

- **Hot reload** - Instant file change updates
- **TypeScript** - Real-time type checking
- **ESLint** - Code quality enforcement
- **Fast refresh** - Component state preservation

### **Build Process**

```bash
# Development build
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

## 🔧 API Integration

### **Backend Communication**

All server communication is handled through the API layer:

```typescript
// src/lib/api/client.ts - Base configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic JWT token attachment
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### **API Endpoints Used**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Admin authentication |
| `/api/surveys` | GET, POST, PUT, DELETE | Survey CRUD operations |
| `/api/surveys/{id}/tokens` | GET, POST | Token management |
| `/api/tokens/validate` | POST | Student token validation |
| `/api/crypto/blind-sign` | POST | Blind signature requests |
| `/api/responses` | POST | Survey response submission |

## 🔍 Debugging & Troubleshooting

### **Common Development Issues**

1. **CORS Errors**
   - Ensure backend CORS is configured for localhost:3002
   - Check NEXT_PUBLIC_API_URL environment variable

2. **Authentication Issues**
   - Clear localStorage and try again
   - Check JWT token expiration
   - Verify backend authentication endpoints

3. **TypeScript Errors**
   - Run `npm run type-check` for detailed errors
   - Ensure all dependencies have type definitions
   - Check import/export statements

4. **Build Errors**
   - Clear .next folder and rebuild
   - Check for missing environment variables
   - Verify all imports are correct

### **Debugging Tools**

```typescript
// Browser developer tools
1. Console - JavaScript errors and logs
2. Network - API request/response inspection
3. Application - localStorage and session data
4. Security - HTTPS and certificate issues

// React Developer Tools
- Component tree inspection
- Props and state debugging
- Performance profiling
```

## 📈 Performance Optimization

### **Next.js Optimizations**

- **Automatic code splitting** - Smaller bundle sizes
- **Image optimization** - Responsive images with next/image
- **Font optimization** - Optimized web font loading
- **Static generation** - Pre-built pages for better performance

### **Lazy Loading**

```typescript
// Dynamic imports for large components
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <LoadingSpinner />,
});

// Route-based code splitting (automatic)
- Each page is automatically split
- Components loaded only when needed
```

## 🔮 Future Enhancements

### **Planned Features**

1. **Multi-language Support**
   - i18n integration for international schools
   - RTL language support

2. **Advanced Analytics**
   - Real-time participation tracking
   - Response pattern analysis
   - Export capabilities

3. **Mobile App**
   - React Native implementation
   - Push notifications for new surveys

4. **Accessibility Improvements**
   - Screen reader optimization
   - Keyboard navigation enhancement
   - High contrast mode

### **Technical Improvements**

1. **Performance**
   - Service worker implementation
   - Offline survey capability
   - Progressive Web App features

2. **Security**
   - Content Security Policy
   - Additional crypto algorithms
   - Hardware security key support

---

## ✅ Summary

This client application provides a **complete, secure, and user-friendly interface** for the anonymous survey system. It combines modern web technologies with advanced cryptographic techniques to ensure both usability and privacy.

**Key Achievements:**
- ✅ Zero technical knowledge required for students
- ✅ Comprehensive admin management interface
- ✅ Client-side cryptography for maximum privacy
- ✅ Responsive design for all devices
- ✅ Type-safe code with TypeScript
- ✅ Modern UI with excellent UX
- ✅ Production-ready build system

**Ready for:** Development testing, user acceptance testing, and production deployment. 
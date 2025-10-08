# Next.js & Client Project Structure Guide

## 🌟 What is Next.js?

**Next.js** is a React framework that makes building web applications easier and more powerful. Think of it this way:

- **React** = The engine (component library for building user interfaces)
- **Next.js** = The complete car (full framework with routing, optimization, server features, etc.)

### Why Next.js instead of plain React?

| Feature | Plain React | Next.js |
|---------|-------------|---------|
| **Routing** | Need external library (React Router) | Built-in file-based routing |
| **Performance** | Manual optimization | Automatic code splitting & optimization |
| **SEO** | Limited (client-side only) | Server-side rendering built-in |
| **API Routes** | Need separate backend | Can create API endpoints in same project |
| **Development** | Complex setup | Ready to go with one command |

## 🏗️ Next.js App Router System

Next.js uses a **file-based routing system** where your folder structure automatically becomes your website URLs.

### Key Concepts:

1. **`page.tsx`** = An actual webpage that users can visit
2. **`layout.tsx`** = A wrapper around pages (like header/footer/navigation)
3. **`[folder]`** = Dynamic route (folder name can be anything)
4. **Nested folders** = Nested URLs

### Example:
```
src/app/
├── page.tsx              → yoursite.com/
├── about/
│   └── page.tsx          → yoursite.com/about
├── admin/
│   ├── page.tsx          → yoursite.com/admin
│   └── surveys/
│       ├── page.tsx      → yoursite.com/admin/surveys
│       └── [id]/
│           └── page.tsx  → yoursite.com/admin/surveys/123
└── products/
    └── [slug]/
        └── page.tsx      → yoursite.com/products/anything
```

## 📁 Our Project Structure Explained (Essentials Only)

```
client/
├── 📄 Configuration Files
│   ├── package.json          → Dependencies & scripts
│   ├── next.config.js        → Next.js settings
│   ├── tsconfig.json         → TypeScript configuration
│   ├── tailwind.config.js    → CSS framework settings
│   └── eslint.config.mjs     → Code quality rules
│
├── 📁 public/               → Static files (images, icons, etc.)
│   ├── favicon.ico
│   └── *.svg files
│
└── 📁 src/                  → All your source code
    ├── 📁 app/              → Pages & routing (THE HEART)
    ├── 📁 components/       → Reusable UI pieces
    ├── 📁 hooks/           → Custom React logic
    ├── 📁 lib/             → Utilities & API functions
    ├── 📁 contexts/        → Global state management
    ├── 📁 styles/          → CSS files
    └── 📁 utils/           → Helper functions
```

## 🗺️ URL Mapping (Key Routes)

| File Path | Website URL | Purpose |
|-----------|-------------|---------|

<!-- Home page -->
| `src/app/page.tsx` | `/` | **Home page** - Choose student or admin |
| `src/app/login/page.tsx` | `/login` | **Admin login** |

<!-- Admin pages -->
| `src/app/admin/page.tsx` | `/admin` | **Admin dashboard** (Modern glassmorphism design) |
| `src/app/admin/surveys/page.tsx` | `/admin/surveys` | **Survey management list** (Template-based) |
| `src/app/admin/surveys/create/page.tsx` | `/admin/surveys/create` | **Create new survey form** (Template system) |
| `src/app/admin/surveys/[id]/page.tsx` | `/admin/surveys/123` | **Survey details** (Header actions, analytics) |
| `src/app/admin/surveys/[id]/tokens/page.tsx` | `/admin/surveys/123/tokens` | **Token management** (Modern UI) |
| `src/app/admin/surveys/[id]/responses/page.tsx` | `/admin/surveys/123/responses` | **Response analytics** (Overview/Questions/Categories) |
| `src/app/admin/surveys/[id]/attendance/page.tsx` | `/admin/surveys/123/attendance` | **Check attendance** |
| `src/app/admin/surveys/[id]/publication/page.tsx` | `/admin/surveys/123/publication` | **Manage public responses** |

<!-- Student pages -->
| `src/app/surveys/token/page.tsx` | `/surveys/token` | **Student enters token** |
| `src/app/surveys/verify/page.tsx` | `/surveys/verify` | **Student verifies response (signature only)** |
| `src/app/surveys/[id]/participate/page.tsx` | `/surveys/123/participate` | **Student takes survey** |
| `src/app/surveys/[id]/completed/page.tsx` | `/surveys/123/completed` | **Survey completion confirmation** |
| `src/app/surveys/[id]/results/page.tsx` | `/surveys/123/results` | **Public results verification** |
| `src/app/surveys/public/page.tsx` | `/surveys/public` | **Browse public surveys** |
| `src/app/surveys/[id]/public/page.tsx` | `/surveys/123/public` | **View curated public results** |

## 🎨 Components - Reusable UI Building Blocks

Think of components like **LEGO blocks** - you build them once and use them everywhere.

```
src/components/
├── auth/
│   └── ProtectedRoute.tsx     → Protects admin pages (login required)
├── layout/
│   ├── Layout.tsx             → Main page wrapper
│   └── Header.tsx             → Top navigation bar
└── survey/
    ├── SurveyCard.tsx         → Shows survey info in a card
    ├── SurveyForm.tsx         → Form for creating surveys
    └── TokenInput.tsx         → Input field for student tokens
```

### How Components Work:

```typescript
// Define once in SurveyCard.tsx
function SurveyCard({ title, description, responses }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
      <span>{responses} responses</span>
    </div>
  );
}

// Use everywhere:
<SurveyCard title="Event Feedback" description="Rate our event" responses={42} />
<SurveyCard title="Course Survey" description="Course feedback" responses={128} />
```

## 🔧 Hooks - Custom React Logic (Where to Look)

Hooks are **reusable functions** that handle complex logic and state management.

```
src/hooks/
├── useAuth.ts        → Handles login/logout/authentication
├── useSurveys.ts     → Manages survey data (CRUD operations)
└── useTokens.ts      → Handles token operations
```

### Example Usage:

```typescript
// In any component:
function AdminDashboard() {
  const { isAuthenticated, login, logout } = useAuth();
  const { surveys, createSurvey, deleteSurvey } = useSurveys();

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <h1>Welcome Admin!</h1>
      <button onClick={logout}>Logout</button>
      {surveys.map(survey => 
        <SurveyCard 
          key={survey.id} 
          {...survey}
          onDelete={() => deleteSurvey(survey.id)}
        />
      )}
    </div>
  );
}
```

## 📡 API Layer - Server Communication (Pointer)
See `client/CLIENT_README.md` for API usage and examples (single source of truth). Below is the minimal context:

Located in `src/lib/api/`, these files contain functions that communicate with your backend server.

```
src/lib/api/
├── client.ts        → Base HTTP client (axios configuration)
├── surveys.ts       → Survey API functions
└── tokens.ts        → Token API functions
```

### Minimal Example

```typescript
// surveys.ts contains:
export const surveysApi = {
  // NOTE: apiClient.baseURL already includes "/api" (e.g. http://localhost:3000/api)
  // so these paths are relative (no "/api" prefix here)
  getAll: () => apiClient.get('/surveys'),
  create: (data) => apiClient.post('/surveys', data),
  update: (id, data) => apiClient.put(`/surveys/${id}`, data),
  delete: (id) => apiClient.delete(`/surveys/${id}`)
};

// Used in hooks like:
const { data: surveys } = await surveysApi.getAll();
```

## 🔐 Cryptographic Operations (Pointer)
Details and usage notes live in `client/CLIENT_README.md`.

```
src/lib/crypto/
└── blindSignatures.ts    → Handles anonymous signature creation
```

This handles the complex cryptographic operations that ensure student anonymity in surveys.

## 🔄 Data Flow Example

Let's trace how an **admin creates a survey**:

1. **User visits:** `localhost:3002/admin/surveys/create`
2. **Next.js loads:** `src/app/admin/surveys/create/page.tsx`
3. **Page component uses:** `useAuth()` hook to verify admin is logged in
4. **User fills form:** Survey title, description, question
5. **Form submission triggers:** `useSurveys().createSurvey(formData)`
6. **Hook calls API:** `surveysApi.create(formData)` in `src/lib/api/surveys.ts`
7. **API makes HTTP request:** `POST /api/surveys` to your backend server
8. **Server processes:** Creates survey in database with crypto keys
9. **Response returns:** Created survey data
10. **Page redirects:** To `/admin/surveys` to show updated list

## 🎯 Key Next.js Concepts

### 1. **Server Components vs Client Components**

```typescript
// Server Component (default) - runs on server
export default function ServerPage() {
  return <div>This renders on the server</div>;
}

// Client Component - runs in browser
'use client';
export default function ClientPage() {
  const [state, setState] = useState(''); // Can use hooks
  return <div>This renders in the browser</div>;
}
```

### 2. **Dynamic Routes**

```
[id]/          → Matches any single value: /123, /abc, /xyz
[...slug]/     → Matches multiple segments: /a/b/c/d
[[...slug]]/   → Optional catch-all: / or /a or /a/b/c
```

### 3. **Layouts**

```typescript
// app/layout.tsx - Wraps ALL pages
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header />
        {children}  {/* This is where page content goes */}
        <Footer />
      </body>
    </html>
  );
}

// app/admin/layout.tsx - Only wraps admin pages
export default function AdminLayout({ children }) {
  return (
    <div>
      <AdminSidebar />
      {children}
    </div>
  );
}
```

## 💻 Development Commands

```bash
# Development
npm run dev     # Start development server (localhost:3002)
npm run build   # Build optimized production version
npm run start   # Start production server
npm run lint    # Check code quality

# During development:
# - File changes auto-reload the page
# - TypeScript errors show in terminal
# - CSS changes apply instantly
```

## 🔧 Configuration Files

- **`package.json`**: Dependencies and scripts
- **`next.config.js`**: Next.js settings and build configuration
- **`tsconfig.json`**: TypeScript configuration
- **`tailwind.config.js`**: CSS framework settings

## 🚀 How Our Anonymous Survey System Works

### Student Journey:
1. **Receives email** with unique token
2. **Visits** `/surveys/token` → Enters token
3. **Redirected to** `/surveys/{id}/participate` → Takes survey
4. **Cryptographic magic** happens in browser (blind signatures)
5. **Survey submitted** anonymously to blockchain
6. **Confirmation** at `/surveys/{id}/completed`

### Admin Journey:
1. **Logs in** at `/login`
2. **Dashboard** at `/admin` → Overview of all surveys
3. **Creates survey** at `/admin/surveys/create`
4. **Manages tokens** at `/admin/surveys/{id}/tokens`
5. **Views results** with cryptographic verification

### Public Verification:
1. **Anyone can visit** `/surveys/{id}/results`
2. **Verify survey integrity** using Merkle tree proofs
3. **No student privacy compromised**

## 🔗 How Everything Connects

```
Frontend (Next.js) ←→ Backend (Express.js) ←→ Database (PostgreSQL)
       ↓                      ↓                      ↓
   User Interface         API Endpoints          Data Storage
   - Pages                - Authentication       - Surveys
   - Components           - Survey CRUD          - Tokens  
   - State Management     - Token Management     - Responses
   - Crypto Operations    - Blind Signatures     - Private Keys
```

## ✅ What We Built

Your client application includes:

- ✅ **Complete admin interface** with authentication
- ✅ **Survey creation and management** system
- ✅ **Token generation and distribution** 
- ✅ **Student survey participation** flow
- ✅ **Cryptographic operations** for anonymity
- ✅ **Public verification** system
- ✅ **Responsive design** that works on all devices
- ✅ **Type-safe code** with TypeScript
- ✅ **Modern UI** with Tailwind CSS

## 🔍 Debugging Tips

- Check browser console for JavaScript errors
- Check terminal for TypeScript/build errors  
- Use React Developer Tools browser extension
- Check Network tab to see API requests/responses

---

**Next Steps:** Now that you understand the structure, we can test the complete system flow from admin survey creation to student participation!
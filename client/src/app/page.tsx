import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Anonymous Survey System
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          A secure, blockchain-powered survey platform that ensures complete anonymity 
          while maintaining verifiable results using advanced cryptographic techniques.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="text-blue-600 text-3xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-3">Complete Anonymity</h3>
          <p className="text-gray-600">
            Using blind signatures, no one can link responses to specific participants.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="text-green-600 text-3xl mb-4">⛓️</div>
          <h3 className="text-xl font-semibold mb-3">Blockchain Verified</h3>
          <p className="text-gray-600">
            All survey data is stored on Solana blockchain for transparency and immutability.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="text-purple-600 text-3xl mb-4">✅</div>
          <h3 className="text-xl font-semibold mb-3">Verifiable Results</h3>
          <p className="text-gray-600">
            Cryptographic proofs ensure results cannot be tampered with or manipulated.
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Student Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-xl border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎓 For Students
          </h2>
          <p className="text-gray-700 mb-6">
            Participate in surveys anonymously using your unique token.
          </p>
          <Link 
            href="/surveys/token" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enter Survey Token
          </Link>
        </div>

        {/* Admin Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-xl border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            👩‍💼 For Administrators
          </h2>
          <p className="text-gray-700 mb-6">
            Create surveys, manage tokens, and view anonymized results.
          </p>
          <div className="space-x-4">
            <Link 
              href="/login" 
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Admin Login
            </Link>
            <Link 
              href="/surveys" 
              className="inline-block bg-white text-green-600 border border-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors"
            >
              View Surveys
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">1️⃣</span>
            </div>
            <h3 className="font-semibold mb-2">Token Distribution</h3>
            <p className="text-sm text-gray-600">Admin creates survey and distributes unique tokens to participants</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">2️⃣</span>
            </div>
            <h3 className="font-semibold mb-2">Anonymous Submission</h3>
            <p className="text-sm text-gray-600">Students submit responses using blind signature cryptography</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">3️⃣</span>
            </div>
            <h3 className="font-semibold mb-2">Blockchain Storage</h3>
            <p className="text-sm text-gray-600">Encrypted responses stored immutably on Solana blockchain</p>
          </div>
          
          <div className="text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">4️⃣</span>
            </div>
            <h3 className="font-semibold mb-2">Verifiable Results</h3>
            <p className="text-sm text-gray-600">Results published with cryptographic proofs for public verification</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-16 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">🚀 System Status</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-green-600">✅</span> Server API: Connected
          </div>
          <div>
            <span className="text-green-600">✅</span> Database: Operational
          </div>
          <div>
            <span className="text-green-600">✅</span> Blockchain: Solana Devnet
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-purple-700 to-slate-800">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)`
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          {/* <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <span className="text-white/90 text-sm font-medium">🔒 Cryptographically Secure • ⛓️ Blockchain Verified</span>
          </div> */}
          
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-6 leading-tight">
            Anonymous Survey System
            <br />
          </h1>
          
          <p className="text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
            A revolutionary survey platform that ensures <span className="text-blue-300 font-semibold">complete anonymity </span> 
            while maintaining <span className="text-purple-300 font-semibold">verifiable results</span> using advanced cryptographic techniques 
            and blockchain technology.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/student"
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <span className="relative z-10">Student Portal</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>

            <Link
              href="/login/teacher"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              Teacher Portal
            </Link>

            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-float">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Complete Anonymity</h3>
            <p className="text-white/70 leading-relaxed">
              Using advanced blind signatures, no one can link responses to specific participants while maintaining data integrity.
            </p>
          </div>
          
          <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-float" style={{animationDelay: '0.5s'}}>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">⛓️</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Blockchain Verified</h3>
            <p className="text-white/70 leading-relaxed">
              All survey data is stored immutably on Solana blockchain ensuring complete transparency and tamper-proof results.
            </p>
          </div>
          
          <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 animate-float" style={{animationDelay: '1s'}}>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Verifiable Results</h3>
            <p className="text-white/70 leading-relaxed">
              Cryptographic proofs and Merkle trees ensure results cannot be tampered with or manipulated by any party.
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Student Section */}
          <div className="group bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-lg p-8 rounded-3xl border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-xl">🎓</span>
              </div>
              <h2 className="text-3xl font-bold text-white">
                For Students
              </h2>
            </div>
            <p className="text-white/80 mb-8 text-lg leading-relaxed">
              Complete course evaluations anonymously using your unique survey token.
            </p>
            <div className="space-y-4">
              <Link
                href="/login/student"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold text-center hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
              >
                Enter Survey Token
              </Link>
            </div>
          </div>

          {/* Teacher Section */}
          <div className="group bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg p-8 rounded-3xl border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-xl">👨‍🏫</span>
              </div>
              <h2 className="text-3xl font-bold text-white">
                For Teachers
              </h2>
            </div>
            <p className="text-white/80 mb-8 text-lg leading-relaxed">
              Manage course assignments and student enrollments for survey campaigns.
            </p>
            <div className="space-y-4">
              <Link
                href="/login/teacher"
                className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold text-center hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                Teacher Login
              </Link>
            </div>
          </div>

          {/* Admin Section */}
          <div className="group bg-gradient-to-br from-emerald-500/20 to-green-600/20 backdrop-blur-lg p-8 rounded-3xl border border-emerald-400/30 hover:border-emerald-400/50 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-xl">👩‍💼</span>
              </div>
              <h2 className="text-3xl font-bold text-white">
                For Administrators
              </h2>
            </div>
            <p className="text-white/80 mb-8 text-lg leading-relaxed">
              Create campaigns, manage university data, and view analytics with full control.
            </p>
            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-xl font-semibold text-center hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-center text-white/60 mb-16 text-lg">
            A seamless university-scale workflow ensuring anonymous course evaluations
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Campaign Setup</h3>
              <p className="text-white/70 leading-relaxed">Admin creates campaign, teachers assign courses and enroll students for the semester</p>
            </div>

            <div className="group text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Token Generation</h3>
              <p className="text-white/70 leading-relaxed">System generates anonymous tokens for each student-course pairing with blind signatures</p>
            </div>

            <div className="group text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Anonymous Evaluation</h3>
              <p className="text-white/70 leading-relaxed">Students submit encrypted course evaluations that are batched to blockchain</p>
            </div>

            <div className="group text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl">4️⃣</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Analytics & Verification</h3>
              <p className="text-white/70 leading-relaxed">Results decrypted and analyzed with Merkle proofs for verification</p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/20">
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="mr-3">🚀</span>
            System Status
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center bg-white/5 rounded-xl p-4">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-4 animate-pulse"></div>
              <span className="text-white font-medium">Server API: Connected</span>
            </div>
            <div className="flex items-center bg-white/5 rounded-xl p-4">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-4 animate-pulse"></div>
              <span className="text-white font-medium">Database: Operational</span>
            </div>
            <div className="flex items-center bg-white/5 rounded-xl p-4">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-4 animate-pulse"></div>
              <span className="text-white font-medium">Blockchain: Solana Devnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

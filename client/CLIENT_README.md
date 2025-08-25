# Anonymous Survey System - Client Application

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [User Workflows](#user-workflows)
- [Security Features](#security-features)
- [Development](#development)
- [Project Structure](#project-structure)
- [Browser Compatibility](#browser-compatibility)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview
The client application provides a user-friendly interface for students to participate in anonymous surveys without requiring any blockchain knowledge. For school administrators, it offers a comprehensive management interface with blockchain integration capabilities.

## Features

### For Students
- **Simple and intuitive survey interface** - Easy-to-use web interface that requires no technical knowledge
- **No blockchain knowledge required** - All cryptographic operations happen transparently in the background
- **Anonymous survey participation** - Your identity remains completely private throughout the process
- **Secure token-based authentication** - One-time tokens ensure only authorized students can participate
- **End-to-end encrypted response submission** - Your responses are encrypted before being stored on the blockchain
- **Verifiable participation proof** - Download proof of your participation for your records
- **Cross-platform compatibility** - Works on any modern web browser (Chrome, Firefox, Safari, Edge)

### For School Administrators
- **Survey creation and management** - Create surveys with custom questions and manage multiple surveys
- **Token generation and distribution** - Generate secure tokens and automatically distribute them via email
- **Survey result analysis** - View comprehensive analytics and response distributions
- **Participation tracking** - Monitor real-time participation rates and token usage
- **System configuration** - Configure blockchain settings and manage cryptographic keys
- **Blockchain transaction management** - Handle all on-chain operations including survey publishing
- **Keypair management for signing student transactions** - Securely manage school's signing keys
- **Result verification tools** - Verify survey integrity using Merkle proofs and commitments

## Prerequisites

### For Students
- **Modern web browser** with JavaScript enabled (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Valid survey token** (received via email from your school)
- **Stable internet connection** for survey submission
- **No additional software installation required**

### For School Administrators
- **Node.js**: 16.0+
- **School's Solana keypair** for transaction signing and blockchain operations
- **Access to school's backend system** with proper authentication credentials
- **Email server configuration** for token distribution
- **Modern web browser** with administrative privileges

## Quick Start

### For Students
1. **Receive your survey token** via email from your school
2. **Open the survey link** provided in the email
3. **Enter your token** when prompted for authentication
4. **Complete the survey** by answering all required questions
5. **Submit your response** - it will be automatically encrypted and stored securely
6. **Download your participation proof** (optional) for your records

### For School Administrators
```bash
# Install dependencies
npm install

# Set up environment variables for your school
cp .env.example .env
# Edit .env with your school's configuration

# Start development server
npm run dev

# Build for production deployment
npm run build

# API reference (interactive)
# Backend must be running at http://localhost:3000
open http://localhost:3000/api-docs
```

## Installation

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

## Configuration

### Environment Variables

#### For School Administrators
```env
# Blockchain Configuration
NEXT_PUBLIC_RPC_URL=your_solana_rpc_url
NEXT_PUBLIC_PROGRAM_ID=your_deployed_program_id
NEXT_PUBLIC_SCHOOL_PUBKEY=your_school_public_key

# Backend Server
NEXT_PUBLIC_API_URL=https://your-school-backend.edu

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

#### Students (No Configuration Required)
Students don't need to configure anything - they simply use the survey links provided by their school.

## User Workflows

### Student Survey Participation
1. **Token Authentication**
   - Enter the unique token received via email
   - System validates token and shows survey details
   - Token is marked as "in use" to prevent reuse

2. **Survey Completion**
   - Answer survey questions in an intuitive interface
   - Responses are encrypted locally in your browser
   - No personal information is collected or stored

3. **Secure Submission**
   - Generate cryptographic commitment for your answers
   - Create blinded message for anonymous verification
   - Submit encrypted response to blockchain
   - Receive confirmation and participation proof

### Administrator Survey Management
1. **Survey Creation**
   - Design survey with custom questions
   - System automatically generates cryptographic keys
   - Survey is deployed to blockchain with metadata

2. **Token Distribution**
   - Upload student email list or enter manually
   - Generate unique tokens for each student
   - Automatically send personalized emails with survey links

3. **Monitoring & Analysis**
   - Real-time participation tracking
   - View response statistics and distributions
   - Export data for further analysis
   - Verify survey integrity with cryptographic proofs

## Security Features

### Privacy Protection
- **End-to-end encryption** using RSA-OAEP with 2048-bit keys
- **Blind signature implementation** ensures complete anonymity
- **Zero-knowledge participation** - schools can verify participation without knowing who submitted what
- **Secure token management** with one-time use validation
- **No personal data collection** - only survey responses are stored

### Integrity Verification
- **Cryptographic commitments** for tamper-proof responses
- **Merkle tree proofs** for public verification of results
- **Blockchain immutability** prevents response modification
- **Verifiable signature chains** from token to final submission

### Technical Security
- **Client-side cryptography** - sensitive operations happen in your browser
- **Secure random number generation** for all cryptographic operations  
- **Input validation and sanitization** to prevent attacks
- **HTTPS/TLS encryption** for all network communications

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build optimized production bundle  
npm run start            # Start production server
npm run lint             # Check code quality and style
npm run type-check       # Verify TypeScript types

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
```

## Project Structure (Source of Truth)
```
client/
├── components/         # Reusable React components
│   ├── student/        # Student-specific components
│   ├── admin/          # Administrator components
│   ├── shared/         # Shared UI components
│   └── layout/         # Layout and navigation
├── pages/             # Next.js pages and routing
│   ├── student/        # Student survey interfaces
│   ├── admin/          # Administrative dashboards
│   └── api/            # API route handlers
├── public/            # Static assets and images
├── styles/            # CSS and styling files
├── utils/             # Utility functions and helpers
│   ├── crypto/         # Cryptographic operations
│   ├── blockchain/     # Blockchain interactions
│   └── validation/     # Input validation
├── types/             # TypeScript type definitions
└── config/            # Configuration files
```

## Browser Compatibility

### Supported Browsers
- **Chrome 90+** (Recommended)
- **Firefox 88+**
- **Safari 14+** 
- **Edge 90+**

### Required Features
- **WebCrypto API** for cryptographic operations
- **ES2020 JavaScript** for modern language features
- **WebAssembly** for high-performance cryptographic libraries
- **LocalStorage** for temporary data storage

## Common Tasks (Cheatsheet)

- Create a survey (admin)
  - Hook: `useSurveys().create(...)`
  - API: `POST /surveys`
- Generate tokens
  - Hook: `useTokens()` then admin UI
  - API: `POST /tokens/batch-generate`
- Student participation
  - Token page `/surveys/token` → validate → participate
  - Crypto handled in `src/lib/crypto/blindSignatures.ts`

## Troubleshooting

### Common Student Issues
- **Invalid Token Error**: Check that you're using the correct token from your email
- **Survey Not Loading**: Ensure you have a stable internet connection
- **Submission Failed**: Try refreshing the page and submitting again
- **Browser Compatibility**: Use a supported modern browser

### Common Administrator Issues
- **Blockchain Connection Error**: Verify your RPC URL and network settings
- **Token Generation Failed**: Check your backend server connection
- **Key Management Issues**: Ensure your Solana keypair is properly configured
- **Email Distribution Problems**: Verify SMTP settings in backend configuration

### Getting Help
- Check the [System Design Documentation](../SYSTEM_DESIGN.md) for technical details
- Review the [Server README](../server/README.md) for backend configuration
- Contact your system administrator for institution-specific issues

## Related Documentation
- [Main System Overview](../README.md)
- [System Architecture](../SYSTEM_DESIGN.md)
- [Backend Server](../server/README.md)
- [Blockchain Component](../blockchain/README.md)
- [Documentation Standards](../DOCUMENTATION_STANDARDS.md)

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License
MIT License - see LICENSE file for details. 
/**
 * Password Hash Generator
 *
 * This script generates bcrypt password hashes for teacher accounts
 *
 * Usage:
 * node generate-password-hash.js "your-password-here"
 *
 * Example:
 * node generate-password-hash.js "teacher123"
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('❌ Error: No password provided');
  console.log('');
  console.log('Usage:');
  console.log('  node generate-password-hash.js "your-password"');
  console.log('');
  console.log('Example:');
  console.log('  node generate-password-hash.js "teacher123"');
  console.log('');
  process.exit(1);
}

async function generateHash() {
  try {
    console.log('');
    console.log('🔐 Generating bcrypt hash...');
    console.log('Password:', password);
    console.log('Rounds: 10');
    console.log('');

    const hash = await bcrypt.hash(password, 10);

    console.log('✅ Hash generated successfully!');
    console.log('');
    console.log('📋 Copy this hash to your SQL script:');
    console.log('─'.repeat(80));
    console.log(hash);
    console.log('─'.repeat(80));
    console.log('');
    console.log('💡 Use this in your INSERT statement:');
    console.log(`INSERT INTO "teacher_logins" (..., "password_hash", ...) VALUES (..., '${hash}', ...);`);
    console.log('');

  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

generateHash();

import bcrypt from 'bcrypt';

const password = process.argv[2];
if (!password) {
  console.error('Please provide a password as an argument');
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log('Admin password hash:', hash);
  console.log('\nAdd this to your .env file:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
}); 
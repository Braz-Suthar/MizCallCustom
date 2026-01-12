#!/usr/bin/env node

/**
 * Generate bcrypt hash for admin password
 * Usage: node scripts/generate_admin_hash.js <password>
 */

import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Password is required');
  console.log('\nUsage: node generate_admin_hash.js <password>');
  console.log('Example: node generate_admin_hash.js MySecurePassword123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Error: Password must be at least 8 characters');
  process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('❌ Error generating hash:', err);
    process.exit(1);
  }

  console.log('\n✅ Password hash generated successfully!\n');
  console.log('Add this to your backend .env file:\n');
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n📋 Or copy just the hash:');
  console.log(hash);
  console.log('');
});

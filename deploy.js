#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying Bingo App to Vercel...\n');

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
  console.error('❌ .env.local file not found!');
  console.log('Create .env.local with your Supabase credentials');
  process.exit(1);
}

try {
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Build the project
  console.log('🔨 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Deploy to Vercel
  console.log('🚀 Deploying to Vercel...');
  execSync('npx vercel --prod', { stdio: 'inherit' });

  console.log('\n✅ Deployment complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run the database setup script in Supabase');
  console.log('2. Set environment variables in Vercel dashboard');
  console.log('3. Test your app at the provided URL');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
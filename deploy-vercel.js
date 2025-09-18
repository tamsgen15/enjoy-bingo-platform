const { execSync } = require('child_process');

console.log('🚀 Deploying to Vercel...');

try {
  // Build the project
  console.log('📦 Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Deploy to Vercel
  console.log('🌐 Deploying to Vercel...');
  execSync('vercel --prod --yes', { stdio: 'inherit' });
  
  console.log('✅ Deployment successful!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
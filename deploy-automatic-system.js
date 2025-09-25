#!/usr/bin/env node

/**
 * Deployment script for Automatic Number Calling System
 * Run this after implementing all the code changes
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 Deploying Automatic Number Calling System...\n')

// Check if all required files exist
const requiredFiles = [
  'src/lib/AutomaticNumberCaller.ts',
  'src/components/AutoCallerStatus.tsx',
  'supabase/fixed_migration.sql',
  'AUTOMATIC_CALLER_SYSTEM.md'
]

console.log('📋 Checking required files...')
let allFilesExist = true

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are created.')
  process.exit(1)
}

// Check audio directory
const audioDir = path.join(__dirname, 'public/audio/amharic')
console.log('\n🔊 Checking audio directory...')

if (fs.existsSync(audioDir)) {
  const audioFiles = fs.readdirSync(audioDir)
  const requiredAudioFiles = [
    'game-started.mp3',
    'b.mp3', 'i.mp3', 'n.mp3', 'g.mp3', 'o.mp3',
    ...Array.from({length: 75}, (_, i) => `${i + 1}.mp3`)
  ]
  
  const missingAudio = requiredAudioFiles.filter(file => !audioFiles.includes(file))
  
  if (missingAudio.length === 0) {
    console.log(`✅ All ${requiredAudioFiles.length} audio files present`)
  } else {
    console.log(`⚠️  Missing ${missingAudio.length} audio files:`)
    missingAudio.slice(0, 10).forEach(file => console.log(`   - ${file}`))
    if (missingAudio.length > 10) {
      console.log(`   ... and ${missingAudio.length - 10} more`)
    }
    console.log('   System will fall back to speech synthesis for missing files')
  }
} else {
  console.log('⚠️  Audio directory not found - system will use speech synthesis')
}

// Check package.json dependencies
console.log('\n📦 Checking dependencies...')
const packageJsonPath = path.join(__dirname, 'package.json')

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const requiredDeps = ['next', 'react', '@supabase/supabase-js']
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}`)
    } else {
      console.log(`❌ ${dep} - Please install: npm install ${dep}`)
    }
  })
} else {
  console.log('❌ package.json not found')
}

// Deployment checklist
console.log('\n📋 Deployment Checklist:')
console.log('1. ✅ Code files created')
console.log('2. ⚠️  Run database migration: supabase/fixed_migration.sql')
console.log('3. ⚠️  Ensure audio files are uploaded to /public/audio/amharic/')
console.log('4. ⚠️  Test the system with a complete game flow')
console.log('5. ⚠️  Deploy to production environment')

console.log('\n🎯 Key Features Implemented:')
console.log('• Fully automatic number calling (no manual buttons)')
console.log('• Perfect 3-second intervals between calls')
console.log('• Synchronized voice announcements')
console.log('• Proper "Game Started" announcement timing')
console.log('• Queue-based audio system (no overlapping)')
console.log('• Enhanced error handling and recovery')
console.log('• Real-time status indicators')

console.log('\n🔧 Next Steps:')
console.log('1. Run the database migration in Supabase')
console.log('2. Upload audio files to the public directory')
console.log('3. Test the complete game flow')
console.log('4. Deploy to your hosting platform')

console.log('\n✨ Automatic Number Calling System is ready!')
console.log('📖 See AUTOMATIC_CALLER_SYSTEM.md for detailed documentation')
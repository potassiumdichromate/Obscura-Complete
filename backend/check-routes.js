// File: check-routes.js
// Diagnostic tool to check if all routes are properly set up

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Checking Route Configuration...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const checks = {
  passed: [],
  failed: []
};

// Check 1: verificationRoutes.js exists
console.log('[1/5] Checking verificationRoutes.js...');
const verificationRoutesPath = path.join(__dirname, 'src', 'routes', 'verificationRoutes.js');
if (fs.existsSync(verificationRoutesPath)) {
  console.log('      ✅ File exists at src/routes/verificationRoutes.js');
  checks.passed.push('verificationRoutes.js exists');
} else {
  console.log('      ❌ MISSING: src/routes/verificationRoutes.js');
  checks.failed.push('verificationRoutes.js missing');
}

// Check 2: verificationController.js exists
console.log('[2/5] Checking verificationController.js...');
const verificationControllerPath = path.join(__dirname, 'src', 'controllers', 'verificationController.js');
if (fs.existsSync(verificationControllerPath)) {
  console.log('      ✅ File exists at src/controllers/verificationController.js');
  checks.passed.push('verificationController.js exists');
} else {
  console.log('      ❌ MISSING: src/controllers/verificationController.js');
  checks.failed.push('verificationController.js missing');
}

// Check 3: server.js imports verificationRoutes
console.log('[3/5] Checking server.js imports...');
const serverPath = path.join(__dirname, 'src', 'server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (serverContent.includes("require('./routes/verificationRoutes')")) {
    console.log('      ✅ server.js imports verificationRoutes');
    checks.passed.push('server.js imports verificationRoutes');
  } else {
    console.log('      ❌ server.js does NOT import verificationRoutes');
    checks.failed.push('server.js missing import');
  }
  
  if (serverContent.includes("/api/v1/verification")) {
    console.log('      ✅ server.js registers /api/v1/verification route');
    checks.passed.push('server.js registers route');
  } else {
    console.log('      ❌ server.js does NOT register /api/v1/verification');
    checks.failed.push('server.js missing route registration');
  }
} else {
  console.log('      ❌ server.js not found!');
  checks.failed.push('server.js not found');
}

// Check 4: MongoDB models exist
console.log('[4/5] Checking MongoDB models...');
const modelsToCheck = ['Property.js', 'Offer.js', 'VerificationHistory.js'];
modelsToCheck.forEach(model => {
  const modelPath = path.join(__dirname, 'src', 'models', model);
  if (fs.existsSync(modelPath)) {
    console.log(`      ✅ ${model} exists`);
    checks.passed.push(`${model} exists`);
  } else {
    console.log(`      ❌ ${model} missing`);
    checks.failed.push(`${model} missing`);
  }
});

// Check 5: mongodb.js config exists
console.log('[5/5] Checking mongodb.js config...');
const mongoConfigPath = path.join(__dirname, 'src', 'config', 'mongodb.js');
if (fs.existsSync(mongoConfigPath)) {
  console.log('      ✅ mongodb.js exists at src/config/mongodb.js');
  checks.passed.push('mongodb.js exists');
} else {
  console.log('      ❌ MISSING: src/config/mongodb.js');
  checks.failed.push('mongodb.js missing');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Summary
console.log('📊 SUMMARY\n');
console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`❌ Failed: ${checks.failed.length}\n`);

if (checks.failed.length > 0) {
  console.log('🔧 ISSUES FOUND:\n');
  checks.failed.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log('\n');
  
  // Provide solutions
  console.log('💡 SOLUTIONS:\n');
  
  if (checks.failed.includes('verificationRoutes.js missing')) {
    console.log('   → Copy verificationRoutes.js to src/routes/');
    console.log('     (Use verificationRoutes-fixed.js from outputs)\n');
  }
  
  if (checks.failed.includes('verificationController.js missing')) {
    console.log('   → Copy verificationController-mongodb.js to src/controllers/verificationController.js');
    console.log('     (Rename it to verificationController.js)\n');
  }
  
  if (checks.failed.includes('server.js missing import')) {
    console.log('   → Add to server.js (near other route imports):');
    console.log('     const verificationRoutes = require(\'./routes/verificationRoutes\');\n');
  }
  
  if (checks.failed.includes('server.js missing route registration')) {
    console.log('   → Add to server.js (in routes section):');
    console.log('     app.use(`${API_PREFIX}/verification`, verificationRoutes);\n');
  }
  
  if (checks.failed.some(f => f.includes('.js exists'))) {
    console.log('   → Copy missing model files to src/models/');
    console.log('     (Property.js, Offer.js, VerificationHistory.js)\n');
  }
  
  if (checks.failed.includes('mongodb.js missing')) {
    console.log('   → Copy mongodb-fixed.js to src/config/mongodb.js\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
} else {
  console.log('🎉 All checks passed! Configuration looks good.\n');
  console.log('💡 If you\'re still getting 404 errors:');
  console.log('   1. Restart the server (Ctrl+C then npm start)');
  console.log('   2. Check for syntax errors in the files');
  console.log('   3. Make sure MongoDB is connected\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
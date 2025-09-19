const { spawn } = require('child_process');
const path = require('path');

// Simple test runner since we can't easily install jest
async function runTests() {
  console.log('🔧 Compiling TypeScript...');

  // First compile the TypeScript
  const tsc = spawn('npx', ['tsc'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  tsc.on('close', (code) => {
    if (code === 0) {
      console.log('✅ TypeScript compilation successful');
      console.log('🧪 Running basic functionality test...');

      // Run a basic test
      const node = spawn('node', ['-e', `
        const { DeterministicEstimator, defaultRules, sampleInputs } = require('./dist/index.js');

        try {
          console.log('Creating estimator with default rules...');
          const rules = defaultRules.pricingRules;
          const handicaps = defaultRules.locationHandicaps;
          const estimator = new DeterministicEstimator(rules, handicaps);

          console.log('Testing with studio local move...');
          const input = sampleInputs.studioLocal;
          const result = estimator.calculateEstimate(input, 'test-user');

          console.log('✅ Basic calculation successful');
          console.log('Final Price:', '$' + result.calculations.finalPrice);
          console.log('Rules Applied:', result.calculations.appliedRules.length);
          console.log('Handicaps Applied:', result.calculations.locationHandicaps.length);
          console.log('Hash:', result.metadata.hash.substring(0, 8) + '...');

          // Test determinism
          const result2 = estimator.calculateEstimate(input, 'test-user');
          if (result.calculations.finalPrice === result2.calculations.finalPrice &&
              result.metadata.hash === result2.metadata.hash) {
            console.log('✅ Deterministic behavior confirmed');
          } else {
            console.log('❌ Deterministic behavior failed');
            process.exit(1);
          }

          // Test validation
          const validation = estimator.validateInput(input);
          if (validation.valid) {
            console.log('✅ Input validation passed');
          } else {
            console.log('❌ Input validation failed:', validation.errors);
            process.exit(1);
          }

          console.log('\\n🎉 All basic tests passed!');

        } catch (error) {
          console.error('❌ Test failed:', error.message);
          process.exit(1);
        }
      `], {
        cwd: __dirname,
        stdio: 'inherit'
      });

      node.on('close', (testCode) => {
        if (testCode === 0) {
          console.log('\\n✅ Deterministic estimator implementation complete!');
        } else {
          console.log('\\n❌ Tests failed');
          process.exit(1);
        }
      });
    } else {
      console.error('❌ TypeScript compilation failed');
      process.exit(1);
    }
  });
}

runTests();
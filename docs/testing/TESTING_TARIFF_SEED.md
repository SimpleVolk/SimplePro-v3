# Testing Tariff Settings Seed

## Quick Test Instructions

### Prerequisites

1. **MongoDB Running**
   ```bash
   # Start MongoDB (via Docker)
   npm run docker:dev
   ```

2. **Environment Variables**
   ```bash
   # Ensure .env file has MongoDB connection
   MONGODB_URI=mongodb://localhost:27017/simplepro
   ```

## Test Method 1: CLI Seeding

### Basic Seed Test

```bash
# Run the seeder
npm run db:seed:tariffs
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════════╗
║           SimplePro - Tariff Settings Seeder                      ║
╚════════════════════════════════════════════════════════════════════╝

🔌 Connecting to MongoDB...
   URI: mongodb://localhost:27017/simplepro
✅ Connected to MongoDB

🌱 Creating default tariff settings...

✅ Default tariff settings created successfully
   ID: [generated-id]
   Name: Default Tariff Settings
   Version: 1.0.0
   Status: active

📊 Seeded Data Summary:
   ├─ Hourly Rates: 10 crew sizes configured
   ├─ Crew Abilities: 10 crew capacities
   ├─ Packing Rates: 5 rate configurations
   ├─ Materials: 14 items
   ├─ Move Sizes: 21 categories
   ├─ Room Sizes: 7 room types
   ├─ Handicaps: 3 access difficulty types
   ├─ Distance Rates: 4 distance tiers
   └─ Pricing Methods: 5 methods configured

🎯 Active Items:
   ├─ Materials: 14/14
   ├─ Handicaps: 3/3
   └─ Move Sizes: 21/21

💰 Pricing Configuration:
   ├─ Hourly Rates: Enabled
   ├─ Packing Rates: Enabled
   ├─ Auto Pricing: Enabled
   ├─ Max Hours/Job: 10
   ├─ Weekend Surcharge: 10%
   └─ Holiday Surcharge: 15%

✅ All validation checks passed

📈 Complete Statistics:
[JSON statistics output]

╔════════════════════════════════════════════════════════════════════╗
║                    Seeding Completed Successfully                  ║
╚════════════════════════════════════════════════════════════════════╝

Next Steps:
  1. Start the API server: npm run dev
  2. Access the tariff settings via API or web interface
  3. Customize pricing rules as needed for your business

🔌 Disconnecting from MongoDB...
✅ Disconnected from MongoDB
```

### Test Reset Functionality

```bash
# Run seeder again (should skip)
npm run db:seed:tariffs
```

**Expected Output:**
```
⚠️  Default tariff settings already exist

Options:
  1. Use RESET_TARIFFS=true to delete and recreate
  2. Manually delete the existing tariff from MongoDB
  3. Skip seeding (recommended if tariff has custom modifications)

📋 Existing Tariff Info:
   ID: [existing-id]
   Version: 1.0.0
   Status: active
   Created: [timestamp]
   Updated: [timestamp]
```

### Test Reset and Recreate

```bash
# Delete and recreate
npm run db:seed:tariffs:reset
```

**Expected Output:**
```
🗑️  Deleting existing default tariff settings...
✅ Existing tariff deleted

🌱 Seeding default tariff settings...
[... full seeding output ...]
```

## Test Method 2: Automatic Seeding on Startup

### Enable Auto-Seeding

1. **Edit `.env` file:**
   ```bash
   SEED_DATA=true
   ```

2. **Start API:**
   ```bash
   npm run dev:api
   ```

3. **Check Logs:**
   ```
   [Bootstrap] ✓ Company settings initialized
   [Bootstrap] 🌱 Seeding tariff settings...
   [TariffSettingsSeeder] 🌱 Starting tariff settings seed process...
   [TariffSettingsSeeder] ✅ Default tariff settings created successfully
   [Bootstrap] ✓ Tariff settings seeded successfully
   ```

### Test Skip on Existing Tariff

1. **Start API again (with same database):**
   ```bash
   npm run dev:api
   ```

2. **Check Logs:**
   ```
   [Bootstrap] ✓ Company settings initialized
   [Bootstrap] 🌱 Seeding tariff settings...
   [TariffSettingsSeeder] ✅ Default tariff settings already exist
   [Bootstrap] ✓ Default tariff settings already exist (skipping seed)
   ```

## Test Method 3: Programmatic Seeding

### Create Test Script

Create `test-seed.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TariffSettingsSeeder } from './database/seeders/tariff-settings.seeder';

async function testSeed() {
  const app = await NestFactory.create(AppModule);
  const seeder = app.get(TariffSettingsSeeder);

  console.log('Testing seed...');
  await seeder.seed();

  console.log('\nChecking existence...');
  const hasDefault = await seeder.hasDefaultTariff();
  console.log(`Has default tariff: ${hasDefault}`);

  console.log('\nGetting statistics...');
  const stats = await seeder.getStatistics();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\nValidating...');
  const isValid = await seeder.validate();
  console.log(`Validation passed: ${isValid}`);

  await app.close();
}

testSeed();
```

### Run Test
```bash
ts-node apps/api/src/test-seed.ts
```

## Test Method 4: API Verification

### Start API and Check Data

1. **Start API:**
   ```bash
   npm run dev:api
   ```

2. **Get Tariff Settings (requires auth):**
   ```bash
   # Login first
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"Admin123!"}'

   # Save the access token

   # Get tariff settings
   curl http://localhost:3001/api/tariff-settings \
     -H "Authorization: Bearer [access-token]"
   ```

3. **Verify Data:**
   - Check that default tariff exists
   - Verify materials count (14)
   - Verify move sizes count (21)
   - Verify room sizes count (7)
   - Verify handicaps count (3)

## Test Method 5: Database Direct Verification

### MongoDB Shell Verification

```bash
# Connect to MongoDB
mongosh

# Use simplepro database
use simplepro

# Count tariff settings
db.tariff_settings.countDocuments({ name: "Default Tariff Settings" })
# Expected: 1

# View tariff structure
db.tariff_settings.findOne({ name: "Default Tariff Settings" })

# Check materials count
db.tariff_settings.findOne(
  { name: "Default Tariff Settings" },
  { "materials": 1 }
).materials.length
# Expected: 14

# Check move sizes count
db.tariff_settings.findOne(
  { name: "Default Tariff Settings" },
  { "moveSizes": 1 }
).moveSizes.length
# Expected: 21

# Check hourly rates
db.tariff_settings.findOne(
  { name: "Default Tariff Settings" },
  { "hourlyRates.rates": 1 }
)
# Expected: 10 rates

# View specific material
db.tariff_settings.findOne(
  { name: "Default Tariff Settings" },
  { "materials": { $elemMatch: { name: "Small Box" } } }
)

# View specific move size
db.tariff_settings.findOne(
  { name: "Default Tariff Settings" },
  { "moveSizes": { $elemMatch: { name: "Studio Apartment" } } }
)
```

## Test Method 6: Unit Tests

### Run Seed Tests

```bash
# Run all API tests
npm run test:api

# Run only seed tests
cd apps/api
npm test -- seed-tariff-settings.spec.ts
```

**Expected Output:**
```
PASS  src/tariff-settings/seed-data/seed-tariff-settings.spec.ts
  Tariff Settings Seed
    defaultTariffData
      ✓ should have correct metadata
      ✓ should have hourly rates configured
      ✓ should have valid minimum hours
      ✓ should have hourly rates for all crew sizes
      ✓ should have crew abilities matching hourly rates
      ✓ should have packing rates configured
      ✓ should have auto pricing configured
      ✓ should have materials configured
      ✓ should have all materials active
      ✓ should have move sizes configured
      ✓ should have room sizes configured
      ✓ should have handicaps configured
      ✓ should have distance rates configured
      ✓ should have pricing methods configured
      ✓ should have audit log entry
    validateSeededTariff
      ✓ should validate correct tariff data
      ✓ should detect missing hourly rates
      ✓ should detect crew ability mismatch
      ✓ should detect missing materials
      ✓ should detect missing default pricing method
    getTariffStatistics
      ✓ should return complete statistics
      ✓ should count active items correctly
      ✓ should count materials by category
      ✓ should count handicaps by category
    Data Integrity
      ✓ should have unique IDs for all materials
      ✓ should have unique IDs for all move sizes
      ✓ should have unique IDs for all room sizes
      ✓ should have unique IDs for all handicaps
      ✓ should have non-negative rates
      ✓ should have valid crew sizes
      ✓ should have valid move size ranges
      ✓ should have valid handicap percentages

Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
```

## Validation Checklist

After seeding, verify the following:

### ✅ Metadata
- [ ] Name: "Default Tariff Settings"
- [ ] Version: "1.0.0"
- [ ] Status: "active"
- [ ] isActive: true
- [ ] isArchived: false

### ✅ Hourly Rates
- [ ] 10 crew sizes (1-10)
- [ ] All rates > 0
- [ ] Minimum hours: weekday=2, weekend=3
- [ ] Crew abilities: 10 entries

### ✅ Packing Rates
- [ ] 5 rate configurations
- [ ] All rates > 0

### ✅ Auto Pricing
- [ ] Enabled: true
- [ ] Max hours: 10
- [ ] Weekend surcharge: 10%
- [ ] Holiday surcharge: 15%

### ✅ Materials
- [ ] Total: 14 items
- [ ] All active
- [ ] Categories: box, packing, protection, specialty
- [ ] SKU codes present

### ✅ Move Sizes
- [ ] Total: 21 categories
- [ ] All active
- [ ] Valid ranges (min < max)
- [ ] Recommended crew sizes (1-6)

### ✅ Room Sizes
- [ ] Total: 7 types
- [ ] All active
- [ ] Positive cubic feet and weight values

### ✅ Handicaps
- [ ] Total: 3 active
- [ ] Categories: stairs, elevator, access
- [ ] Values: 9%, 18%, 9%

### ✅ Distance Rates
- [ ] Total: 4 tiers
- [ ] All active
- [ ] Valid mile ranges

### ✅ Pricing Methods
- [ ] Total: 5 methods
- [ ] At least 1 default
- [ ] At least 1 enabled

## Troubleshooting

### Issue: Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Start MongoDB
npm run docker:dev

# Verify MongoDB is running
docker ps | grep mongo
```

### Issue: Environment Variable Missing

**Symptoms:**
```
❌ Error: MONGODB_URI or DATABASE_URL environment variable is required
```

**Solution:**
```bash
# Create/update .env file
echo "MONGODB_URI=mongodb://localhost:27017/simplepro" >> .env
```

### Issue: Tariff Already Exists

**Symptoms:**
```
⚠️  Default tariff settings already exist
```

**Solution:**
```bash
# Option 1: Skip (recommended)
# Do nothing, existing tariff is preserved

# Option 2: Reset
npm run db:seed:tariffs:reset

# Option 3: Manual delete
mongosh
use simplepro
db.tariff_settings.deleteOne({ name: "Default Tariff Settings" })
```

### Issue: Validation Warnings

**Symptoms:**
```
⚠️  Validation Warnings:
   - No default pricing method configured
```

**Solution:**
- Check seed data in `default-tariff-data.ts`
- Ensure at least one pricing method has `isDefault: true`
- Re-run seed after fixing

## Success Indicators

✅ **Successful Seed:**
- Exit code 0
- "Seeding Completed Successfully" message
- All validation checks passed
- Statistics show correct counts
- MongoDB contains default tariff

✅ **Successful Skip:**
- Exit code 0
- "already exist" message
- Existing tariff info displayed

✅ **Successful API Integration:**
- API starts without errors
- Tariff endpoints return data
- Web interface displays tariff settings

## Next Steps After Successful Seeding

1. **Access Tariff Settings:**
   - Via API: `GET /api/tariff-settings`
   - Via Web: Settings → Tariffs section

2. **Customize Pricing:**
   - Update hourly rates
   - Add custom materials
   - Adjust handicaps
   - Configure pricing methods

3. **Test Estimate Calculations:**
   - Create test estimates
   - Verify pricing accuracy
   - Check rule applications

4. **Monitor Usage:**
   - Track which configurations are used
   - Adjust based on business needs
   - Update rates seasonally

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-29
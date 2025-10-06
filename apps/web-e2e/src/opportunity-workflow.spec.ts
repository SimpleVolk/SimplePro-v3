import { test, expect } from '@playwright/test';

test.describe('Opportunity Creation and Estimate Workflow', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post(
      'http://localhost:3001/api/auth/login',
      {
        data: {
          username: 'admin',
          password: 'Admin123!',
        },
      },
    );

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.accessToken;
  });

  test.beforeEach(async ({ page, context }) => {
    // Set auth token in localStorage
    await context.addCookies([
      {
        name: 'auth_token',
        value: authToken,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3009');
  });

  test('should create customer and opportunity with complete estimate', async ({
    page,
  }) => {
    // Navigate to customers page
    await page.click('text=Customers');
    await expect(page).toHaveURL(/.*customers/);

    // Click "New Customer" button
    await page.click('button:has-text("New Customer")');

    // Fill customer form
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Customer');
    await page.fill('input[name="email"]', 'test.customer@example.com');
    await page.fill('input[name="phone"]', '555-9999');

    // Select customer type
    await page.selectOption('select[name="type"]', 'residential');

    // Fill address
    await page.fill('input[name="address.street"]', '999 Test Ave');
    await page.fill('input[name="address.city"]', 'San Francisco');
    await page.fill('input[name="address.state"]', 'CA');
    await page.fill('input[name="address.zipCode"]', '94105');

    // Submit customer form
    await page.click('button[type="submit"]:has-text("Create Customer")');

    // Wait for success message
    await expect(
      page.locator('text=Customer created successfully'),
    ).toBeVisible({
      timeout: 5000,
    });

    // Navigate to opportunities
    await page.click('text=Opportunities');
    await expect(page).toHaveURL(/.*opportunities/);

    // Create new opportunity
    await page.click('button:has-text("New Opportunity")');

    // Select customer from dropdown
    await page.selectOption('select[name="customerId"]', /Test Customer/);

    // Select service type
    await page.click('input[type="radio"][value="local"]');

    // Fill move details
    await page.fill('input[name="estimatedMoveDate"]', '2025-10-15');

    // Pickup location
    await page.fill(
      'input[name="pickupAddress"]',
      '999 Test Ave, San Francisco, CA 94105',
    );
    await page.selectOption('select[name="pickupAccessDifficulty"]', 'medium');
    await page.fill('input[name="pickupStairs"]', '2');

    // Delivery location
    await page.fill(
      'input[name="deliveryAddress"]',
      '123 Oak St, San Francisco, CA 94102',
    );
    await page.selectOption('select[name="deliveryAccessDifficulty"]', 'easy');
    await page.fill('input[name="deliveryStairs"]', '0');

    // Add inventory - Living Room
    await page.click('button:has-text("Add Room")');
    await page.selectOption('select[name="roomType"]', 'living_room');

    // Add items
    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="items[0].name"]', 'Sofa');
    await page.fill('input[name="items[0].quantity"]', '1');
    await page.fill('input[name="items[0].weight"]', '150');
    await page.fill('input[name="items[0].cubicFeet"]', '50');

    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="items[1].name"]', 'TV');
    await page.fill('input[name="items[1].quantity"]', '1');
    await page.fill('input[name="items[1].weight"]', '30');
    await page.fill('input[name="items[1].cubicFeet"]', '10');

    // Add special items
    await page.check('input[type="checkbox"][value="piano"]');

    // Add additional services
    await page.check('input[type="checkbox"][value="packing"]');
    await page.check('input[type="checkbox"][value="assembly"]');

    // Calculate estimate
    await page.click('button:has-text("Calculate Estimate")');

    // Wait for estimate results
    await expect(page.locator('text=Estimate Results')).toBeVisible({
      timeout: 10000,
    });

    // Verify estimate components
    await expect(page.locator('text=Final Price:')).toBeVisible();
    await expect(page.locator('[data-testid="final-price"]')).toContainText(
      '$',
    );

    // Verify applied rules
    await expect(page.locator('text=Applied Pricing Rules')).toBeVisible();

    // Verify location handicaps
    await expect(page.locator('text=Location Adjustments')).toBeVisible();

    // Verify deterministic hash
    await expect(page.locator('[data-testid="estimate-hash"]')).toBeVisible();

    // Save opportunity with estimate
    await page.click('button:has-text("Save Opportunity")');

    // Verify success
    await expect(
      page.locator('text=Opportunity created successfully'),
    ).toBeVisible({
      timeout: 5000,
    });

    // Verify opportunity appears in list
    await expect(page.locator('text=Test Customer')).toBeVisible();
    await expect(page.locator('text=Status: new')).toBeVisible();
  });

  test('should convert opportunity to job', async ({ page }) => {
    // Navigate to opportunities
    await page.goto('http://localhost:3009/opportunities');

    // Find the test opportunity
    await page.click('text=Test Customer >> .. >> button:has-text("View")');

    // Wait for opportunity details
    await expect(
      page.locator('h1:has-text("Opportunity Details")'),
    ).toBeVisible();

    // Click "Convert to Job" button
    await page.click('button:has-text("Convert to Job")');

    // Fill job details
    await page.fill('input[name="scheduledDate"]', '2025-10-20');
    await page.fill('input[name="scheduledTime"]', '08:00');
    await page.fill('input[name="estimatedCrewSize"]', '3');

    // Submit job creation
    await page.click('button[type="submit"]:has-text("Create Job")');

    // Verify success
    await expect(page.locator('text=Job created successfully')).toBeVisible({
      timeout: 5000,
    });

    // Verify redirect to jobs page
    await expect(page).toHaveURL(/.*jobs/);

    // Verify job appears in list
    await expect(page.locator('text=Test Customer')).toBeVisible();
    await expect(page.locator('text=Status: scheduled')).toBeVisible();
  });

  test('should update settings and recalculate estimate with new rates', async ({
    page,
  }) => {
    // Navigate to settings
    await page.goto('http://localhost:3009/settings');

    // Go to pricing settings
    await page.click('text=Pricing');
    await page.click('text=Base Rates');

    // Update hourly rate
    const currentRate = await page.inputValue('input[name="hourlyRate"]');
    const newRate = (parseFloat(currentRate) + 5).toString();

    await page.fill('input[name="hourlyRate"]', newRate);

    // Save settings
    await page.click('button:has-text("Save Changes")');

    // Verify success message
    await expect(
      page.locator('text=Settings updated successfully'),
    ).toBeVisible({
      timeout: 5000,
    });

    // Navigate back to opportunities
    await page.goto('http://localhost:3009/opportunities');

    // Create new estimate with updated rates
    await page.click('button:has-text("New Opportunity")');

    // Fill minimal form
    await page.selectOption('select[name="customerId"]', { index: 1 });
    await page.click('input[type="radio"][value="local"]');
    await page.fill('input[name="estimatedMoveDate"]', '2025-10-25');
    await page.fill('input[name="estimatedHours"]', '5');
    await page.fill('input[name="estimatedCrewSize"]', '2');

    // Calculate estimate
    await page.click('button:has-text("Calculate Estimate")');

    // Verify new rate is applied
    await expect(page.locator('[data-testid="hourly-rate"]')).toContainText(
      newRate,
    );
  });

  test('should filter and search opportunities', async ({ page }) => {
    await page.goto('http://localhost:3009/opportunities');

    // Filter by status
    await page.selectOption('select[name="statusFilter"]', 'new');

    // Verify filtered results
    await expect(page.locator('[data-testid="opportunity-card"]')).toHaveCount(
      1,
      {
        timeout: 3000,
      },
    );

    // Search by customer name
    await page.fill('input[name="search"]', 'Test Customer');
    await page.press('input[name="search"]', 'Enter');

    // Verify search results
    await expect(page.locator('text=Test Customer')).toBeVisible();

    // Clear filters
    await page.click('button:has-text("Clear Filters")');

    // Verify all opportunities shown
    await expect(page.locator('[data-testid="opportunity-card"]')).toHaveCount(
      1,
      {
        timeout: 3000,
      },
    );
  });

  test('should verify real-time estimate recalculation on changes', async ({
    page,
  }) => {
    await page.goto('http://localhost:3009/opportunities/new');

    // Fill basic details
    await page.selectOption('select[name="customerId"]', { index: 1 });
    await page.click('input[type="radio"][value="local"]');

    // Set initial values
    await page.fill('input[name="estimatedHours"]', '4');
    await page.fill('input[name="estimatedCrewSize"]', '2');

    // Calculate initial estimate
    await page.click('button:has-text("Calculate Estimate")');
    await page.waitForSelector('[data-testid="final-price"]');

    const initialPrice = page;

    // Change crew size
    await page.fill('input[name="estimatedCrewSize"]', '3');

    // Recalculate
    await page.click('button:has-text("Calculate Estimate")');
    await page.waitForTimeout(1000); // Wait for recalculation

    const updatedPrice = await page.textContent('[data-testid="final-price"]');

    // Verify price changed
    await expect(initialPrice).not.toHaveText(
      '[data-testid="final-price"]',
      updatedPrice,
    );
  });

  test('should validate required fields on opportunity form', async ({
    page,
  }) => {
    await page.goto('http://localhost:3009/opportunities/new');

    // Try to submit without filling required fields
    await page.click('button:has-text("Calculate Estimate")');

    // Verify validation errors
    await expect(page.locator('text=Customer is required')).toBeVisible();
    await expect(page.locator('text=Service type is required')).toBeVisible();
    await expect(page.locator('text=Move date is required')).toBeVisible();

    // Fill one field and verify error disappears
    await page.selectOption('select[name="customerId"]', { index: 1 });

    // Customer error should disappear
    await expect(page.locator('text=Customer is required')).not.toBeVisible({
      timeout: 2000,
    });
  });
});

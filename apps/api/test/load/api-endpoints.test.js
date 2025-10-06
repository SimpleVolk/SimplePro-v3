import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const customerCreations = new Counter('customer_creations');
const jobCreations = new Counter('job_creations');
const estimateCalculations = new Counter('estimate_calculations');
const apiErrors = new Counter('api_errors');
const estimateCalculationTime = new Trend('estimate_calculation_time');
const jobQueryTime = new Trend('job_query_time');
const errorRate = new Rate('error_rate');

export let options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 for 5 minutes
    { duration: '1m', target: 200 }, // Spike to 200 users
    { duration: '3m', target: 200 }, // Hold at 200
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    'http_req_duration{endpoint:estimate}': ['p(95)<1000'], // Estimates < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    error_rate: ['rate<0.01'], // Custom error rate < 1%
    estimate_calculation_time: ['p(95)<800'], // Estimate calculations < 800ms
    job_query_time: ['p(95)<200'], // Job queries < 200ms
  },
};

const API_BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const JWT_TOKEN = __ENV.JWT_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${JWT_TOKEN}`,
};

export function setup() {
  // Login to get a valid token if not provided
  if (!JWT_TOKEN) {
    const loginRes = http.post(
      `${API_BASE_URL}/api/auth/login`,
      JSON.stringify({
        username: 'admin',
        password: 'Admin123!',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (loginRes.status === 200) {
      const token = loginRes.json('accessToken');
      return { token };
    }
  }
  return { token: JWT_TOKEN };
}

export default function (data) {
  const token = data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Use virtual user ID to create unique data
  const vuId = __VU;
  const iterationId = __ITER;

  group('Customer Management', () => {
    // Create customer
    const customerPayload = JSON.stringify({
      firstName: `LoadTest_${vuId}`,
      lastName: `User_${iterationId}`,
      email: `loadtest_${vuId}_${iterationId}@example.com`,
      phone: `555-${String(vuId).padStart(4, '0')}`,
      type: 'residential',
      status: 'lead',
      leadSource: 'load_test',
      address: {
        street: `${vuId} Test Street`,
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA',
      },
    });

    const createCustomerRes = http.post(
      `${API_BASE_URL}/api/customers`,
      customerPayload,
      { headers: authHeaders, tags: { endpoint: 'customer_create' } },
    );

    const customerCreated = check(createCustomerRes, {
      'customer created successfully': (r) => r.status === 201,
      'customer has ID': (r) => r.json('customerId') !== undefined,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (customerCreated) {
      customerCreations.add(1);
    } else {
      apiErrors.add(1);
      errorRate.add(1);
    }

    const customerId = createCustomerRes.json('customerId');

    if (customerId) {
      // Get customer details
      const getCustomerRes = http.get(
        `${API_BASE_URL}/api/customers/${customerId}`,
        { headers: authHeaders, tags: { endpoint: 'customer_get' } },
      );

      check(getCustomerRes, {
        'customer retrieved successfully': (r) => r.status === 200,
        'customer data matches': (r) => r.json('customerId') === customerId,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });

      // Update customer
      const updatePayload = JSON.stringify({
        status: 'prospect',
        notes: `Updated by load test VU ${vuId} iteration ${iterationId}`,
      });

      const updateCustomerRes = http.patch(
        `${API_BASE_URL}/api/customers/${customerId}`,
        updatePayload,
        { headers: authHeaders, tags: { endpoint: 'customer_update' } },
      );

      check(updateCustomerRes, {
        'customer updated successfully': (r) => r.status === 200,
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
    }
  });

  sleep(0.5);

  group('Estimate Calculation', () => {
    const estimatePayload = JSON.stringify({
      serviceType: 'local',
      weight: 3000 + Math.random() * 5000,
      cubicFeet: 400 + Math.random() * 600,
      pickupLocation: {
        address: '123 Main St, San Francisco, CA 94102',
        accessDifficulty: ['easy', 'medium', 'hard'][
          Math.floor(Math.random() * 3)
        ],
        stairs: Math.floor(Math.random() * 4),
        elevator: Math.random() > 0.5,
      },
      deliveryLocation: {
        address: '456 Oak Ave, San Francisco, CA 94110',
        accessDifficulty: ['easy', 'medium', 'hard'][
          Math.floor(Math.random() * 3)
        ],
        stairs: Math.floor(Math.random() * 3),
        elevator: Math.random() > 0.7,
      },
      specialItems: Math.random() > 0.3 ? ['piano'] : [],
      additionalServices:
        Math.random() > 0.5 ? ['packing', 'assembly'] : ['packing'],
      estimatedCrewSize: 2 + Math.floor(Math.random() * 3),
      estimatedHours: 4 + Math.floor(Math.random() * 8),
    });

    const startEstimate = Date.now();
    const estimateRes = http.post(
      `${API_BASE_URL}/api/estimates/calculate`,
      estimatePayload,
      { headers: authHeaders, tags: { endpoint: 'estimate' } },
    );
    const estimateDuration = Date.now() - startEstimate;

    estimateCalculationTime.add(estimateDuration);

    const estimateSuccess = check(estimateRes, {
      'estimate calculated successfully': (r) => r.status === 200,
      'estimate has price': (r) =>
        r.json('estimate.calculations.finalPrice') > 0,
      'estimate is deterministic': (r) =>
        r.json('estimate.metadata.deterministic') === true,
      'estimate has hash': (r) =>
        r.json('estimate.metadata.hash') !== undefined,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (estimateSuccess) {
      estimateCalculations.add(1);
    } else {
      apiErrors.add(1);
      errorRate.add(1);
    }
  });

  sleep(0.5);

  group('Job Management', () => {
    // Create job
    const jobPayload = JSON.stringify({
      customerId: `customer_${vuId}`,
      serviceType: 'local',
      status: 'scheduled',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      scheduledDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      pickupAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
      deliveryAddress: {
        street: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94110',
      },
      estimatedCost: 1000 + Math.random() * 4000,
      estimatedCrewSize: 2 + Math.floor(Math.random() * 3),
      requiresCDL: Math.random() > 0.5,
    });

    const createJobRes = http.post(`${API_BASE_URL}/api/jobs`, jobPayload, {
      headers: authHeaders,
      tags: { endpoint: 'job_create' },
    });

    const jobCreated = check(createJobRes, {
      'job created successfully': (r) => r.status === 201,
      'job has ID': (r) => r.json('jobId') !== undefined,
      'response time < 400ms': (r) => r.timings.duration < 400,
    });

    if (jobCreated) {
      jobCreations.add(1);
    } else {
      apiErrors.add(1);
      errorRate.add(1);
    }

    const jobId = createJobRes.json('jobId');

    if (jobId) {
      // Query job details
      const startQuery = Date.now();
      const getJobRes = http.get(`${API_BASE_URL}/api/jobs/${jobId}`, {
        headers: authHeaders,
        tags: { endpoint: 'job_get' },
      });
      const queryDuration = Date.now() - startQuery;

      jobQueryTime.add(queryDuration);

      check(getJobRes, {
        'job retrieved successfully': (r) => r.status === 200,
        'job data matches': (r) => r.json('jobId') === jobId,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });

      // Update job status
      const statusUpdateRes = http.patch(
        `${API_BASE_URL}/api/jobs/${jobId}/status`,
        JSON.stringify({ status: 'in_progress' }),
        { headers: authHeaders, tags: { endpoint: 'job_status_update' } },
      );

      check(statusUpdateRes, {
        'job status updated successfully': (r) => r.status === 200,
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
    }
  });

  sleep(0.5);

  group('Job Listing and Search', () => {
    // Get all jobs
    const listJobsRes = http.get(`${API_BASE_URL}/api/jobs`, {
      headers: authHeaders,
      tags: { endpoint: 'job_list' },
    });

    check(listJobsRes, {
      'jobs listed successfully': (r) => r.status === 200,
      'jobs array exists': (r) => Array.isArray(r.json('jobs')),
      'response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Search jobs by status
    const searchJobsRes = http.get(
      `${API_BASE_URL}/api/jobs?status=scheduled&priority=high`,
      { headers: authHeaders, tags: { endpoint: 'job_search' } },
    );

    check(searchJobsRes, {
      'job search successful': (r) => r.status === 200,
      'response time < 250ms': (r) => r.timings.duration < 250,
    });

    // Get weekly calendar
    const weekStart = new Date().toISOString().split('T')[0];
    const calendarRes = http.get(
      `${API_BASE_URL}/api/jobs/calendar/week/${weekStart}`,
      { headers: authHeaders, tags: { endpoint: 'calendar' } },
    );

    check(calendarRes, {
      'calendar retrieved successfully': (r) => r.status === 200,
      'response time < 400ms': (r) => r.timings.duration < 400,
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const stats = {
    total_customers_created: data.metrics.customer_creations?.values.count || 0,
    total_jobs_created: data.metrics.job_creations?.values.count || 0,
    total_estimates_calculated:
      data.metrics.estimate_calculations?.values.count || 0,
    total_api_errors: data.metrics.api_errors?.values.count || 0,
    avg_estimate_time:
      data.metrics.estimate_calculation_time?.values.avg.toFixed(2) || 0,
    p95_estimate_time:
      data.metrics.estimate_calculation_time?.values['p(95)'].toFixed(2) || 0,
    avg_job_query_time: data.metrics.job_query_time?.values.avg.toFixed(2) || 0,
    p95_job_query_time:
      data.metrics.job_query_time?.values['p(95)'].toFixed(2) || 0,
    error_rate: ((data.metrics.error_rate?.values.rate || 0) * 100).toFixed(2),
    http_req_failed_rate: (
      (data.metrics.http_req_failed?.values.rate || 0) * 100
    ).toFixed(2),
  };

  return {
    'load-test-results.json': JSON.stringify(
      { ...data, custom_stats: stats },
      null,
      2,
    ),
    stdout: `
      ============================================
      API Load Test Summary
      ============================================
      Total Customers Created: ${stats.total_customers_created}
      Total Jobs Created: ${stats.total_jobs_created}
      Total Estimates Calculated: ${stats.total_estimates_calculated}
      Total API Errors: ${stats.total_api_errors}

      Estimate Calculation:
        - Avg Time: ${stats.avg_estimate_time}ms
        - P95 Time: ${stats.p95_estimate_time}ms

      Job Query:
        - Avg Time: ${stats.avg_job_query_time}ms
        - P95 Time: ${stats.p95_job_query_time}ms

      Error Rates:
        - Custom Error Rate: ${stats.error_rate}%
        - HTTP Request Failed Rate: ${stats.http_req_failed_rate}%
      ============================================
    `,
  };
}

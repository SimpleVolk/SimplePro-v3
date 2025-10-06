# Lead Automation System - Quick Reference

## 🚀 Quick Start

### Start the System

```bash
# Start MongoDB and infrastructure
npm run docker:dev

# Start API server (includes cron jobs and event system)
npm run dev:api
```

### Seed Default Rules

```typescript
import { seedDefaultFollowUpRules } from './database/seeds/default-follow-up-rules.seed';
import { InjectModel } from '@nestjs/mongoose';
import { FollowUpRule } from './follow-up-rules/schemas/follow-up-rule.schema';

// In your seeding script or bootstrap
await seedDefaultFollowUpRules(followUpRuleModel);
```

## 📍 API Endpoints Cheat Sheet

### Lead Activities

```bash
# Create activity
POST /api/lead-activities
{
  "opportunityId": "...",
  "customerId": "...",
  "activityType": "call",
  "subject": "Follow up call",
  "dueDate": "2025-10-05T10:00:00Z",
  "assignedTo": "userId"
}

# Get pending follow-ups
GET /api/lead-activities/pending

# Get overdue activities
GET /api/lead-activities/overdue

# Complete activity
PATCH /api/lead-activities/:id/complete
{
  "outcome": "successful",
  "metadata": { "phoneDuration": 180 }
}

# Get statistics
GET /api/lead-activities/statistics?userId=optional

# Get timeline
GET /api/lead-activities/timeline/:opportunityId
```

### Follow-up Rules

```bash
# Create automation rule
POST /api/follow-up-rules
{
  "name": "Custom Rule",
  "trigger": {
    "eventType": "opportunity_created",
    "conditions": [
      { "field": "leadSource", "operator": "equals", "value": "website" }
    ]
  },
  "actions": [
    {
      "actionType": "create_activity",
      "delay": 1,
      "activityType": "call",
      "subject": "Follow up",
      "assignTo": "lead_owner"
    }
  ],
  "isActive": true,
  "priority": 5
}

# Test rule
POST /api/follow-up-rules/:ruleId/test
{
  "opportunity": { "leadSource": "website", "priority": "high" },
  "userId": "user123"
}

# List active rules
GET /api/follow-up-rules/active
```

## 🔄 Event Types

| Event                        | When Emitted          | Use Case                 |
| ---------------------------- | --------------------- | ------------------------ |
| `opportunity.created`        | New opportunity saved | Immediate lead follow-up |
| `opportunity.status_changed` | Status updated        | Won/lost workflows       |
| `estimate.created`           | Quote sent            | Post-quote follow-up     |
| `activity.completed`         | Activity marked done  | Outcome-based automation |
| `opportunity.stale_detected` | No activity 7+ days   | Re-engagement            |

## 🎯 Rule Conditions

### Operators

- `equals`: Exact match
- `not_equals`: Not equal
- `contains`: String contains
- `greater_than`: Numeric comparison
- `less_than`: Numeric comparison
- `in`: Value in array
- `not_in`: Value not in array

### Example Conditions

```typescript
// Single condition
{ field: "leadSource", operator: "equals", value: "website" }

// Multiple conditions (AND logic)
[
  { field: "leadSource", operator: "equals", value: "website" },
  { field: "priority", operator: "in", value: ["high", "urgent"] }
]
```

## ⚙️ Action Types

| Action              | Description               | Parameters                             |
| ------------------- | ------------------------- | -------------------------------------- |
| `create_activity`   | Create follow-up activity | activityType, subject, assignTo, delay |
| `send_email`        | Send email (placeholder)  | template, assignTo                     |
| `send_notification` | Send notification         | template, assignTo                     |
| `update_status`     | Update opportunity status | status                                 |
| `assign_sales_rep`  | Assign sales rep          | assignTo                               |
| `create_job`        | Create job record         | jobDetails                             |

## 📅 Cron Jobs Schedule

| Schedule      | Job            | Description                        |
| ------------- | -------------- | ---------------------------------- |
| Every hour    | Overdue check  | Find and notify overdue activities |
| Every 6 hours | Stale check    | Detect inactive opportunities      |
| Every 30 min  | Upcoming check | Remind about activities due soon   |
| Every 15 min  | Rule processor | Event-driven checkpoint            |
| Daily 2 AM    | Cleanup        | Archive old activities             |
| Daily 8 AM    | Summary        | Generate daily report              |

## 🔐 Role Permissions

### Super Admin / Admin

- ✅ Create/edit/delete rules
- ✅ View all activities
- ✅ Access all statistics
- ✅ Delete activities

### Dispatcher

- ✅ View all activities
- ✅ View rules (read-only)
- ❌ Create/edit rules

### Sales

- ✅ View assigned activities only
- ✅ Complete own activities
- ❌ View other users' activities
- ❌ Manage rules

## 🧪 Testing Workflow

### 1. Test Activity Creation

```bash
# Create opportunity
POST /api/opportunities
{
  "customerId": "...",
  "leadSource": "website",
  ...
}

# Verify activity auto-created
GET /api/lead-activities/opportunity/:opportunityId
```

### 2. Test Callback Automation

```bash
# Complete activity with callback outcome
PATCH /api/lead-activities/:id/complete
{
  "outcome": "callback_requested"
}

# Verify follow-up created
GET /api/lead-activities/pending
```

### 3. Test Rule Matching

```bash
# Test without executing
POST /api/follow-up-rules/:ruleId/test
{
  "opportunity": { "leadSource": "website" },
  "userId": "user123"
}

# Response shows if rule would match
{
  "ruleId": "...",
  "matches": true,
  "wouldExecute": true
}
```

## 🐛 Debugging

### Check Logs

```bash
# Look for rule evaluation
"Evaluating X rules for event type: opportunity_created"

# Look for rule matches
"Rule 'New Website Lead Follow-up' matched. Executing actions..."

# Look for activity creation
"Created activity for opportunity XXX, due at 2025-10-05T11:00:00Z"

# Look for cron execution
"Running overdue follow-ups check..."
"Found 5 overdue activities"
```

### Common Issues

**Activities not auto-created?**

- Check if rule is active: `GET /api/follow-up-rules/active`
- Verify event is emitted in service logs
- Check rule conditions match event data
- Test rule manually: `POST /api/follow-up-rules/:id/test`

**Cron jobs not running?**

- Verify ScheduleModule imported in FollowUpSchedulerModule
- Check server logs for cron execution messages
- Manually trigger: `schedulerService.triggerOverdueCheck()`

**Events not triggering?**

- Verify EventEmitterModule imported in AppModule
- Check EventEmitter2 injected in services
- Verify @OnEvent decorators in FollowUpRulesService

## 📊 Activity Types & Outcomes

### Activity Types

- `call`: Phone call
- `email`: Email communication
- `meeting`: In-person or video meeting
- `quote_sent`: Quote/estimate sent
- `follow_up`: General follow-up
- `note`: Internal note
- `status_change`: Status update

### Outcomes

- `successful`: Objective achieved
- `no_answer`: Customer didn't answer
- `voicemail`: Left voicemail
- `callback_requested`: Customer wants callback
- `not_interested`: Customer not interested
- `converted`: Lead converted to job

## 🔧 Configuration

### Environment Variables

```bash
# In .env.local
MONGODB_URI=mongodb://localhost:27017/simplepro
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Default Delays (hours)

- Urgent lead: 0 (immediate)
- Website lead: 1 hour
- Referral lead: 2 hours
- Quote follow-up: 48 hours
- Callback: 24 hours
- Re-engagement: 720 hours (30 days)

## 📈 Performance Tips

### Query Optimization

```typescript
// Use indexes - these are already created
.find({ opportunityId })  // Uses index
.find({ assignedTo, dueDate })  // Uses compound index
.find({ customerId }).sort({ createdAt: -1 })  // Uses index

// Avoid - no index
.find({ description: { $regex: /pattern/ } })  // Slow without text index
```

### Bulk Operations

```typescript
// Instead of multiple creates
for (const activity of activities) {
  await create(activity); // N queries
}

// Use bulk insert
await activityModel.insertMany(activities); // 1 query
```

## 🆘 Support

### Documentation

- **User Guide**: LEAD_TRACKING_SYSTEM.md
- **Architecture**: AUTOMATION_ARCHITECTURE.md
- **Implementation**: LEAD_AUTOMATION_SUMMARY.md
- **This Guide**: QUICK_REFERENCE_LEAD_AUTOMATION.md

### Key Files

- Lead Activities: `apps/api/src/lead-activities/`
- Follow-up Rules: `apps/api/src/follow-up-rules/`
- Scheduler: `apps/api/src/follow-up-scheduler/`
- Default Rules: `apps/api/src/database/seeds/default-follow-up-rules.seed.ts`

### Getting Help

1. Check logs for error messages
2. Review event emission in opportunities.service.ts
3. Test rules with test endpoint
4. Verify MongoDB indexes created
5. Check role permissions for user

---

**Quick Reference Version**: 1.0.0
**Last Updated**: October 1, 2025

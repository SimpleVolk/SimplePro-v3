# Lead Tracking & Follow-up Automation System

## Overview

A comprehensive lead management system with automated follow-up workflows, activity tracking, and conversion funnel analytics for SimplePro-v3 moving company CRM.

## Architecture Components

### 1. Lead Activities Module (`apps/api/src/lead-activities/`)

Tracks all interactions and follow-ups with opportunities and customers.

#### MongoDB Schema (`lead-activity.schema.ts`)

```typescript
LeadActivity {
  activityId: string (UUID, unique)
  opportunityId: string (ref to Opportunity)
  customerId: string (ref to Customer)
  activityType: enum (call, email, meeting, quote_sent, follow_up, note, status_change)
  subject: string
  description: string
  outcome: enum (successful, no_answer, voicemail, callback_requested, not_interested, converted)
  scheduledDate: Date
  completedDate: Date
  dueDate: Date (for follow-ups)
  assignedTo: string (userId)
  completedBy: string (userId)
  metadata: object (phone_duration, email_opened, quote_value, automation_rule_id)
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `activityId` (unique)
- `opportunityId + activityType`
- `customerId + createdAt`
- `assignedTo + dueDate + completedDate` (for overdue tracking)
- `scheduledDate`
- Compound index for finding overdue activities

#### Service Features (`lead-activities.service.ts`)

- **createActivity()** - Log new activity with event emission
- **findByOpportunity()** - Get all activities for an opportunity
- **findByCustomer()** - Get all activities for a customer
- **findPendingFollowUps()** - Get incomplete activities with due dates
- **findOverdueActivities()** - Get activities past due date
- **completeActivity()** - Mark activity as complete with outcome tracking
- **getActivityTimeline()** - Chronological activity history
- **getActivityStats()** - Analytics (response rates, conversion rates, avg response time)
- **scheduleFollowUp()** - Create scheduled follow-up activity

#### REST API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/lead-activities` | Create new activity | admin, dispatcher, sales |
| GET | `/api/lead-activities` | List all activities (filtered by role) | admin, dispatcher, sales |
| GET | `/api/lead-activities/opportunity/:id` | Get activities for opportunity | admin, dispatcher, sales |
| GET | `/api/lead-activities/customer/:id` | Get activities for customer | admin, dispatcher, sales |
| GET | `/api/lead-activities/pending` | Get pending follow-ups | admin, dispatcher, sales |
| GET | `/api/lead-activities/overdue` | Get overdue activities | admin, dispatcher, sales |
| GET | `/api/lead-activities/statistics` | Activity analytics | admin, dispatcher, sales |
| GET | `/api/lead-activities/timeline/:opportunityId` | Chronological timeline | admin, dispatcher, sales |
| GET | `/api/lead-activities/:activityId` | Get single activity | admin, dispatcher, sales |
| PATCH | `/api/lead-activities/:activityId/complete` | Mark activity complete | admin, dispatcher, sales |
| DELETE | `/api/lead-activities/:activityId` | Delete activity | super_admin, admin |

### 2. Follow-up Rules Module (`apps/api/src/follow-up-rules/`)

Automation engine for creating and executing follow-up rules based on events.

#### MongoDB Schema (`follow-up-rule.schema.ts`)

```typescript
FollowUpRule {
  ruleId: string (UUID)
  name: string
  description: string
  trigger: {
    eventType: enum (opportunity_created, quote_sent, activity_completed, status_changed, estimate_created, no_activity)
    conditions: array of {
      field: string
      operator: equals | not_equals | contains | greater_than | less_than | in | not_in
      value: any
    }
  }
  actions: array of {
    actionType: enum (create_activity, send_email, update_status, assign_sales_rep, create_job, send_notification)
    delay: number (hours)
    template: string
    assignTo: string (userId or 'round_robin' or 'lead_owner')
    activityType: string
    subject: string
    description: string
    metadata: object
  }
  isActive: boolean
  priority: number (lower = higher priority)
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `ruleId` (unique)
- `isActive + priority`
- `trigger.eventType`

#### Service Features (`follow-up-rules.service.ts`)

- **createRule()** - Create automation rule
- **findActiveRules()** - Get all active automation rules for event type
- **evaluateAndExecuteRules()** - Check if event triggers any rules and execute
- **evaluateConditions()** - Evaluate rule conditions against event data
- **executeActions()** - Perform rule actions (create activities, send notifications)
- **testRule()** - Simulate rule execution without actually executing

**Event Listeners:**
- `@OnEvent('opportunity.created')` - Triggers when new opportunity created
- `@OnEvent('opportunity.status_changed')` - Triggers on status changes
- `@OnEvent('estimate.created')` - Triggers when estimate/quote sent
- `@OnEvent('activity.completed')` - Triggers when activity is completed

#### REST API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/follow-up-rules` | Create automation rule | super_admin, admin |
| GET | `/api/follow-up-rules` | List all rules | admin, dispatcher |
| GET | `/api/follow-up-rules/active` | Get active rules | admin, dispatcher |
| GET | `/api/follow-up-rules/:ruleId` | Get single rule | admin, dispatcher |
| PATCH | `/api/follow-up-rules/:ruleId` | Update rule | super_admin, admin |
| DELETE | `/api/follow-up-rules/:ruleId` | Delete rule | super_admin, admin |
| POST | `/api/follow-up-rules/:ruleId/test` | Test rule with sample data | super_admin, admin |

### 3. Follow-up Scheduler Module (`apps/api/src/follow-up-scheduler/`)

Background task system with cron jobs for automated follow-up management.

#### Cron Jobs (`follow-up-scheduler.service.ts`)

1. **checkOverdueFollowUps()** - Runs every hour
   - Finds overdue activities
   - Groups by assigned user
   - Sends notifications via event emitter

2. **checkStaleOpportunities()** - Runs every 6 hours
   - Finds opportunities with no activity in 7 days
   - Emits `opportunity.stale_detected` event
   - Triggers automation rules

3. **processAutomationRules()** - Runs every 15 minutes
   - Event-driven rule evaluation checkpoint

4. **cleanupOldActivities()** - Runs daily at 2 AM
   - Identifies completed activities older than 1 year
   - Prepares for archiving (not yet implemented)

5. **sendDailySummary()** - Runs at 8 AM every day
   - Generates daily summary of scheduled activities
   - Reports overdue count
   - Emits `notification.daily_summary` event

6. **checkUpcomingFollowUps()** - Runs every 30 minutes
   - Finds activities due in next hour
   - Sends reminders to assigned users

### 4. Integration with Opportunities Module

Updated `opportunities.service.ts` to emit events for automation:

**Events Emitted:**
- `opportunity.created` - When new opportunity is created
  - Payload: `{ opportunity, userId, leadSource }`

- `opportunity.status_changed` - When opportunity status changes
  - Payload: `{ opportunity, previousStatus, newStatus, userId }`

### 5. Default Automation Rules

Eight predefined automation rules (`default-follow-up-rules.seed.ts`):

1. **New Website Lead Follow-up**
   - Trigger: Opportunity created with leadSource = 'website'
   - Action: Create follow-up call within 1 hour

2. **Quote Sent Follow-up Reminder**
   - Trigger: Estimate created
   - Action: Create follow-up activity 2 days later

3. **Callback Requested Auto Follow-up**
   - Trigger: Activity completed with outcome = 'callback_requested'
   - Action: Create next-day follow-up call

4. **Won Opportunity - Create Job**
   - Trigger: Status changed to 'won'
   - Action: Create kickoff meeting immediately + send notification

5. **Lost Opportunity Re-engagement**
   - Trigger: Status changed to 'lost'
   - Action: Create re-engagement follow-up 30 days later

6. **Urgent Priority Immediate Follow-up**
   - Trigger: Opportunity created with priority = 'urgent'
   - Action: Create immediate follow-up + notification

7. **Referral Lead Special Handling**
   - Trigger: Opportunity created with leadSource = 'referral'
   - Action: Create personalized follow-up within 2 hours

8. **Negotiating Status Weekly Follow-up**
   - Trigger: Status changed to 'negotiating'
   - Action: Create weekly check-in call

## Event-Driven Architecture

### Event Flow

```
1. User Action → Opportunity Created/Updated
2. Service emits event → EventEmitter2
3. FollowUpRulesService listens → @OnEvent decorator
4. Evaluate active rules → Match conditions
5. Execute actions → Create activities, send notifications
6. Activities tracked → Complete audit trail
```

### Event Types

- `opportunity.created`
- `opportunity.status_changed`
- `opportunity.stale_detected`
- `estimate.created`
- `activity.created`
- `activity.completed`
- `notification.overdue_activities`
- `notification.upcoming_activities`
- `notification.daily_summary`

## Security & Access Control

### Role-Based Access

- **super_admin / admin**: Full access to all features, can create/edit rules
- **dispatcher**: View rules, manage activities
- **sales**: View own activities only (unless admin)

### Data Isolation

- Non-admin users only see their assigned activities
- Activity completion tracked with userId for audit
- Rules execution logged for compliance

## Testing the System

### 1. Create an Opportunity
```bash
POST /api/opportunities
{
  "customerId": "...",
  "service": "local",
  "leadSource": "website",
  "priority": "urgent",
  ...
}
```

### 2. Verify Activity Created
```bash
GET /api/lead-activities/opportunity/:opportunityId
```

Expected: Automated activity created based on matching rules (website lead + urgent priority)

### 3. Complete Activity
```bash
PATCH /api/lead-activities/:activityId/complete
{
  "outcome": "callback_requested"
}
```

Expected: New follow-up activity created automatically (callback rule triggers)

### 4. Check Overdue Activities
```bash
GET /api/lead-activities/overdue
```

### 5. View Activity Statistics
```bash
GET /api/lead-activities/statistics
```

Returns:
- Total activities
- Completed count
- Pending count
- Overdue count
- Breakdown by type
- Breakdown by outcome
- Average response time

## Integration with AppModule

Updated `app.module.ts`:
- Added `EventEmitterModule.forRoot()` for event system
- Imported `LeadActivitiesModule`
- Imported `FollowUpRulesModule`
- Imported `FollowUpSchedulerModule`

## Database Seeding

To seed default rules:
```typescript
import { seedDefaultFollowUpRules } from './database/seeds/default-follow-up-rules.seed';

// In your seeding script
await seedDefaultFollowUpRules(followUpRuleModel);
```

## Monitoring & Observability

### Logs
- All rule evaluations logged with Logger
- Activity creation/completion tracked
- Cron job execution logged
- Error handling with detailed error logs

### Notifications
Events emitted for:
- Overdue activities (hourly)
- Upcoming activities (every 30 min)
- Daily summaries (8 AM)
- Urgent leads (immediate)

## Future Enhancements

1. **Email Integration**: Connect email service (SendGrid, AWS SES) for automated emails
2. **SMS Notifications**: Twilio integration for text reminders
3. **Round-Robin Assignment**: Implement load-balanced lead assignment
4. **WebSocket Notifications**: Real-time browser notifications
5. **Advanced Analytics**: Conversion funnel tracking, lead scoring
6. **AI-Powered Suggestions**: ML-based optimal follow-up timing
7. **Calendar Integration**: Sync with Google Calendar / Outlook
8. **Activity Templates**: Pre-built activity templates for common scenarios

## API Endpoint Summary

**Total New Endpoints: 17**

### Lead Activities (11 endpoints)
- POST /api/lead-activities
- GET /api/lead-activities
- GET /api/lead-activities/opportunity/:id
- GET /api/lead-activities/customer/:id
- GET /api/lead-activities/pending
- GET /api/lead-activities/overdue
- GET /api/lead-activities/statistics
- GET /api/lead-activities/timeline/:opportunityId
- GET /api/lead-activities/:activityId
- PATCH /api/lead-activities/:activityId/complete
- DELETE /api/lead-activities/:activityId

### Follow-up Rules (6 endpoints)
- POST /api/follow-up-rules
- GET /api/follow-up-rules
- GET /api/follow-up-rules/active
- GET /api/follow-up-rules/:ruleId
- PATCH /api/follow-up-rules/:ruleId
- DELETE /api/follow-up-rules/:ruleId
- POST /api/follow-up-rules/:ruleId/test

## Files Created

### Lead Activities Module
- `apps/api/src/lead-activities/schemas/lead-activity.schema.ts`
- `apps/api/src/lead-activities/dto/create-activity.dto.ts`
- `apps/api/src/lead-activities/dto/complete-activity.dto.ts`
- `apps/api/src/lead-activities/dto/activity-query.dto.ts`
- `apps/api/src/lead-activities/lead-activities.service.ts`
- `apps/api/src/lead-activities/lead-activities.controller.ts`
- `apps/api/src/lead-activities/lead-activities.module.ts`

### Follow-up Rules Module
- `apps/api/src/follow-up-rules/schemas/follow-up-rule.schema.ts`
- `apps/api/src/follow-up-rules/dto/create-rule.dto.ts`
- `apps/api/src/follow-up-rules/dto/update-rule.dto.ts`
- `apps/api/src/follow-up-rules/follow-up-rules.service.ts`
- `apps/api/src/follow-up-rules/follow-up-rules.controller.ts`
- `apps/api/src/follow-up-rules/follow-up-rules.module.ts`

### Follow-up Scheduler Module
- `apps/api/src/follow-up-scheduler/follow-up-scheduler.service.ts`
- `apps/api/src/follow-up-scheduler/follow-up-scheduler.module.ts`

### Database Seeds
- `apps/api/src/database/seeds/default-follow-up-rules.seed.ts`

### Modified Files
- `apps/api/src/app.module.ts` - Added new modules and EventEmitterModule
- `apps/api/src/opportunities/opportunities.service.ts` - Added event emission

## Summary

The Lead Tracking & Follow-up Automation System provides:

✅ **Complete Activity Tracking** - All interactions logged with comprehensive metadata
✅ **Automated Follow-ups** - Rule-based automation for common scenarios
✅ **Overdue Management** - Automatic detection and notification of overdue tasks
✅ **Analytics & Reporting** - Detailed statistics on response times and outcomes
✅ **Event-Driven Architecture** - Scalable, maintainable automation workflows
✅ **Role-Based Security** - Proper access control for all features
✅ **Audit Trail** - Complete history of who did what and when
✅ **Extensible Design** - Easy to add new rules, actions, and event types

The system is production-ready pending resolution of unrelated TypeScript errors in the partners and referrals modules.

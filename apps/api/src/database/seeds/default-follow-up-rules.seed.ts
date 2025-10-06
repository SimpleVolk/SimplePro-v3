import { v4 as uuidv4 } from 'uuid';
import {
  EventType,
  ActionType,
} from '../../follow-up-rules/schemas/follow-up-rule.schema';

export const defaultFollowUpRules = [
  {
    ruleId: uuidv4(),
    name: 'New Website Lead Follow-up',
    description:
      'Automatically create a follow-up call activity within 1 hour for new website leads',
    trigger: {
      eventType: EventType.OPPORTUNITY_CREATED,
      conditions: [
        {
          field: 'leadSource',
          operator: 'equals',
          value: 'website',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 1, // 1 hour
        activityType: 'call',
        subject: 'Call new website lead',
        description:
          'Follow up with customer who submitted inquiry through website',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 1,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Quote Sent Follow-up Reminder',
    description: 'Create follow-up activity 2 days after quote is sent',
    trigger: {
      eventType: EventType.QUOTE_SENT,
      conditions: [],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 48, // 2 days
        activityType: 'call',
        subject: 'Follow up on quote',
        description:
          'Check if customer received quote and answer any questions',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 2,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Callback Requested Auto Follow-up',
    description:
      'Automatically create next-day follow-up when customer requests callback',
    trigger: {
      eventType: EventType.ACTIVITY_COMPLETED,
      conditions: [
        {
          field: 'outcome',
          operator: 'equals',
          value: 'callback_requested',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 24, // 1 day
        activityType: 'call',
        subject: 'Return customer callback',
        description: 'Customer requested a callback - follow up as promised',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 3,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Won Opportunity - Create Job',
    description:
      'Automatically create job and schedule kickoff call when opportunity is won',
    trigger: {
      eventType: EventType.STATUS_CHANGED,
      conditions: [
        {
          field: 'newStatus',
          operator: 'equals',
          value: 'won',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 0, // Immediate
        activityType: 'meeting',
        subject: 'Job kickoff call',
        description:
          'Schedule kickoff call to confirm details and finalize moving plans',
        assignTo: 'lead_owner',
      },
      {
        actionType: ActionType.SEND_NOTIFICATION,
        delay: 0,
        template: 'won_opportunity',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 4,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Lost Opportunity Re-engagement',
    description:
      'Create follow-up activity 30 days after opportunity is lost for potential re-engagement',
    trigger: {
      eventType: EventType.STATUS_CHANGED,
      conditions: [
        {
          field: 'newStatus',
          operator: 'equals',
          value: 'lost',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 720, // 30 days
        activityType: 'email',
        subject: 'Re-engagement opportunity',
        description:
          'Reach out to previously lost lead to check if circumstances have changed',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 5,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Urgent Priority Immediate Follow-up',
    description:
      'Immediately create follow-up for urgent priority opportunities',
    trigger: {
      eventType: EventType.OPPORTUNITY_CREATED,
      conditions: [
        {
          field: 'priority',
          operator: 'equals',
          value: 'urgent',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 0, // Immediate
        activityType: 'call',
        subject: 'URGENT: Contact customer immediately',
        description: 'High priority lead - contact within 15 minutes',
        assignTo: 'lead_owner',
      },
      {
        actionType: ActionType.SEND_NOTIFICATION,
        delay: 0,
        template: 'urgent_lead',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 0, // Highest priority
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Referral Lead Special Handling',
    description:
      'Create personalized follow-up for referral leads within 2 hours',
    trigger: {
      eventType: EventType.OPPORTUNITY_CREATED,
      conditions: [
        {
          field: 'leadSource',
          operator: 'equals',
          value: 'referral',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 2, // 2 hours
        activityType: 'call',
        subject: 'Call referral lead',
        description: 'Contact referral lead and mention who referred them',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 1,
    createdBy: 'system',
  },
  {
    ruleId: uuidv4(),
    name: 'Negotiating Status Weekly Follow-up',
    description:
      'Create weekly follow-up for opportunities in negotiating status',
    trigger: {
      eventType: EventType.STATUS_CHANGED,
      conditions: [
        {
          field: 'newStatus',
          operator: 'equals',
          value: 'negotiating',
        },
      ],
    },
    actions: [
      {
        actionType: ActionType.CREATE_ACTIVITY,
        delay: 168, // 7 days
        activityType: 'call',
        subject: 'Check negotiation progress',
        description:
          'Follow up on ongoing negotiations and address any concerns',
        assignTo: 'lead_owner',
      },
    ],
    isActive: true,
    priority: 3,
    createdBy: 'system',
  },
];

export async function seedDefaultFollowUpRules(ruleModel: any): Promise<void> {
  console.log('Seeding default follow-up rules...');

  for (const rule of defaultFollowUpRules) {
    const existing = await ruleModel.findOne({ ruleId: rule.ruleId }).exec();

    if (!existing) {
      await ruleModel.create(rule);
      console.log(`Created rule: ${rule.name}`);
    } else {
      console.log(`Rule already exists: ${rule.name}`);
    }
  }

  console.log('Default follow-up rules seeded successfully');
}

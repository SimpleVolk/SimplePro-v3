import { faker } from '@faker-js/faker';

/**
 * Seed message threads and messages
 */
export async function seedMessages(
  MessageModel: any,
  MessageThreadModel: any,
  users: any[],
): Promise<number> {
  let totalMessages = 0;

  // Create 5-8 message threads
  const threadCount = faker.number.int({ min: 5, max: 8 });

  for (let i = 0; i < threadCount; i++) {
    // Select 2-4 participants for each thread
    const participantCount = faker.number.int({ min: 2, max: 4 });
    const participants = faker.helpers.arrayElements(users, participantCount);
    const participantIds = participants.map((p) => p._id);

    // Determine thread type
    const isGroup = participants.length > 2;
    const threadName = isGroup
      ? faker.helpers.arrayElement([
          'Crew Coordination',
          'Weekend Schedule',
          'Equipment Check',
          'Customer Issues',
          'Daily Standup',
        ])
      : undefined;

    // Create thread
    const thread = await MessageThreadModel.create({
      participants: participantIds,
      threadType: isGroup ? 'group' : 'direct',
      threadName,
      lastMessageAt: new Date(),
      metadata: {},
    });

    // Create 5-15 messages in each thread
    const messageCount = faker.number.int({ min: 5, max: 15 });
    const messages: any[] = [];

    for (let m = 0; m < messageCount; m++) {
      const sender = faker.helpers.arrayElement(participants);
      const messageDate = faker.date.recent({ days: 30 });

      // Generate message content
      const messageTemplates = [
        'Can you confirm the pickup time for tomorrow?',
        'The customer called about rescheduling',
        'Equipment is ready for the job',
        'Traffic is heavy, might be 15 minutes late',
        'Job completed successfully!',
        'Need help with heavy piano on 3rd floor',
        'Customer requested additional packing materials',
        'All clear, heading to next location',
        'Photo uploaded for inspection',
        'Great job today team!',
      ];

      const message = {
        threadId: thread._id,
        senderId: sender._id,
        content: faker.helpers.arrayElement(messageTemplates),
        messageType: 'text',
        attachments: [] as string[],
        readBy: faker.helpers
          .arrayElements(
            participants.filter(
              (p) => p._id.toString() !== sender._id.toString(),
            ),
            { min: 0, max: participants.length - 1 },
          )
          .map((p) => ({
            userId: p._id,
            readAt: new Date(
              messageDate.getTime() +
                faker.number.int({ min: 60000, max: 3600000 }),
            ),
          })),
        isEdited: false,
        isDeleted: false,
        metadata: {},
      };

      const createdMessage = await MessageModel.create(message);
      messages.push(createdMessage);
      totalMessages++;
    }

    // Update thread with last message timestamp
    if (messages.length > 0) {
      await MessageThreadModel.findByIdAndUpdate(thread._id, {
        lastMessageAt: messages[messages.length - 1].createdAt,
      });
    }
  }

  return totalMessages;
}

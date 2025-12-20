/**
 * Gmail Streaming Example - Process Large Mailboxes
 *
 * This example shows how to:
 * - Stream emails using async iterators
 * - Process large mailboxes without memory issues
 * - Handle backpressure and rate limits
 * - Stop streaming early when needed
 */

import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

async function main() {
  const mail = createMail({
    provider: gmail({
      accessToken: process.env.GMAIL_ACCESS_TOKEN!,
    }),
    // Configure retry for streaming operations
    retry: {
      attempts: 3,
      backoff: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000,
    },
  });

  await mail.connect();
  console.log('Connected to Gmail!\n');

  // Example 1: Basic streaming
  console.log('--- Streaming all inbox emails ---');
  let count = 0;

  for await (const email of mail.stream({ folder: 'inbox' })) {
    count++;
    console.log(`[${count}] ${email.subject} - ${email.from.email}`);

    // Process each email as it arrives
    // This is memory-efficient for large mailboxes
  }
  console.log(`\nProcessed ${count} emails\n`);

  // Example 2: Stream with filters
  console.log('--- Streaming unread emails from last 30 days ---');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let unreadCount = 0;
  for await (const email of mail.stream({
    folder: 'inbox',
    unreadOnly: true,
    after: thirtyDaysAgo,
  })) {
    unreadCount++;
    console.log(`📬 ${email.subject}`);
  }
  console.log(`\nFound ${unreadCount} unread emails\n`);

  // Example 3: Stream with early termination
  console.log('--- Finding first email with attachment ---');
  for await (const email of mail.stream({
    folder: 'inbox',
    hasAttachment: true,
  })) {
    console.log(`Found: ${email.subject}`);
    console.log(`Attachments: ${email.attachments.length}`);
    for (const att of email.attachments) {
      console.log(`  - ${att.filename} (${att.size} bytes)`);
    }
    break; // Stop after first match
  }

  // Example 4: Collect emails with processing
  console.log('\n--- Processing emails in batches ---');
  const batch: string[] = [];
  const batchSize = 10;

  for await (const email of mail.stream({ folder: 'inbox' })) {
    batch.push(email.id);

    if (batch.length >= batchSize) {
      console.log(`Processing batch of ${batch.length} emails...`);
      // Process batch here (e.g., mark as read, add labels, etc.)
      await processBatch(mail, batch);
      batch.length = 0; // Clear batch
    }

    // Stop after 50 emails for this example
    if (count >= 50) break;
    count++;
  }

  // Process remaining emails
  if (batch.length > 0) {
    console.log(`Processing final batch of ${batch.length} emails...`);
    await processBatch(mail, batch);
  }

  await mail.disconnect();
  console.log('\nDisconnected from Gmail.');
}

async function processBatch(
  mail: ReturnType<typeof createMail>,
  emailIds: string[],
) {
  // Example: Mark all emails in batch as read
  for (const id of emailIds) {
    // await mail.markAsRead(id);
  }
  console.log(`  Processed ${emailIds.length} emails`);
}

main().catch(console.error);

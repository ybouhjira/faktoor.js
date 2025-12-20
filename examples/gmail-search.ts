/**
 * Gmail Search Example - Filter and Search Emails
 *
 * This example shows how to:
 * - Search emails by sender
 * - Filter by date range
 * - Find emails with attachments
 * - Combine multiple filters
 * - Search by read/unread status
 */

import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

async function main() {
  const mail = createMail({
    provider: gmail({
      accessToken: process.env.GMAIL_ACCESS_TOKEN!,
    }),
  });

  await mail.connect();
  console.log('Connected to Gmail!\n');

  // Example 1: Search by sender
  console.log('--- Emails from a specific sender ---');
  const fromSender = await mail.list({
    folder: 'inbox',
    from: 'notifications@github.com',
    limit: 5,
  });
  console.log(`Found ${fromSender.length} emails from GitHub:`);
  for (const email of fromSender) {
    console.log(`  - ${email.subject}`);
  }

  // Example 2: Search by date range
  console.log('\n--- Emails from the last 7 days ---');
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentEmails = await mail.list({
    folder: 'inbox',
    after: weekAgo,
    before: new Date(),
    limit: 10,
  });
  console.log(`Found ${recentEmails.length} recent emails:`);
  for (const email of recentEmails) {
    console.log(`  - [${email.date.toLocaleDateString()}] ${email.subject}`);
  }

  // Example 3: Find emails with attachments
  console.log('\n--- Emails with attachments ---');
  const withAttachments = await mail.list({
    folder: 'inbox',
    hasAttachment: true,
    limit: 5,
  });
  console.log(`Found ${withAttachments.length} emails with attachments:`);
  for (const email of withAttachments) {
    console.log(`  - ${email.subject}`);
    console.log(
      `    Attachments: ${email.attachments.map((a) => a.filename).join(', ')}`,
    );
  }

  // Example 4: Unread emails only
  console.log('\n--- Unread emails ---');
  const unreadEmails = await mail.list({
    folder: 'inbox',
    unreadOnly: true,
    limit: 5,
  });
  console.log(`Found ${unreadEmails.length} unread emails:`);
  for (const email of unreadEmails) {
    console.log(`  📬 ${email.subject}`);
  }

  // Example 5: Combine multiple filters
  console.log('\n--- Combined filter: Unread + Attachments + Recent ---');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filtered = await mail.list({
    folder: 'inbox',
    unreadOnly: true,
    hasAttachment: true,
    after: thirtyDaysAgo,
    limit: 10,
  });
  console.log(
    `Found ${filtered.length} unread emails with attachments from the last 30 days:`,
  );
  for (const email of filtered) {
    console.log(`  📎 ${email.subject} (${email.attachments.length} files)`);
  }

  // Example 6: Search across different folders
  console.log('\n--- Searching different folders ---');

  const folders = await mail.listFolders();
  console.log(
    `Available folders: ${folders.map((f) => f.name).join(', ')}\n`,
  );

  // Search in sent folder
  const sentEmails = await mail.list({
    folder: 'sent',
    limit: 3,
  });
  console.log(`Recent sent emails (${sentEmails.length}):`);
  for (const email of sentEmails) {
    console.log(`  - To: ${email.to.map((a) => a.email).join(', ')}`);
    console.log(`    Subject: ${email.subject}`);
  }

  // Example 7: Search in starred emails
  console.log('\n--- Starred emails ---');
  const starred = await mail.list({
    folder: 'starred',
    limit: 5,
  });
  console.log(`Found ${starred.length} starred emails:`);
  for (const email of starred) {
    console.log(`  ⭐ ${email.subject}`);
  }

  await mail.disconnect();
  console.log('\nDisconnected from Gmail.');
}

main().catch(console.error);

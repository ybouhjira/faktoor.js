/**
 * Gmail Basic Example - List and Get Emails
 *
 * This example shows how to:
 * - Initialize the faktoor.js client with Gmail
 * - List emails from inbox
 * - Get a single email by ID
 * - Access email properties
 */

import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';

async function main() {
  // Initialize the mail client with Gmail provider
  const mail = createMail({
    provider: gmail({
      accessToken: process.env.GMAIL_ACCESS_TOKEN!,
    }),
  });

  // Connect to Gmail
  await mail.connect();

  console.log('Connected to Gmail!\n');

  // List the 10 most recent emails from inbox
  const emails = await mail.list({
    folder: 'inbox',
    limit: 10,
  });

  console.log(`Found ${emails.length} emails:\n`);

  // Display email summaries
  for (const email of emails) {
    console.log(`📧 ${email.subject}`);
    console.log(`   From: ${email.from.name || email.from.email}`);
    console.log(`   Date: ${email.date.toLocaleDateString()}`);
    console.log(`   Read: ${email.isRead ? 'Yes' : 'No'}`);
    console.log();
  }

  // Get a single email with full details
  if (emails.length > 0) {
    const emailId = emails[0].id;
    const fullEmail = await mail.get(emailId);

    console.log('--- Full Email Details ---');
    console.log(`Subject: ${fullEmail.subject}`);
    console.log(`From: ${fullEmail.from.email}`);
    console.log(`To: ${fullEmail.to.map((a) => a.email).join(', ')}`);
    console.log(`Date: ${fullEmail.date}`);
    console.log(`Labels: ${fullEmail.labels.join(', ')}`);
    console.log(`Has attachments: ${fullEmail.attachments.length > 0}`);

    // Access body content
    if (fullEmail.body.text) {
      console.log(`\nBody preview: ${fullEmail.body.text.slice(0, 200)}...`);
    }
  }

  // Disconnect when done
  await mail.disconnect();
  console.log('\nDisconnected from Gmail.');
}

main().catch(console.error);

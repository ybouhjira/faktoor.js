/**
 * Gmail Send Example - Send Emails with Attachments
 *
 * This example shows how to:
 * - Send a simple text email
 * - Send an HTML email
 * - Send an email with attachments
 * - Handle send results
 */

import { createMail } from '@faktoor/core';
import { gmail } from '@faktoor/gmail';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const mail = createMail({
    provider: gmail({
      accessToken: process.env.GMAIL_ACCESS_TOKEN!,
    }),
  });

  await mail.connect();
  console.log('Connected to Gmail!\n');

  // Example 1: Send a simple text email
  console.log('Sending simple text email...');
  const simpleResult = await mail.send({
    to: ['recipient@example.com'],
    subject: 'Hello from faktoor.js',
    text: 'This is a simple text email sent using faktoor.js!',
  });
  console.log(`Sent! Message ID: ${simpleResult.id}\n`);

  // Example 2: Send an HTML email with CC
  console.log('Sending HTML email...');
  const htmlResult = await mail.send({
    to: ['recipient@example.com'],
    cc: ['cc-recipient@example.com'],
    subject: 'faktoor.js HTML Email',
    text: 'Plain text fallback for email clients that do not support HTML.',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h1 style="color: #4a90d9;">Hello from faktoor.js!</h1>
          <p>This is an <strong>HTML email</strong> with styling.</p>
          <ul>
            <li>Feature 1: Unified API</li>
            <li>Feature 2: TypeScript support</li>
            <li>Feature 3: Multiple providers</li>
          </ul>
          <p style="color: #888;">Sent using faktoor.js</p>
        </body>
      </html>
    `,
  });
  console.log(`Sent! Message ID: ${htmlResult.id}\n`);

  // Example 3: Send an email with attachments
  console.log('Sending email with attachment...');

  // Create a sample attachment (in real use, read from file)
  const sampleDocument = Buffer.from(
    'This is a sample text document content.',
  );

  // Or read a real file:
  // const pdfBuffer = readFileSync(resolve(__dirname, 'document.pdf'));

  const attachmentResult = await mail.send({
    to: ['recipient@example.com'],
    subject: 'Document Attached',
    text: 'Please find the document attached.',
    html: '<p>Please find the document attached.</p>',
    attachments: [
      {
        filename: 'sample.txt',
        content: sampleDocument,
        contentType: 'text/plain',
      },
      // Add more attachments as needed:
      // {
      //   filename: 'report.pdf',
      //   content: pdfBuffer,
      //   contentType: 'application/pdf',
      // },
    ],
  });
  console.log(`Sent with attachment! Message ID: ${attachmentResult.id}\n`);

  // Example 4: Send to multiple recipients with BCC
  console.log('Sending to multiple recipients...');
  const multiResult = await mail.send({
    to: ['recipient1@example.com', 'recipient2@example.com'],
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'], // Hidden recipient
    subject: 'Team Update',
    text: 'This message was sent to multiple recipients.',
  });
  console.log(`Sent to multiple recipients! Message ID: ${multiResult.id}\n`);

  await mail.disconnect();
  console.log('Disconnected from Gmail.');
}

main().catch(console.error);

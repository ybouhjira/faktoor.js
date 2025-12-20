import type { SendOptions, SendResult, EmailId } from '@faktoor/core';

export interface SendGridOptions {
  apiKey: string;
}

export class SendGridProvider {
  readonly name = 'sendgrid';
  private apiKey: string;

  constructor(options: SendGridOptions) {
    this.apiKey = options.apiKey;
  }

  async send(options: SendOptions): Promise<SendResult> {
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: to.map(email => ({ email })) }],
        from: { email: options.headers?.from ?? 'noreply@example.com' },
        subject: options.subject,
        content: [
          options.text ? { type: 'text/plain', value: options.text } : null,
          options.html ? { type: 'text/html', value: options.html } : null,
        ].filter(Boolean),
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.statusText}`);
    }

    const messageId = response.headers.get('x-message-id') ?? crypto.randomUUID();
    return { id: messageId as EmailId, timestamp: new Date() };
  }
}

export function sendgrid(options: SendGridOptions): SendGridProvider {
  return new SendGridProvider(options);
}

import type { SendOptions, SendResult, EmailId } from '@faktoor/core';

export interface ResendOptions {
  apiKey: string;
  baseUrl?: string;
}

export class ResendProvider {
  readonly name = 'resend';
  private apiKey: string;
  private baseUrl: string;

  constructor(options: ResendOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.resend.com';
  }

  async send(options: SendOptions): Promise<SendResult> {
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.headers?.from ?? 'noreply@example.com',
        to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { id: data.id as EmailId, timestamp: new Date() };
  }
}

export function resend(options: ResendOptions): ResendProvider {
  return new ResendProvider(options);
}

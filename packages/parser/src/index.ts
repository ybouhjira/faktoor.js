import type { Address } from '@faktoor/core';

/**
 * Parse a single email address
 * Handles formats: "Name <email>" and "email"
 */
export function parseAddress(raw: string): Address {
  const trimmed = raw.trim();
  // Match "Name <email>" or just "email"
  const match = trimmed.match(/^(?:"?([^"<]*)"?\s*)?<?([^>@\s]+@[^>@\s]+)>?$/);

  if (!match) {
    return { email: trimmed };
  }

  const [, name, email] = match;
  return {
    email: email?.trim() ?? trimmed,
    name: name?.trim() || undefined,
  };
}

/**
 * Parse multiple email addresses from a string
 */
export function parseAddressList(raw: string): Address[] {
  if (!raw.trim()) return [];

  // Split by comma but not inside quotes
  const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return parts.map((part) => parseAddress(part)).filter((addr) => addr.email.includes('@'));
}

/**
 * Format an address to string
 */
export function formatAddress(address: Address): string {
  if (address.name) {
    return `"${address.name}" <${address.email}>`;
  }
  return address.email;
}

/**
 * Format multiple addresses to string
 */
export function formatAddressList(addresses: Address[]): string {
  return addresses.map(formatAddress).join(', ');
}

/**
 * Decode base64url encoded string
 */
export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  if (typeof atob !== 'undefined') {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/**
 * Encode string to base64url
 */
export function encodeBase64Url(data: string): string {
  let base64: string;

  if (typeof btoa !== 'undefined') {
    base64 = btoa(unescape(encodeURIComponent(data)));
  } else {
    base64 = Buffer.from(data).toString('base64');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode quoted-printable encoded string
 */
export function decodeQuotedPrintable(data: string): string {
  return data
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

/**
 * Extract plain text from HTML
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<br\s*\/?>/gi, '\n') // br to newline
    .replace(/<\/p>/gi, '\n\n') // p to double newline
    .replace(/<\/div>/gi, '\n') // div to newline
    .replace(/<\/li>/gi, '\n') // li to newline
    .replace(/<li[^>]*>/gi, '• ') // li to bullet
    .replace(/<[^>]+>/g, '') // Remove remaining tags
    .replace(/&nbsp;/g, ' ') // nbsp to space
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number.parseInt(num, 10)))
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .trim();
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Extract domain from email address
 */
export function getEmailDomain(email: string): string | null {
  const match = email.match(/@([^@]+)$/);
  return match?.[1] ?? null;
}

/**
 * Parse RFC 2822 date string
 */
export function parseEmailDate(dateStr: string): Date {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

/**
 * Format date to RFC 2822 format
 */
export function formatEmailDate(date: Date): string {
  return date.toUTCString();
}

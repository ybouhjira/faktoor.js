import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseAddress,
  parseAddressList,
  formatAddress,
  formatAddressList,
  decodeBase64Url,
  encodeBase64Url,
  decodeQuotedPrintable,
  htmlToText,
  isValidEmail,
  getEmailDomain,
  parseEmailDate,
  formatEmailDate,
} from './index';

describe('parseAddress', () => {
  it('parses simple email address', () => {
    expect(parseAddress('user@example.com')).toEqual({
      email: 'user@example.com',
    });
  });

  it('parses email with display name in angle brackets', () => {
    expect(parseAddress('John Doe <john@example.com>')).toEqual({
      email: 'john@example.com',
      name: 'John Doe',
    });
  });

  it('parses email with quoted display name', () => {
    expect(parseAddress('"John Doe" <john@example.com>')).toEqual({
      email: 'john@example.com',
      name: 'John Doe',
    });
  });

  it('trims whitespace from input', () => {
    expect(parseAddress('  user@example.com  ')).toEqual({
      email: 'user@example.com',
    });
  });

  it('trims whitespace from name and email', () => {
    expect(parseAddress('  John Doe   <  john@example.com  >')).toEqual({
      email: 'john@example.com',
      name: 'John Doe',
    });
  });

  it('returns original string as email when no match found', () => {
    expect(parseAddress('not-an-email')).toEqual({
      email: 'not-an-email',
    });
  });

  it('handles email with empty name', () => {
    expect(parseAddress('<user@example.com>')).toEqual({
      email: 'user@example.com',
    });
  });

  it('handles complex email addresses', () => {
    expect(parseAddress('user.name+tag@subdomain.example.com')).toEqual({
      email: 'user.name+tag@subdomain.example.com',
    });
  });

  it('handles name with special characters', () => {
    expect(parseAddress('"O\'Connor, John" <john@example.com>')).toEqual({
      email: 'john@example.com',
      name: "O'Connor, John",
    });
  });
});

describe('parseAddressList', () => {
  it('returns empty array for empty string', () => {
    expect(parseAddressList('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseAddressList('   ')).toEqual([]);
  });

  it('parses single address', () => {
    expect(parseAddressList('user@example.com')).toEqual([
      { email: 'user@example.com' },
    ]);
  });

  it('parses multiple addresses separated by commas', () => {
    expect(parseAddressList('a@example.com, b@example.com')).toEqual([
      { email: 'a@example.com' },
      { email: 'b@example.com' },
    ]);
  });

  it('handles addresses with names', () => {
    expect(parseAddressList('John <john@example.com>, Jane <jane@example.com>')).toEqual([
      { email: 'john@example.com', name: 'John' },
      { email: 'jane@example.com', name: 'Jane' },
    ]);
  });

  it('handles quoted names with commas inside', () => {
    expect(parseAddressList('"Doe, John" <john@example.com>, jane@example.com')).toEqual([
      { email: 'john@example.com', name: 'Doe, John' },
      { email: 'jane@example.com' },
    ]);
  });

  it('filters out invalid addresses without @', () => {
    expect(parseAddressList('valid@example.com, invalid')).toEqual([
      { email: 'valid@example.com' },
    ]);
  });
});

describe('formatAddress', () => {
  it('formats address with name', () => {
    expect(formatAddress({ email: 'john@example.com', name: 'John Doe' })).toBe(
      '"John Doe" <john@example.com>'
    );
  });

  it('formats address without name', () => {
    expect(formatAddress({ email: 'john@example.com' })).toBe('john@example.com');
  });

  it('handles empty name as no name', () => {
    expect(formatAddress({ email: 'john@example.com', name: '' })).toBe('john@example.com');
  });
});

describe('formatAddressList', () => {
  it('formats empty list', () => {
    expect(formatAddressList([])).toBe('');
  });

  it('formats single address', () => {
    expect(formatAddressList([{ email: 'a@example.com' }])).toBe('a@example.com');
  });

  it('formats multiple addresses with comma separator', () => {
    expect(
      formatAddressList([
        { email: 'a@example.com', name: 'A' },
        { email: 'b@example.com' },
      ])
    ).toBe('"A" <a@example.com>, b@example.com');
  });
});

describe('decodeBase64Url', () => {
  it('decodes simple base64url string', () => {
    // "Hello" in base64url
    expect(decodeBase64Url('SGVsbG8')).toBe('Hello');
  });

  it('handles base64url with - and _ characters', () => {
    // These would be + and / in standard base64
    const encoded = 'SGVsbG8tV29ybGRf';
    const decoded = decodeBase64Url(encoded);
    expect(decoded).toBe('Hello-World_');
  });

  it('handles padding correctly', () => {
    // "Hi" encoded without padding
    expect(decodeBase64Url('SGk')).toBe('Hi');
  });

  it('decodes UTF-8 content', () => {
    // "Héllo" in base64url
    expect(decodeBase64Url('SMOpbGxv')).toBe('Héllo');
  });
});

describe('encodeBase64Url', () => {
  it('encodes simple string', () => {
    expect(encodeBase64Url('Hello')).toBe('SGVsbG8');
  });

  it('produces URL-safe output (no +, /, or =)', () => {
    const encoded = encodeBase64Url('Hello World!!!');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('encodes UTF-8 content', () => {
    const encoded = encodeBase64Url('Héllo');
    expect(decodeBase64Url(encoded)).toBe('Héllo');
  });

  it('is reversible with decodeBase64Url', () => {
    const original = 'Test message with special chars: é, ñ, 日本語';
    const encoded = encodeBase64Url(original);
    expect(decodeBase64Url(encoded)).toBe(original);
  });
});

describe('decodeQuotedPrintable', () => {
  it('decodes hex-encoded characters', () => {
    expect(decodeQuotedPrintable('Hello=20World')).toBe('Hello World');
  });

  it('removes soft line breaks (=\\n)', () => {
    expect(decodeQuotedPrintable('Hello=\nWorld')).toBe('HelloWorld');
  });

  it('removes soft line breaks (=\\r\\n)', () => {
    expect(decodeQuotedPrintable('Hello=\r\nWorld')).toBe('HelloWorld');
  });

  it('decodes multiple hex characters', () => {
    expect(decodeQuotedPrintable('=48=65=6C=6C=6F')).toBe('Hello');
  });

  it('handles mixed content', () => {
    expect(decodeQuotedPrintable('Hello=20=\nWorld=21')).toBe('Hello World!');
  });

  it('handles lowercase hex', () => {
    expect(decodeQuotedPrintable('=4a=6f=68=6e')).toBe('John');
  });
});

describe('htmlToText', () => {
  it('removes HTML tags', () => {
    expect(htmlToText('<p>Hello</p>')).toBe('Hello');
  });

  it('converts <br> to newlines', () => {
    expect(htmlToText('Hello<br>World')).toBe('Hello\nWorld');
  });

  it('converts <br/> to newlines', () => {
    expect(htmlToText('Hello<br/>World')).toBe('Hello\nWorld');
  });

  it('converts </p> to double newlines', () => {
    expect(htmlToText('<p>First</p><p>Second</p>')).toBe('First\n\nSecond');
  });

  it('converts </div> to newlines', () => {
    expect(htmlToText('<div>First</div><div>Second</div>')).toBe('First\nSecond');
  });

  it('converts <li> to bullets', () => {
    expect(htmlToText('<ul><li>Item 1</li><li>Item 2</li></ul>')).toBe('• Item 1\n• Item 2');
  });

  it('removes <style> tags with content', () => {
    expect(htmlToText('<style>.class { color: red; }</style>Hello')).toBe('Hello');
  });

  it('removes <script> tags with content', () => {
    expect(htmlToText('<script>alert("hi");</script>Hello')).toBe('Hello');
  });

  it('decodes &nbsp;', () => {
    expect(htmlToText('Hello&nbsp;World')).toBe('Hello World');
  });

  it('decodes &amp;', () => {
    expect(htmlToText('A&amp;B')).toBe('A&B');
  });

  it('decodes &lt; and &gt;', () => {
    expect(htmlToText('&lt;tag&gt;')).toBe('<tag>');
  });

  it('decodes &quot;', () => {
    expect(htmlToText('Say &quot;Hello&quot;')).toBe('Say "Hello"');
  });

  it('decodes numeric entities', () => {
    expect(htmlToText('&#65;&#66;&#67;')).toBe('ABC');
  });

  it('collapses multiple newlines to max 2', () => {
    expect(htmlToText('<p>A</p><p>B</p><p>C</p>')).toBe('A\n\nB\n\nC');
  });

  it('trims whitespace', () => {
    expect(htmlToText('  <p>Hello</p>  ')).toBe('Hello');
  });

  it('handles complex HTML', () => {
    const html = `
      <html>
        <head><style>body { margin: 0; }</style></head>
        <body>
          <h1>Title</h1>
          <p>Paragraph with <strong>bold</strong> text.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </body>
      </html>
    `;
    const text = htmlToText(html);
    expect(text).toContain('Title');
    expect(text).toContain('Paragraph with bold text.');
    expect(text).toContain('• Item 1');
    expect(text).toContain('• Item 2');
    expect(text).not.toContain('margin');
  });
});

describe('isValidEmail', () => {
  it('validates simple email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('validates email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('validates email with plus sign', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('validates email with dots in local part', () => {
    expect(isValidEmail('user.name@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email without local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects email without TLD', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('getEmailDomain', () => {
  it('extracts domain from simple email', () => {
    expect(getEmailDomain('user@example.com')).toBe('example.com');
  });

  it('extracts domain with subdomain', () => {
    expect(getEmailDomain('user@mail.example.com')).toBe('mail.example.com');
  });

  it('returns null for invalid email without @', () => {
    expect(getEmailDomain('userexample.com')).toBe(null);
  });

  it('handles email with multiple @', () => {
    expect(getEmailDomain('user@@example.com')).toBe('example.com');
  });

  it('returns null for empty string', () => {
    expect(getEmailDomain('')).toBe(null);
  });
});

describe('parseEmailDate', () => {
  it('parses RFC 2822 date', () => {
    const date = parseEmailDate('Wed, 25 Dec 2024 10:30:00 GMT');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11); // December
    expect(date.getDate()).toBe(25);
  });

  it('parses ISO 8601 date', () => {
    const date = parseEmailDate('2024-12-25T10:30:00Z');
    expect(date.getFullYear()).toBe(2024);
  });

  it('returns current date for invalid date string', () => {
    const before = Date.now();
    const date = parseEmailDate('not a date');
    const after = Date.now();
    expect(date.getTime()).toBeGreaterThanOrEqual(before);
    expect(date.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns current date for empty string', () => {
    const before = Date.now();
    const date = parseEmailDate('');
    const after = Date.now();
    expect(date.getTime()).toBeGreaterThanOrEqual(before);
    expect(date.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('formatEmailDate', () => {
  it('formats date to RFC 2822 format', () => {
    const date = new Date('2024-12-25T10:30:00Z');
    const formatted = formatEmailDate(date);
    expect(formatted).toBe('Wed, 25 Dec 2024 10:30:00 GMT');
  });

  it('includes day of week', () => {
    const date = new Date('2024-12-25T00:00:00Z');
    const formatted = formatEmailDate(date);
    expect(formatted).toContain('Wed');
  });
});

describe('base64url roundtrip with atob/btoa', () => {
  const originalAtob = globalThis.atob;
  const originalBtoa = globalThis.btoa;

  beforeEach(() => {
    // Ensure atob/btoa are available (they should be in Node 18+)
    if (typeof atob === 'undefined') {
      globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
      globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
    }
  });

  afterEach(() => {
    globalThis.atob = originalAtob;
    globalThis.btoa = originalBtoa;
  });

  it('handles roundtrip encoding/decoding', () => {
    const testStrings = [
      'Hello World',
      'Special chars: àéïöü',
      '日本語テスト',
      'Line1\nLine2',
      '',
    ];

    for (const str of testStrings) {
      const encoded = encodeBase64Url(str);
      const decoded = decodeBase64Url(encoded);
      expect(decoded).toBe(str);
    }
  });
});

describe('base64url without atob/btoa (Buffer fallback)', () => {
  const originalAtob = globalThis.atob;
  const originalBtoa = globalThis.btoa;

  beforeEach(() => {
    // @ts-expect-error - intentionally removing for test
    globalThis.atob = undefined;
    // @ts-expect-error - intentionally removing for test
    globalThis.btoa = undefined;
  });

  afterEach(() => {
    globalThis.atob = originalAtob;
    globalThis.btoa = originalBtoa;
  });

  it('encodes using Buffer fallback', () => {
    const encoded = encodeBase64Url('Hello');
    expect(encoded).toBe('SGVsbG8');
  });

  it('decodes using Buffer fallback', () => {
    const decoded = decodeBase64Url('SGVsbG8');
    expect(decoded).toBe('Hello');
  });
});

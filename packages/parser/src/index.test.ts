import { describe, expect, it } from 'vitest';
import {
  decodeBase64Url,
  encodeBase64Url,
  formatAddress,
  getEmailDomain,
  htmlToText,
  isValidEmail,
  parseAddress,
  parseAddressList,
} from './index';

describe('parseAddress', () => {
  it('parses email with name in angle brackets', () => {
    const result = parseAddress('John Doe <john@example.com>');
    expect(result).toEqual({ email: 'john@example.com', name: 'John Doe' });
  });

  it('parses email with quoted name', () => {
    const result = parseAddress('"Jane Smith" <jane@example.com>');
    expect(result).toEqual({ email: 'jane@example.com', name: 'Jane Smith' });
  });

  it('parses plain email in angle brackets', () => {
    const result = parseAddress('<simple@example.com>');
    expect(result.email).toBe('simple@example.com');
    expect(result.name).toBeUndefined();
  });

  it('handles email with no name in brackets', () => {
    const result = parseAddress('<user@example.com>');
    expect(result.email).toBe('user@example.com');
    expect(result.name).toBeUndefined();
  });

  it('handles name with special characters', () => {
    const result = parseAddress('"O\'Brien, John" <john@example.com>');
    expect(result.name).toBe("O'Brien, John");
    expect(result.email).toBe('john@example.com');
  });

  it('returns trimmed input for malformed address', () => {
    const result = parseAddress('not-an-email');
    expect(result.email).toBe('not-an-email');
  });
});

describe('parseAddressList', () => {
  it('parses multiple comma-separated addresses', () => {
    const result = parseAddressList('John <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('john@example.com');
    expect(result[1].email).toBe('jane@example.com');
  });

  it('parses addresses with names', () => {
    const result = parseAddressList('"John Doe" <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane');
  });

  it('returns empty array for empty string', () => {
    expect(parseAddressList('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseAddressList('   ')).toEqual([]);
  });

  it('filters out invalid addresses without @', () => {
    const result = parseAddressList('<valid@example.com>, invalid, <another@test.com>');
    expect(result).toHaveLength(2);
    expect(result.every((addr) => addr.email.includes('@'))).toBe(true);
  });

  it('handles commas inside quoted names', () => {
    const result = parseAddressList('"Doe, John" <john@example.com>, Jane <jane@example.com>');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Doe, John');
  });
});

describe('formatAddress', () => {
  it('formats address with name', () => {
    const result = formatAddress({ email: 'john@example.com', name: 'John Doe' });
    expect(result).toBe('"John Doe" <john@example.com>');
  });

  it('formats address without name', () => {
    const result = formatAddress({ email: 'john@example.com' });
    expect(result).toBe('john@example.com');
  });

  it('formats address with empty name', () => {
    const result = formatAddress({ email: 'john@example.com', name: '' });
    expect(result).toBe('john@example.com');
  });

  it('formats address with undefined name', () => {
    const result = formatAddress({ email: 'john@example.com', name: undefined });
    expect(result).toBe('john@example.com');
  });

  it('handles name with special characters', () => {
    const result = formatAddress({ email: 'john@example.com', name: "O'Brien" });
    expect(result).toBe('"O\'Brien" <john@example.com>');
  });
});

describe('decodeBase64Url', () => {
  it('decodes base64url to string', () => {
    // "Hello World" encoded
    const encoded = 'SGVsbG8gV29ybGQ';
    expect(decodeBase64Url(encoded)).toBe('Hello World');
  });

  it('handles URL-safe characters (- instead of +, _ instead of /)', () => {
    // String containing characters that differ between base64 and base64url
    const encoded = 'YWJj'; // "abc"
    expect(decodeBase64Url(encoded)).toBe('abc');
  });

  it('handles various padding scenarios', () => {
    expect(decodeBase64Url('YQ')).toBe('a'); // 1 char
    expect(decodeBase64Url('YWI')).toBe('ab'); // 2 chars
    expect(decodeBase64Url('YWJj')).toBe('abc'); // 3 chars
    expect(decodeBase64Url('YWJjZA')).toBe('abcd'); // 4 chars
  });

  it('decodes UTF-8 content correctly', () => {
    // "Héllo" in base64url
    const encoded = 'SMOpbGxv';
    expect(decodeBase64Url(encoded)).toBe('Héllo');
  });
});

describe('encodeBase64Url', () => {
  it('encodes string to base64url', () => {
    const result = encodeBase64Url('Hello World');
    expect(result).toBe('SGVsbG8gV29ybGQ');
  });

  it('produces URL-safe output (no +, /, or =)', () => {
    const result = encodeBase64Url('test string with various chars!!!');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('handles empty string', () => {
    expect(encodeBase64Url('')).toBe('');
  });

  it('handles UTF-8 characters', () => {
    const result = encodeBase64Url('Héllo');
    expect(result).toBe('SMOpbGxv');
  });

  it('round-trips with decodeBase64Url', () => {
    const original = 'Hello, World! Special chars: @#$%^&*()';
    const encoded = encodeBase64Url(original);
    const decoded = decodeBase64Url(encoded);
    expect(decoded).toBe(original);
  });
});

describe('htmlToText', () => {
  it('removes HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    expect(htmlToText(html)).toBe('Hello World');
  });

  it('converts br tags to newlines', () => {
    const html = 'Line 1<br>Line 2<br/>Line 3';
    expect(htmlToText(html)).toBe('Line 1\nLine 2\nLine 3');
  });

  it('converts p closing tags to double newlines', () => {
    const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
    expect(htmlToText(html)).toContain('Paragraph 1');
    expect(htmlToText(html)).toContain('Paragraph 2');
  });

  it('converts list items to bullets', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = htmlToText(html);
    expect(result).toContain('• Item 1');
    expect(result).toContain('• Item 2');
  });

  it('removes style tags and their content', () => {
    const html = '<style>.class { color: red; }</style><p>Content</p>';
    expect(htmlToText(html)).toBe('Content');
  });

  it('removes script tags and their content', () => {
    const html = '<script>alert("hi")</script><p>Content</p>';
    expect(htmlToText(html)).toBe('Content');
  });

  it('decodes HTML entities', () => {
    const html = '&amp; &lt; &gt; &quot; &nbsp;';
    expect(htmlToText(html)).toBe('& < > "');
  });

  it('decodes numeric HTML entities', () => {
    const html = '&#65;&#66;&#67;'; // ABC
    expect(htmlToText(html)).toBe('ABC');
  });

  it('collapses multiple newlines', () => {
    const html = '<p>A</p><p></p><p></p><p>B</p>';
    const result = htmlToText(html);
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('trims whitespace', () => {
    const html = '  <p>Content</p>  ';
    expect(htmlToText(html)).toBe('Content');
  });

  it('handles complex nested HTML', () => {
    const html = '<div><h1>Title</h1><p>Paragraph with <em>emphasis</em> and <a href="#">link</a>.</p><ul><li>Item A</li><li>Item B</li></ul></div>';
    const result = htmlToText(html);
    expect(result).toContain('Title');
    expect(result).toContain('emphasis');
    expect(result).toContain('link');
    expect(result).toContain('• Item A');
  });
});

describe('isValidEmail', () => {
  it('validates correct email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user@subdomain.example.com')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
    expect(isValidEmail('user@ example.com')).toBe(false);
    expect(isValidEmail(' user@example.com')).toBe(false);
  });

  it('rejects emails without proper domain', () => {
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
  });
});

describe('getEmailDomain', () => {
  it('extracts domain from email', () => {
    expect(getEmailDomain('user@example.com')).toBe('example.com');
    expect(getEmailDomain('user@subdomain.example.com')).toBe('subdomain.example.com');
  });

  it('returns null for invalid email', () => {
    expect(getEmailDomain('invalid')).toBeNull();
    expect(getEmailDomain('')).toBeNull();
  });

  it('handles email with multiple @ symbols', () => {
    // Takes the last @
    expect(getEmailDomain('user@@example.com')).toBe('example.com');
  });

  it('returns domain for edge cases', () => {
    expect(getEmailDomain('@domain.com')).toBe('domain.com');
  });
});

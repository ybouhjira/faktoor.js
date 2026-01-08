import { z } from 'zod';

/**
 * Schema for email addresses with optional display name
 */
export const AddressSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export type AddressInput = z.infer<typeof AddressSchema>;

/**
 * Schema for attachment input when sending emails
 */
export const AttachmentInputSchema = z
  .object({
    filename: z.string().min(1, 'Filename is required'),
    content: z
      .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array), z.string()])
      .optional(),
    path: z.string().optional(),
    mimeType: z.string().optional(),
    contentId: z.string().optional(),
  })
  .refine((data) => data.content !== undefined || data.path !== undefined, {
    message: 'Either content or path must be provided',
  });

export type AttachmentInputType = z.infer<typeof AttachmentInputSchema>;

/**
 * Schema for send options
 */
export const SendOptionsSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  replyTo: z.string().email().optional(),
  subject: z.string().min(1, 'Subject is required'),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(AttachmentInputSchema).optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type SendOptionsInput = z.infer<typeof SendOptionsSchema>;

/**
 * Schema for list options when querying emails
 */
export const ListOptionsSchema = z.object({
  folder: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  unreadOnly: z.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  after: z.date().optional(),
  before: z.date().optional(),
  hasAttachment: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
  query: z.string().optional(),
});

export type ListOptionsInput = z.infer<typeof ListOptionsSchema>;

/**
 * Validates send options and returns parsed data
 * @throws ZodError if validation fails
 */
export function validateSendOptions(data: unknown): SendOptionsInput {
  return SendOptionsSchema.parse(data);
}

/**
 * Validates an address and returns parsed data
 * @throws ZodError if validation fails
 */
export function validateAddress(data: unknown): AddressInput {
  return AddressSchema.parse(data);
}

/**
 * Validates list options and returns parsed data
 * @throws ZodError if validation fails
 */
export function validateListOptions(data: unknown): ListOptionsInput {
  return ListOptionsSchema.parse(data);
}

/**
 * Safe validation for send options (returns result object instead of throwing)
 */
export function safeParseSendOptions(data: unknown) {
  return SendOptionsSchema.safeParse(data);
}

/**
 * Safe validation for address (returns result object instead of throwing)
 */
export function safeParseAddress(data: unknown) {
  return AddressSchema.safeParse(data);
}

/**
 * Safe validation for list options (returns result object instead of throwing)
 */
export function safeParseListOptions(data: unknown) {
  return ListOptionsSchema.safeParse(data);
}

/**
 * faktoor.js - All-in-one email toolkit
 *
 * This is the meta package that re-exports everything from:
 * - @faktoor/core - Core types, client, and interfaces
 * - @faktoor/gmail - Gmail provider
 *
 * Usage:
 *   import { createMail, gmail } from 'faktoor.js';
 */

// Re-export everything from @faktoor/core
export * from '@faktoor/core';

// Re-export everything from @faktoor/gmail
export * from '@faktoor/gmail';

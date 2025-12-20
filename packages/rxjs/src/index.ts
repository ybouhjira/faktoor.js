import { Observable, from, defer } from 'rxjs';
import type { MailClient, Email, ListOptions, SendOptions, SendResult, StreamOptions } from '@faktoor/core';

/**
 * Observable-based wrapper around MailClient
 */
export interface ObservableMailClient {
  /** List emails as an Observable */
  list$: (options?: ListOptions) => Observable<Email[]>;
  /** Get a single email by ID as an Observable */
  get$: (id: string) => Observable<Email>;
  /** Send an email as an Observable */
  send$: (options: SendOptions) => Observable<SendResult>;
  /** Stream emails as an Observable (emits each email individually) */
  stream$: (options?: StreamOptions) => Observable<Email>;
}

/**
 * Creates an Observable-based wrapper around a MailClient
 *
 * @param client - The MailClient instance to wrap
 * @returns An object with Observable-based methods
 *
 * @example
 * ```ts
 * import { createMail } from '@faktoor/core';
 * import { createGmailProvider } from '@faktoor/gmail';
 * import { fromMailClient } from '@faktoor/rxjs';
 *
 * const client = createMail({ provider: createGmailProvider({ ... }) });
 * const rx = fromMailClient(client);
 *
 * // List emails reactively
 * rx.list$({ folder: 'inbox', limit: 10 }).subscribe(emails => {
 *   console.log('Received emails:', emails);
 * });
 *
 * // Stream emails one by one
 * rx.stream$().pipe(
 *   take(5)
 * ).subscribe(email => {
 *   console.log('Got email:', email.subject);
 * });
 * ```
 */
export function fromMailClient(client: MailClient): ObservableMailClient {
  return {
    list$: (options?: ListOptions): Observable<Email[]> =>
      defer(() => from(client.list(options))),

    get$: (id: string): Observable<Email> =>
      defer(() => from(client.get(id))),

    send$: (options: SendOptions): Observable<SendResult> =>
      defer(() => from(client.send(options))),

    stream$: (options?: StreamOptions): Observable<Email> =>
      new Observable((subscriber) => {
        (async () => {
          for await (const email of client.stream(options)) {
            if (subscriber.closed) break;
            subscriber.next(email);
          }
          subscriber.complete();
        })().catch((err) => subscriber.error(err));
      }),
  };
}

// Re-export useful RxJS operators for convenience
export { retry, timer, from, defer, Observable } from 'rxjs';
export { mergeMap, switchMap, catchError, take, filter, map } from 'rxjs/operators';

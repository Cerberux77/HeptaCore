import type { SendTransactionalEmailInput, SendTransactionalEmailResult, TransactionalEmailProvider } from "../email-provider";

export function createFakeEmailProvider(): TransactionalEmailProvider & {
  sentEmails: SendTransactionalEmailInput[];
  setFailNext(error?: string): void;
} {
  let failNextError: string | undefined;
  const sentEmails: SendTransactionalEmailInput[] = [];
  return {
    sentEmails,
    setFailNext(error?: string) { failNextError = error; },
    async send(input: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
      if (failNextError) {
        const err = failNextError;
        failNextError = undefined;
        throw new Error(err);
      }
      sentEmails.push(input);
      return { provider: "fake", providerMessageId: `fake_${Date.now()}`, accepted: true };
    },
  };
}

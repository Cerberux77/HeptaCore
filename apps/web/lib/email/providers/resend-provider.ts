import { Resend } from "resend";
import type { SendTransactionalEmailInput, SendTransactionalEmailResult, TransactionalEmailProvider } from "../email-provider";

export function createResendProvider(apiKey: string): TransactionalEmailProvider {
  const resend = new Resend(apiKey);
  return {
    async send(input: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
      try {
        const result = await resend.emails.send({
          from: input.from,
          to: [input.to],
          replyTo: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
          tags: input.tags,
        }, {
          idempotencyKey: input.idempotencyKey,
        });
        if (result.error) {
          return { provider: "resend", accepted: false, error: result.error.message };
        }
        return { provider: "resend", providerMessageId: result.data?.id, accepted: true };
      } catch (err: any) {
        return { provider: "resend", accepted: false, error: err?.message || "Unknown Resend error" };
      }
    },
  };
}

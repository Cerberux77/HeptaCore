export interface SendTransactionalEmailInput {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendTransactionalEmailResult {
  provider: string;
  providerMessageId?: string;
  accepted: boolean;
  error?: string;
}

export interface TransactionalEmailProvider {
  send(input: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult>;
}

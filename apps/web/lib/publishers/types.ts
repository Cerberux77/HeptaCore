export interface PublisherCapabilities {
  textOnly: boolean;
  image: boolean;
  video: boolean;
  carousel: boolean;
  story: boolean;
  reels: boolean;
  scheduling: boolean;
}

export interface PublishInput {
  targetId: string;
  accessToken: string;
  mediaUrl?: string | null;
  caption: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
}

export interface PublishResult {
  externalPostId: string;
  providerResponse: unknown;
}

export interface ProviderErrorMeta {
  code?: number;
  subcode?: number;
  fbtrace?: string;
  type?: string;
  httpStatus?: number;
}

export class ProviderError extends Error {
  readonly meta: ProviderErrorMeta;
  readonly isAmbiguous: boolean;

  constructor(message: string, meta: ProviderErrorMeta & { isAmbiguous?: boolean }) {
    super(message);
    this.name = "ProviderError";
    this.meta = { code: meta.code, subcode: meta.subcode, fbtrace: meta.fbtrace, type: meta.type, httpStatus: meta.httpStatus };
    this.isAmbiguous = meta.isAmbiguous ?? false;
  }
}

export interface Publisher {
  readonly network: string;
  readonly capabilities: PublisherCapabilities;
  readonly credentialLabel: string;
  readonly requiredScopes: string[];
  publish(input: PublishInput): Promise<PublishResult>;
}

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

export interface Publisher {
  readonly network: string;
  readonly capabilities: PublisherCapabilities;
  readonly credentialLabel: string;
  readonly requiredScopes: string[];
  publish(input: PublishInput): Promise<PublishResult>;
}

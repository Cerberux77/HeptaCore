import { PublishInput, PublishResult, Publisher, PublisherCapabilities } from "./types";
import { publishInstagramMedia } from "../instagram-publisher";

const capabilities: PublisherCapabilities = {
  textOnly: false,
  image: true,
  video: true,
  carousel: false,
  story: true,
  reels: true,
  scheduling: false,
};

async function publishViaInstagram(input: PublishInput): Promise<PublishResult> {
  const result = await publishInstagramMedia({
    igUserId: input.targetId,
    accessToken: input.accessToken,
    mediaUrl: input.mediaUrl!,
    caption: input.caption,
    mediaType: input.mediaType,
    format: input.format,
  });

  return {
    externalPostId: result.externalPostId,
    providerResponse: result.providerResponse,
  };
}

export const instagramPublisher: Publisher = {
  network: "INSTAGRAM",
  capabilities,
  credentialLabel: "instagram_oauth",
  requiredScopes: ["instagram_business_content_publish"],
  publish: publishViaInstagram,
};

import { registerPublisher } from "./registry";
import { instagramPublisher } from "./instagram";
import { facebookPagePublisher } from "./facebook-page";
import { youtubePublisher } from "./youtube";

registerPublisher(instagramPublisher);
registerPublisher(facebookPagePublisher);
registerPublisher(youtubePublisher);

export { getPublisher, getImplementedNetworks } from "./registry";
export type { Publisher, PublisherCapabilities, PublishInput, PublishResult } from "./types";
export { instagramPublisher } from "./instagram";
export { facebookPagePublisher } from "./facebook-page";
export { youtubePublisher } from "./youtube";

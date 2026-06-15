import { registerPublisher } from "./registry";
import { instagramPublisher } from "./instagram";
import { facebookPagePublisher } from "./facebook-page";

registerPublisher(instagramPublisher);
registerPublisher(facebookPagePublisher);

export { getPublisher, getImplementedNetworks } from "./registry";
export type { Publisher, PublisherCapabilities, PublishInput, PublishResult } from "./types";
export { instagramPublisher } from "./instagram";
export { facebookPagePublisher } from "./facebook-page";

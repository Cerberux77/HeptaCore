import { Publisher } from "./types";

const registry = new Map<string, Publisher>();

export function registerPublisher(publisher: Publisher): void {
  registry.set(publisher.network, publisher);
}

export function getPublisher(network: string): Publisher | undefined {
  return registry.get(network);
}

export function getImplementedNetworks(): string[] {
  return Array.from(registry.keys());
}

// Built-in stub for unimplemented networks
const unimplementedPublisher = (network: string): Publisher => ({
  network,
  capabilities: {
    textOnly: false,
    image: false,
    video: false,
    carousel: false,
    story: false,
    reels: false,
    scheduling: false,
  },
  credentialLabel: "",
  requiredScopes: [],
  publish: async () => {
    throw new Error(`Publishing to ${network} is not implemented.`);
  },
});

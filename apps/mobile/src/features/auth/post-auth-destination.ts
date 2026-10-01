export type PostAuthDestination = '/(tabs)/projects';

// A one-session navigation handoff, not account data. Keeping it in memory
// prevents an onboarding skip from becoming a permanent redirect.
let destination: PostAuthDestination | null = null;

export function stagePostAuthDestination(value: PostAuthDestination): void {
  destination = value;
}

export function consumePostAuthDestination(): PostAuthDestination | null {
  const value = destination;
  destination = null;
  return value;
}

/**
 * Shared types for the multi-provider model management system.
 */

/** A single API provider (host + key pair). */
export interface Provider {
  id: string
  name: string
  apiHost: string
  apiKey: string
}

/** A model item associated with a specific provider. */
export interface ModelItem {
  id: string
  providerId: string
}

/** Generate a unique provider ID */
export function generateProviderId(): string {
  return `provider_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

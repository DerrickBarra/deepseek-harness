/** React-free browser identity service loader entry. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { BrandingService } from './contract.ts'
import { BrandingRuntime } from './runtime.ts'

export type {
  BrandingDefinition, BrandingService, BrandingSnapshot, BrandingSourceId,
} from './contract.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Active browser identity registry. */
    branding: BrandingService
  }
}

/** Cordis plugin name. */
export const name = 'client-branding'

/**
 * Provide the always-mounted browser branding registry.
 * @param ctx Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.provide('branding', new BrandingRuntime())
}

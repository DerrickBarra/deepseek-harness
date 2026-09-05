/** Chat-owned registry for settled-message file-mention providers. */
import { Service, type Context } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  ChatFileMentionProvider, ChatFileMentionProviderSnapshot, ChatFileMentions, TurnTailOwnerProps,
} from './contract/slots.ts'

interface ProviderEntry {
  readonly provider: ChatFileMentionProvider
  readonly priority: number
  readonly order: number
}

interface LiveState {
  readonly entries: Map<string, ProviderEntry>
  readonly providers: ReturnType<typeof createSnapshotStore<readonly ChatFileMentionProviderSnapshot[]>>
  nextOrder: number
}

/** Chat file-mention registry installed as `ctx.chatFileMentions`. */
export class ChatFileMentionRegistry extends Service implements ChatFileMentions {
  private readonly live: LiveState = {
    entries: new Map(),
    providers: createSnapshotStore<readonly ChatFileMentionProviderSnapshot[]>([]),
    nextOrder: 0,
  }

  /** @param ctx - Chat plugin context that owns the service. */
  constructor(ctx: Context) {
    super(ctx, 'chatFileMentions')
  }

  /** @inheritdoc */
  get providers() {
    return this.live.providers
  }

  /** @inheritdoc */
  register(provider: ChatFileMentionProvider): () => void {
    const { live } = this
    if (live.entries.has(provider.name)) {
      throw new Error(`chat file-mention provider "${provider.name}" is already registered`)
    }
    const entry: ProviderEntry = {
      provider,
      priority: provider.priority ?? 0,
      order: live.nextOrder++,
    }
    const dispose = this.ctx.effect(() => {
      live.entries.set(provider.name, entry)
      this.publish()
      return () => {
        live.entries.delete(provider.name)
        this.publish()
      }
    }, `chat file mentions: ${provider.name}`)
    return () => { void dispose() }
  }

  /** @inheritdoc */
  forClosing(owner: TurnTailOwnerProps): MarkdownFileMentions | undefined {
    const resolvers: Array<{ readonly name: string; readonly mentions: MarkdownFileMentions }> = []
    for (const { provider } of this.sortedEntries()) {
      try {
        const mentions = provider.forClosing(owner)
        if (mentions !== undefined) resolvers.push({ name: provider.name, mentions })
      } catch (error) {
        this.warn(provider.name, 'closing-turn setup', error)
      }
    }
    if (resolvers.length === 0) return undefined
    return {
      resolve: (token) => {
        for (const { name, mentions } of resolvers) {
          try {
            const resolved = mentions.resolve(token)
            if (resolved !== undefined) return resolved
          } catch (error) {
            this.warn(name, 'token resolution', error)
          }
        }
        return undefined
      },
    }
  }

  private sortedEntries(): readonly ProviderEntry[] {
    return [...this.live.entries.values()].sort((left, right) =>
      left.priority - right.priority || left.order - right.order)
  }

  private publish(): void {
    this.live.providers.set(this.sortedEntries().map(({ provider, priority }) => ({
      name: provider.name,
      priority,
    })))
  }

  private warn(name: string, operation: string, error: unknown): void {
    this.ctx.logger.warn(`chat file-mention provider "${name}" failed during ${operation}`)
    this.ctx.logger.warn(error)
  }
}

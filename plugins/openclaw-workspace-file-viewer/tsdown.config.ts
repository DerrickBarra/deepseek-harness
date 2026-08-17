import { clientBundle } from '../../packages/client/tsdown.client.ts'

export default clientBundle('@openclaw/dsh-workspace-file-viewer', [
  'lib/types/index.js',
  'lib/types/invariant.js',
], { hostPhase: true })

/** Shared agent-loop scheduler defaults.
 * @module dsh-agent-loop/constants
 */

/** Default maximum in-flight parallel-safe calls per agent step. */
export const DEFAULT_MAX_PARALLEL_TOOL_CALLS = 10

/** Default retries after a normal stop yields reasoning without final output. */
export const DEFAULT_REASONING_ONLY_STOP_RETRIES = 2

/** Maximum reasoning suffix retained in an empty-answer diagnostic event. */
export const EMPTY_ANSWER_TAIL_CHARS = 512

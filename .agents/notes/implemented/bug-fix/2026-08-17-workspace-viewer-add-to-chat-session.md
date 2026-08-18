# Agent Note: Workspace viewer Add to chat targets a session draft

Status: implemented

English | [中文](2026-08-17-workspace-viewer-add-to-chat-session.zh.md)

## Problem

The workspace file viewer's `Add to chat` action reads and writes the conversation draft through `ctx.conversation.input`, whose public facade is session-scoped. When the Web app is in the no-session view, the action has no active session scope to resolve, so choosing a file or folder from the viewer leaves the visible composer empty and reports that no active chat session is available.

## Decision

The browser plugin resolves a target session before writing the draft. If a current session exists, the action keeps using it. If no session is current, the plugin finds the workspace whose path most specifically contains the selected absolute file or folder path, connects that workspace to its reusable or newly created blank session through `ctx.workspaces.connectWorkspace`, opens the returned session, and writes the absolute path through that session's input facade. If no workspace contains the path, the recent workspace remains the fallback target; if no target can be resolved, the localized no-session error still surfaces.

The overlay accepts an asynchronous `addToChat` injection and reports rejected promises through its existing inline error strip. It clears stale viewer errors only after draft insertion succeeds, so a connection or scope failure remains visible.

## Alternatives considered

**Keep requiring an active session.** Rejected because the visible product surface offers the viewer before a session is selected; a command that looks available must populate the draft users can see.

**Maintain a separate no-session draft store.** Rejected because the shipped composer draft is owned by the session input machine. A parallel store would need handoff rules for workspace selection, submission, command parsing, notices, images, and undo behavior.

**Start the generic New Session flow without awaiting a session id.** Rejected because `ctx.workspaces.startSession` intentionally owns navigation only. The file action must know which session draft to mutate before it can report success.

## Consequences

The action may create or reuse a blank workspace session before inserting text. That matches the existing workspace picker handoff behavior and keeps submission, command parsing, and notices on the canonical session input path. A selected path outside known workspaces can land in the recent workspace's blank session; this preserves a visible draft instead of failing when the viewer root is broader than the registered workspace list. Focused client tests cover both active-session insertion and no-current-session creation before insertion.

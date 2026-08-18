/** Workspace file viewer UI plugin, browser half. */
import workspaceFileViewerRemote from '@openclaw/dsh-workspace-file-viewer/remote';
import { WorkspaceFileViewerAction, WorkspaceFileViewerOverlay, } from "./WorkspaceFileViewerPanel.js";
import { en, NS, zh } from "./locales.js";
/** Services required before this plugin can mount its own Remote namespace and UI. */
export const inject = ['slots', 'locale', 'remote', 'sessions', 'workspaces', 'conversation'];
/** Mount the package Remote contribution, sidebar action, and shell overlay. */
export async function apply(ctx) {
    await ctx.remote.$mount(workspaceFileViewerRemote);
    const remote = () => {
        const namespace = ctx.get('remote.workspaceFileViewer');
        if (namespace === undefined)
            throw new Error('workspaceFileViewer Remote namespace is unavailable');
        return namespace;
    };
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace-file-viewer: dictionaries');
    const injected = () => ({
        roots: async () => {
            const result = await remote().roots();
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        list: async (rootId, path) => {
            const result = await remote().list(rootId, path);
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        read: async (rootId, path) => {
            const result = await remote().read(rootId, path);
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        save: async (rootId, path, content) => {
            const result = await remote().save(rootId, path, content);
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        addToChat: async (path) => {
            if (await insertPathIntoVisibleComposer(path))
                return;
            const sessionId = await resolveSessionForDraft(ctx, path);
            const binding = ctx.sessions.binding(sessionId);
            if (binding === undefined) {
                if (await insertPathIntoVisibleComposer(path))
                    return;
                throw new Error(ctx.locale.bind(NS)('chat.noSession'));
            }
            const input = ctx.conversation.input.for(binding.ctx);
            const draft = input.state.getSnapshot().draft;
            input.setDraft(insertPath(draft, path));
            input.notify('info', ctx.locale.bind(NS)('chat.added'));
        },
    });
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'workspace-file-viewer',
        order: 5,
        locale: NS,
        inject: injected,
    }, WorkspaceFileViewerAction));
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'workspace-file-viewer',
        order: 10,
        locale: NS,
        inject: injected,
    }, WorkspaceFileViewerOverlay));
}
async function resolveSessionForDraft(ctx, path) {
    const current = ctx.sessions.list.getSnapshot().current;
    if (current !== undefined)
        return current;
    const target = targetWorkspaceId(ctx, path);
    if (target === undefined)
        throw new Error(ctx.locale.bind(NS)('chat.noSession'));
    const sessionId = await ctx.workspaces.connectWorkspace(target);
    ctx.sessions.open(sessionId);
    return sessionId;
}
function targetWorkspaceId(ctx, path) {
    const snapshot = ctx.workspaces.list.getSnapshot();
    return snapshot.items
        .filter(item => isSameOrChildPath(path, item.path))
        .sort((left, right) => right.path.length - left.path.length)[0]
        ?.workspaceId ?? snapshot.recentWorkspaceId;
}
function isSameOrChildPath(candidate, root) {
    const normalizedRoot = root.replace(/[/\\]+$/u, '');
    if (candidate === normalizedRoot)
        return true;
    return candidate.startsWith(`${normalizedRoot}/`) || candidate.startsWith(`${normalizedRoot}\\`);
}
function insertPath(draft, path) {
    if (draft === '')
        return path;
    return `${draft.replace(/\s*$/u, '')}\n${path}`;
}
async function insertPathIntoVisibleComposer(path) {
    const textarea = await waitForComposerTextarea();
    if (textarea === undefined)
        return false;
    const next = insertPath(textarea.value, path);
    await nextFrame();
    writeTextareaDraft(textarea, next);
    if (textarea.readOnly) {
        scheduleReadOnlyComposerWrites(textarea, next);
    }
    else {
        await nextFrame();
        if (textarea.value !== next)
            writeTextareaDraft(textarea, next);
    }
    textarea.focus({ preventScroll: true });
    return true;
}
async function waitForComposerTextarea() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const textarea = composerTextarea();
        if (textarea !== undefined)
            return textarea;
        await nextFrame();
    }
    return undefined;
}
function composerTextarea() {
    if (typeof document === 'undefined')
        return undefined;
    const candidates = Array.from(document.querySelectorAll('[data-composer-card] textarea'))
        .filter(textarea => !textarea.disabled);
    return candidates.find(textarea => !textarea.readOnly) ?? candidates[0];
}
function nextFrame() {
    if (typeof requestAnimationFrame === 'undefined') {
        return new Promise(resolve => { setTimeout(resolve, 16); });
    }
    return new Promise(resolve => { requestAnimationFrame(() => { resolve(); }); });
}
function setTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter === undefined) {
        textarea.value = value;
        return;
    }
    setter.call(textarea, value);
}
function writeTextareaDraft(textarea, value) {
    setTextareaValue(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
function scheduleReadOnlyComposerWrites(textarea, value) {
    for (const delay of [50, 150, 500, 1000, 2000]) {
        window.setTimeout(() => {
            if (!textarea.isConnected || !textarea.readOnly || textarea.value === value)
                return;
            setTextareaValue(textarea, value);
        }, delay);
    }
}
//# sourceMappingURL=index.js.map
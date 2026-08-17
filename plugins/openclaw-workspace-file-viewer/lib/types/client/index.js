/** Workspace file viewer UI plugin, browser half. */
import workspaceFileViewerRemote from '@openclaw/dsh-workspace-file-viewer/remote';
import { WorkspaceFileViewerAction, WorkspaceFileViewerOverlay, } from "./WorkspaceFileViewerPanel.js";
import { en, NS, zh } from "./locales.js";
/** Services required for the Remote-backed overlay and sidebar action. */
export const inject = ['slots', 'locale', 'remote', 'remote.workspaceFileViewer'];
/** Mount the package Remote contribution, sidebar action, and shell overlay. */
export async function apply(ctx) {
    await ctx.remote.$mount(workspaceFileViewerRemote);
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace-file-viewer: dictionaries');
    const injected = () => ({
        roots: async () => {
            const result = await ctx.remote.workspaceFileViewer.roots();
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        list: async (rootId, path) => {
            const result = await ctx.remote.workspaceFileViewer.list(rootId, path);
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
        },
        read: async (rootId, path) => {
            const result = await ctx.remote.workspaceFileViewer.read(rootId, path);
            if (!result.ok)
                throw new Error(result.error.message);
            return result.value;
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
//# sourceMappingURL=index.js.map
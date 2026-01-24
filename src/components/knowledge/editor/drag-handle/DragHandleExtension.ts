import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface DragHandleOptions {
    handleWidth: number;
}

export const GlobalDragHandle = Extension.create<DragHandleOptions>({
    name: 'globalDragHandle',

    addOptions() {
        return {
            handleWidth: 20,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('globalDragHandle'),
                props: {
                    decorations: (state) => {
                        return DecorationSet.empty; // Placeholder for real logic
                    },
                },
            }),
        ];
    },
});

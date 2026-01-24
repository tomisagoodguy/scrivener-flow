import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { getSuggestionItems, renderSuggestion } from './suggestion';

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export const configureSlashCommand = () => {
    return SlashCommand.configure({
        suggestion: {
            items: getSuggestionItems,
            render: renderSuggestion,
        },
    });
};

import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { CommandList } from './CommandList';
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Image, Text, Quote, SeparatorHorizontal } from 'lucide-react';

export const getSuggestionItems = ({ query }: { query: string }) => {
    return [
        {
            title: 'Text',
            description: 'Just start writing with plain text.',
            icon: <Text size={18} />,
            command: ({ editor, range }: any) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .toggleNode('paragraph', 'paragraph')
                    .run();
            },
        },
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            icon: <Heading1 size={18} />,
            command: ({ editor, range }: any) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 1 })
                    .run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            icon: <Heading2 size={18} />,
            command: ({ editor, range }: any) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 2 })
                    .run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            icon: <Heading3 size={18} />,
            command: ({ editor, range }: any) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setNode('heading', { level: 3 })
                    .run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list.',
            icon: <List size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a list with numbering.',
            icon: <ListOrdered size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Task List',
            description: 'Track tasks with a todo list.',
            icon: <CheckSquare size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote.',
            icon: <Quote size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: 'Divider',
            description: 'Visually divide content.',
            icon: <SeparatorHorizontal size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
        {
            title: 'Image',
            description: 'Upload an image from your device.',
            icon: <Image size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                // Trigger file upload in parent component via event or context
                // For now, we'll try to find the hidden input or use a global event. 
                // A better pattern is to exposing a method, but for simplicity we'll dispatch a custom event
                // or easier: just click the file input if it exists in the DOM.
                const input = document.getElementById('hidden-image-upload') as HTMLInputElement;
                if (input) {
                    input.click();
                }
            },
        },
    ].filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );
};

export const renderSuggestion = () => {
    let component: ReactRenderer<any>;
    let popup: any;

    return {
        onStart: (props: any) => {
            component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
            });

            if (!props.clientRect) {
                return;
            }

            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            });
        },

        onUpdate(props: any) {
            component.updateProps(props);

            if (!props.clientRect) {
                return;
            }

            popup[0].setProps({
                getReferenceClientRect: props.clientRect,
            });
        },

        onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
            }

            return component.ref?.onKeyDown(props);
        },

        onExit() {
            popup[0].destroy();
            component.destroy();
        },
    };
};

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageComponent from './ResizableImageComponent';

export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                renderHTML: (attributes) => ({
                    width: attributes.width,
                }),
                parseHTML: (element) => element.getAttribute('width'),
            },
            height: {
                default: 'auto',
                renderHTML: (attributes) => ({
                    height: attributes.height,
                }),
                parseHTML: (element) => element.getAttribute('height'),
            },
            textAlign: {
                default: 'center',
                renderHTML: (attributes) => ({
                    style: `text-align: ${attributes.textAlign}`,
                }),
                parseHTML: (element) => element.style.textAlign || 'center',
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },
});

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Resizable } from 're-resizable';
import { useState, useEffect } from 'react';

export default function ResizableImageComponent(props: NodeViewProps) {
    const { node, updateAttributes, selected } = props;

    // Default size if not set
    const defaultWidth = '100%';
    const defaultHeight = 'auto';

    const [width, setWidth] = useState(node.attrs.width || defaultWidth);
    const [height, setHeight] = useState(node.attrs.height || defaultHeight);

    useEffect(() => {
        setWidth(node.attrs.width || defaultWidth);
        setHeight(node.attrs.height || defaultHeight);
    }, [node.attrs.width, node.attrs.height]);

    return (
        <NodeViewWrapper className="image-view">
            <div
                style={{
                    display: 'flex',
                    justifyContent: node.attrs.textAlign || 'center', // Support future alignment
                    margin: '1rem 0',
                }}
            >
                <Resizable
                    size={{ width, height }}
                    onResizeStop={(e, direction, ref, d) => {
                        const newWidth = ref.style.width;
                        const newHeight = ref.style.height;

                        setWidth(newWidth);
                        setHeight(newHeight);

                        updateAttributes({
                            width: newWidth,
                            height: newHeight,
                        });
                    }}
                    enable={{
                        top: false,
                        right: selected, // Only enable handles when selected
                        bottom: false,
                        left: selected,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                    }}
                    handleStyles={{
                        right: { right: -10, width: 20, cursor: 'ew-resize' },
                        left: { left: -10, width: 20, cursor: 'ew-resize' },
                    }}
                    handleComponent={{
                        right: selected ? <div className="w-1.5 h-8 bg-indigo-500 rounded-full absolute top-1/2 -translate-y-1/2 right-1" /> : undefined,
                        left: selected ? <div className="w-1.5 h-8 bg-indigo-500 rounded-full absolute top-1/2 -translate-y-1/2 left-1" /> : undefined,
                    }}
                    className={`transition-all duration-200 ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                        }`}
                    maxWidth="100%"
                >
                    <img
                        src={node.attrs.src}
                        alt={node.attrs.alt}
                        className="rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full h-full object-cover"
                    />
                </Resizable>
            </div>
        </NodeViewWrapper>
    );
}

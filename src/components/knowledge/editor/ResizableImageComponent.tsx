import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Resizable } from 're-resizable';
import { useState, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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

    const handleAlign = (align: 'flex-start' | 'center' | 'flex-end') => {
        updateAttributes({ textAlign: align });
    };

    return (
        <NodeViewWrapper className="image-view relative group">
            <div
                style={{
                    display: 'flex',
                    justifyContent: node.attrs.textAlign || 'center',
                    margin: '1rem 0',
                }}
            >
                <div className="relative">
                    {selected && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-50">
                            <button
                                onClick={() => handleAlign('flex-start')}
                                className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${node.attrs.textAlign === 'flex-start' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}
                                title="靠左對齊"
                            >
                                <AlignLeft size={16} />
                            </button>
                            <button
                                onClick={() => handleAlign('center')}
                                className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${node.attrs.textAlign === 'center' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}
                                title="置中對齊"
                            >
                                <AlignCenter size={16} />
                            </button>
                            <button
                                onClick={() => handleAlign('flex-end')}
                                className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${node.attrs.textAlign === 'flex-end' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}
                                title="靠右對齊"
                            >
                                <AlignRight size={16} />
                            </button>
                        </div>
                    )}
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
                            right: selected,
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
                            right: selected ? <div className="w-1.5 h-8 bg-indigo-500 rounded-full absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-100 transition-opacity" /> : undefined,
                            left: selected ? <div className="w-1.5 h-8 bg-indigo-500 rounded-full absolute top-1/2 -translate-y-1/2 left-1 opacity-0 group-hover:opacity-100 transition-opacity" /> : undefined,
                        }}
                        className={`transition-all duration-200 ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                        maxWidth="100%"
                    >
                        <img
                            src={node.attrs.src}
                            alt={node.attrs.alt}
                            className="rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full h-full object-cover"
                        />
                    </Resizable>
                </div>
            </div>
        </NodeViewWrapper>
    );
}


import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import { useWindowContext } from '../../contexts/WindowContext';
import { triggerDownload } from '../../utils/exportUtils';

export const TableBlock: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className, ...props }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { document: targetDocument } = useWindowContext();
    const tableRef = useRef<HTMLTableElement>(null);

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const handleDownloadCSV = () => {
        if (!tableRef.current) return;
        const rows = Array.from(tableRef.current.querySelectorAll('tr')) as HTMLTableRowElement[];
        const csvContent = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td')) as HTMLElement[];
            return cells.map(cell => {
                const text = cell.innerText || '';
                // Escape double quotes by doubling them
                return `"${text.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `table-export-${Date.now()}.csv`);
    };

    // When fullscreen, we use a portal and a specific layout.
    if (isFullscreen) {
        return createPortal(
            <div className="fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-10 overflow-auto flex flex-col items-center animate-in fade-in duration-200 backdrop-blur-sm">
                <div className="fixed top-4 right-4 flex gap-2 z-50">
                     <button
                        onClick={handleDownloadCSV}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                        title="Download CSV"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                        title="Exit Fullscreen"
                    >
                        <Minimize2 size={16} />
                    </button>
                </div>
                <div className="w-full max-w-6xl overflow-auto custom-scrollbar p-4 bg-[var(--theme-bg-primary)] rounded-xl border border-[var(--theme-border-secondary)] shadow-2xl">
                    <table {...props} ref={tableRef} className={`w-full text-left border-collapse ${className}`}>
                        {children}
                    </table>
                </div>
            </div>,
            targetDocument.body
        );
    }

    // Normal inline rendering with a wrapper for horizontal scroll and actions
    return (
        <div className="my-4 relative group rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]/50 overflow-hidden">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={handleDownloadCSV}
                    className="p-1.5 rounded-md bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)]/50"
                    title="Download CSV"
                >
                    <Download size={14} />
                </button>
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-md bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)]/50"
                    title="Fullscreen"
                >
                    <Maximize2 size={14} />
                </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar p-1">
                <table {...props} ref={tableRef} className={`min-w-full text-sm ${className}`}>
                    {children}
                </table>
            </div>
        </div>
    );
};

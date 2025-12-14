import React, { useState } from 'react';
import { X, ClipboardPaste, Sparkles } from 'lucide-react';

export default function SmartPasteModal({ isOpen, onClose, onImport }) {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleImport = () => {
        onImport(text);
        setText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Smart Paste
                        </h2>
                        <p className="text-muted-foreground mt-1">Paste a full recipe text and we'll try to organize it for you.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <textarea
                        className="w-full h-64 p-4 rounded-xl border border-input bg-secondary/30 focus:bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none font-mono text-sm transition-all"
                        placeholder={`Paste your recipe here...

Example:
Grandma's Cookies
Prep time: 20m

Ingredients:
- 2 cups flours
- 1 cup sugar

Instructions:
1. Mix everything.
2. Bake at 350F.`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium hover:bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!text.trim()}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ClipboardPaste className="w-4 h-4" />
                        Import Recipe
                    </button>
                </div>
            </div>
        </div>
    );
}

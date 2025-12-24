import React, { useState } from 'react';
import { X, ClipboardPaste, Sparkles, Loader2 } from 'lucide-react';
import { generateRecipe } from '../lib/webllm';

export default function SmartPasteModal({ isOpen, onClose, onImport }) {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState({ text: '', progress: 0 });

    if (!isOpen) return null;

    const handleImport = async () => {
        if (!text.trim()) return;

        setIsLoading(true);
        setProgress({ text: 'Initializing AI...', progress: 0 });

        try {
            const recipe = await generateRecipe(text, (p) => {
                // WebLLM returns { text: string, progress: number } or similar
                // progress is usually 0-1
                if (p.text) {
                    setProgress({ text: p.text, progress: p.progress || 0 });
                }
            });
            onImport(recipe);
            setText('');
            onClose();
        } catch (error) {
            console.error("Smart paste failed:", error);
            alert("Failed to parse recipe. Please check console or try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Smart Paste
                        </h2>
                        <p className="text-muted-foreground mt-1">Paste a full recipe text and we'll organize it for you.</p>
                    </div>
                    {!isLoading && (
                        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{progress.text}</span>
                                    <span>{Math.round(progress.progress * 100)}%</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 ease-out"
                                        style={{ width: `${progress.progress * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground pt-4 animate-pulse">
                                    Note: First-time use requires downloading the AI model (~3GB). <br />
                                    This happens entirely in your browser.
                                </p>
                            </div>
                        </div>
                    ) : (
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
                    )}
                </div>

                <div className="p-6 border-t border-border bg-secondary/20 flex flex-col gap-3 flex-shrink-0">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!text.trim() || isLoading}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <ClipboardPaste className="w-4 h-4" />
                                    Import Recipe
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground opacity-70">
                        Powered by in-browser AI (WebLLM). No data leaves your device.
                    </p>
                </div>
            </div>
        </div>
    );
}


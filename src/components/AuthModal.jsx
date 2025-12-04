import React, { useState, useEffect } from 'react';
import { X, Lock, ExternalLink } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onSubmit }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token) {
      localStorage.setItem('github_token', token);
      onSubmit(token);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-background rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-border animate-scale-in">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            GitHub Authentication
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-muted-foreground mb-6">
            To create a Pull Request, we need a GitHub Personal Access Token with <code className="bg-secondary px-1 rounded text-sm">repo</code> scope.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-sm mb-6 border border-blue-100 dark:border-blue-900/50">
            Your token is stored locally in your browser and sent directly to GitHub. It is never saved to any server.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Personal Access Token</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                required
              />
            </div>

            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Nala%20Recipe%20Manager"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Generate a new token here <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!token}
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

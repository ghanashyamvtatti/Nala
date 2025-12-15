import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function About() {
    const [markdown, setMarkdown] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch the raw README content from the current origin/repo location
        // Since this is a client-side app, we can fetch from the public URL if we copy it there,
        // OR better yet, fetch raw content from GitHub or just import it if Vite allows raw imports.
        // Given we can't easily change vite config safely, we'll try to fetch relative to root if deployed,
        // But the safest fallback is just to hardcode the fetch to the raw github user content
        // to ensure it's always up to date with main.

        fetch('https://raw.githubusercontent.com/ghanashyamvtatti/Nala/main/README.md')
            .then(res => {
                if (!res.ok) throw new Error("Failed to load README");
                return res.text();
            })
            .then(text => setMarkdown(text))
            .catch(err => {
                console.error(err);
                setMarkdown("# Error loading content\nCould not fetch README.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="max-w-4xl mx-auto prose dark:prose-invert">
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <span className="animate-spin text-4xl">⏳</span>
                </div>
            ) : (
                <ReactMarkdown components={{
                    // Customize links to open in new tab
                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                }}>
                    {markdown}
                </ReactMarkdown>
            )}
        </div>
    );
}

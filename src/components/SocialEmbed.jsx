import React from 'react';
import { Instagram, Music2, ExternalLink } from 'lucide-react';

export default function SocialEmbed({ url }) {
    const isInstagram = url.includes('instagram.com');
    const isTikTok = url.includes('tiktok.com');

    if (isInstagram) {
        return (
            <div className="flex justify-center my-4">
                <iframe
                    src={`${url}embed`}
                    width="400"
                    height="480"
                    frameBorder="0"
                    scrolling="no"
                    allowtransparency="true"
                    className="rounded-xl shadow-sm border border-border max-w-full"
                ></iframe>
            </div>
        );
    }

    if (isTikTok) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-black text-white hover:opacity-90 transition-opacity my-4 group"
            >
                <div className="p-2 bg-white/10 rounded-full">
                    <Music2 className="w-6 h-6" />
                </div>
                <div>
                    <div className="font-bold flex items-center gap-2">
                        View on TikTok
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm text-white/60 truncate max-w-[200px] sm:max-w-xs">
                        {url}
                    </div>
                </div>
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors my-2 text-primary truncate"
        >
            {url}
        </a>
    );
}

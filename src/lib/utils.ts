import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function transformImageUrl(url?: string): string | undefined {
    if (!url) return undefined;

    if (url.includes('drive.google.com/file/d/')) {
        const parts = url.split('/d/');
        if (parts.length > 1) {
            const fileId = parts[1].split('/')[0];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }

    if (url.includes('imgur.com/') && !url.includes('i.imgur.com')) {
        try {
            const path = new URL(url).pathname;
            const imageId = path.substring(path.lastIndexOf('/') + 1);
            if (imageId) {
                // Imgur links can be .png, .jpg, etc. .jpeg is a safe guess.
                return `https://i.imgur.com/${imageId}.jpeg`;
            }
        } catch (e) {
            // if URL is invalid, just return original.
            return url;
        }
    }

    return url;
}

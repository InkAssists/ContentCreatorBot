import type { Post } from '../db/posts.js';

export interface MakePayload {
    post_id: number;
    text: string;
    text_post: string;
    image_url: string | null;
    platforms: string[];
    hashtags: string;
    link: string;
    scheduled_at: string | null;
}

export interface MakeResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Builds the final post text including hashtags and site links.
 */
export function buildPostText(post: Post, link: string): string {
    let text = post.text;
    if (post.hashtags) text += `

${post.hashtags}`;
    text += `

👉 ${link}`;
    return text;
}

export function buildMakePayload(post: Post, link = process.env.WEBSITE_URL ?? 'https://yourwebsite.com'): MakePayload {
    return {
        post_id: post.id,
        text: post.text,
        text_post: buildPostText(post, link),
        image_url: post.image_url,
        platforms: post.platforms.split(',').map(p => p.trim()).filter(Boolean),
        hashtags: post.hashtags,
        link,
        scheduled_at: post.scheduled_at,
    };
}

/**
 * Sends a finalized post to the Make.com Webhook for distribution.
 */
export async function publishViaMake(post: Post): Promise<MakeResponse> {
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) {
        return { success: false, error: 'MAKE_WEBHOOK_URL is not configured in .env' };
    }

    const payload = buildMakePayload(post);

    try {
        const response = await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `Make.com Error (${response.status}): ${errorText}`,
            };
        }

        // Make.com custom webhooks usually return "Accepted"
        const responseText = await response.text();
        return {
            success: true,
            message: responseText || 'Successfully dispatched to Make.com',
        };
    } catch (error) {
        return {
            success: false,
            error: `Network error: ${(error as Error).message}`,
        };
    }
}

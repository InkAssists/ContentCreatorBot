import { getScheduledPosts, updatePostStatus, type Post } from '../db/posts.js';
import { publishViaMake } from './makecom.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Startet den Scheduler, der minütlich nach fälligen Posts sucht
 */
export function startScheduler(): void {
    if (intervalId) return;

    console.log('⏰ Scheduler gestartet (Prüfintervall: 60s)');

    intervalId = setInterval(async () => {
        const duePosts = getScheduledPosts();
        for (const post of duePosts) {
            console.log(`📤 Geplanter Post #${post.id} wird veröffentlicht...`);
            await publishScheduledPost(post);
        }
    }, 60_000); // Jede Minute prüfen
}

async function publishScheduledPost(post: Post): Promise<void> {
    try {
        const result = await publishViaMake(post);
        if (result.success) {
            updatePostStatus(post.id, 'published', result.message);
            console.log(`✅ Post #${post.id} erfolgreich veröffentlicht`);
        } else {
            updatePostStatus(post.id, 'failed', result.error);
            console.error(`❌ Post #${post.id} fehlgeschlagen: ${result.error}`);
        }
    } catch (error) {
        updatePostStatus(post.id, 'failed', (error as Error).message);
        console.error(`❌ Post #${post.id} Fehler:`, error);
    }
}

export function stopScheduler(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('⏰ Scheduler gestoppt');
    }
}

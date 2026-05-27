import { Composer } from 'grammy';
import type { MyContext } from '../index.js';
import { getPost, schedulePost } from '../db/posts.js';

const composer = new Composer<MyContext>();

export type ScheduleParseResult =
    | { ok: true; postId: number; scheduledAt: string; scheduledDate: Date }
    | { ok: false; reason: 'missing' | 'format' | 'invalid_id' | 'invalid_date' | 'past'; scheduledAt?: string };

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseScheduleArgs(args: string | undefined, now = new Date()): ScheduleParseResult {
    const trimmed = args?.trim();
    if (!trimmed) return { ok: false, reason: 'missing' };

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return { ok: false, reason: 'format' };

    const postId = parseInt(parts[0], 10);
    if (!Number.isInteger(postId) || postId <= 0) {
        return { ok: false, reason: 'invalid_id' };
    }

    let dateStr = parts[1];
    const timeStr = parts[2];

    if (dateStr === 'morgen' || dateStr === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateStr = formatLocalDate(tomorrow);
    } else if (dateStr === 'heute' || dateStr === 'today') {
        dateStr = formatLocalDate(now);
    }

    const scheduledAt = `${dateStr} ${timeStr}`;
    const scheduledDate = new Date(scheduledAt.replace(' ', 'T'));

    if (isNaN(scheduledDate.getTime())) {
        return { ok: false, reason: 'invalid_date', scheduledAt };
    }

    if (scheduledDate <= now) {
        return { ok: false, reason: 'past', scheduledAt };
    }

    return { ok: true, postId, scheduledAt, scheduledDate };
}

composer.command('planen', async (ctx) => {
    const parsed = parseScheduleArgs(ctx.match?.toString());

    if (!parsed.ok) {
        if (parsed.reason === 'missing') {
            await ctx.reply(
                `⚠️ *Benutzung:*
` +
                `\`/planen [id] [datum] [uhrzeit]\`

` +
                `_Beispiel:_
` +
                `\`/planen 42 2026-03-15 14:00\`
` +
                `\`/planen 42 morgen 10:00\``,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        if (parsed.reason === 'format') {
            await ctx.reply('⚠️ Format: `/planen [id] [datum] [uhrzeit]`', { parse_mode: 'Markdown' });
            return;
        }

        if (parsed.reason === 'invalid_id') {
            await ctx.reply('⚠️ Bitte gib eine gültige Post-ID an.');
            return;
        }

        if (parsed.reason === 'invalid_date') {
            await ctx.reply(`❌ Ungültiges Datum: "${parsed.scheduledAt}"

Format: \`YYYY-MM-DD HH:MM\``, { parse_mode: 'Markdown' });
            return;
        }

        await ctx.reply('⚠️ Das Datum muss in der Zukunft liegen.');
        return;
    }

    const post = getPost(parsed.postId);
    if (!post) {
        await ctx.reply(`❌ Post #${parsed.postId} nicht gefunden.`);
        return;
    }

    if (post.status === 'published') {
        await ctx.reply(`ℹ️ Post #${parsed.postId} wurde bereits veröffentlicht.`);
        return;
    }

    schedulePost(parsed.postId, parsed.scheduledAt);

    await ctx.reply(
        `⏰ *Post #${parsed.postId} eingeplant*

📅 ${parsed.scheduledAt}

_Der Post wird automatisch über Make.com veröffentlicht._`,
        { parse_mode: 'Markdown' }
    );
});

export default composer;

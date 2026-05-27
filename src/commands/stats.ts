import { Composer } from 'grammy';
import type { MyContext } from '../index.js';
import { getStats } from '../db/posts.js';

const composer = new Composer<MyContext>();

composer.command('stats', async (ctx) => {
    const stats = getStats();
    const brand = process.env.BRAND_NAME || 'Social Media';

    const message = `📊 *${brand} – Dashboard*\n
━━━━━━━━━━━━━━━━━━━
📝 Entwürfe: *${stats.drafts}*
⏰ Geplant: *${stats.scheduled}*
🟢 Veröffentlicht: *${stats.published}*
━━━━━━━━━━━━━━━━━━━
📅 Diese Woche: *${stats.thisWeek}* Posts
📈 Gesamt: *${stats.total}* Posts
━━━━━━━━━━━━━━━━━━━`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
});

export default composer;

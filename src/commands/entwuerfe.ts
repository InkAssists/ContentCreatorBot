import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { getDrafts } from '../db/posts.js';

const composer = new Composer<MyContext>();

composer.command('entwuerfe', async (ctx) => {
    const drafts = getDrafts();

    if (drafts.length === 0) {
        await ctx.reply(
            '📭 *Keine Entwürfe vorhanden*\n\nErstelle einen neuen Entwurf mit /neu',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    let message = `📋 *${drafts.length} Entwurf/Entwürfe*\n\n`;

    for (const draft of drafts.slice(0, 10)) {
        const preview = draft.text.length > 80
            ? draft.text.substring(0, 80) + '...'
            : draft.text;
        message += `*#${draft.id}* — ${preview}\n_${draft.created_at}_\n\n`;
    }

    if (drafts.length > 10) {
        message += `\n_...und ${drafts.length - 10} weitere_`;
    }

    message += '\n\nVerwende `/vorschau [id]` um einen Post anzuzeigen.';

    await ctx.reply(message, { parse_mode: 'Markdown' });
});

export default composer;

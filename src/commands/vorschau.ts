import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { getPost, type Post } from '../db/posts.js';

const composer = new Composer<MyContext>();

const STATUS_EMOJI: Record<string, string> = {
    draft: '📝',
    approved: '✅',
    scheduled: '⏰',
    published: '🟢',
    failed: '❌',
};

function buildPreview(post: Post): { message: string; keyboard: InlineKeyboard } {
    const statusEmoji = STATUS_EMOJI[post.status] ?? '❓';
    let message = `${statusEmoji} *Post #${post.id}* — _${post.status}_

`;
    message += `─────────────────
${post.text}
─────────────────

`;

    if (post.hashtags) {
        message += `🏷️ *Hashtags:* ${post.hashtags}
`;
    }
    if (post.image_url) {
        message += `🖼️ *Bild:* ${post.image_url}
`;
    }
    message += `📅 *Erstellt:* ${post.created_at}
`;
    message += `📡 *Plattformen:* ${post.platforms}
`;

    if (post.scheduled_at) {
        message += `⏰ *Geplant für:* ${post.scheduled_at}
`;
    }
    if (post.published_at) {
        message += `🟢 *Veröffentlicht:* ${post.published_at}
`;
    }

    const keyboard = new InlineKeyboard();
    if (post.status === 'draft') {
        keyboard
            .text('✅ Freigeben', `freigeben_${post.id}`)
            .text('✏️ Bearbeiten', `edit_${post.id}`)
            .row()
            .text('📷 Bild', `bild_${post.id}`)
            .text('🗑️ Löschen', `delete_${post.id}`);
    } else if (post.status === 'failed') {
        keyboard.text('🔄 Erneut senden', `freigeben_${post.id}`);
    }

    return { message, keyboard };
}

composer.command('vorschau', async (ctx) => {
    const idStr = ctx.match?.toString().trim();
    if (!idStr) {
        await ctx.reply('⚠️ Bitte gib eine Post-ID an: `/vorschau 42`', { parse_mode: 'Markdown' });
        return;
    }

    const id = parseInt(idStr, 10);
    const post = getPost(id);

    if (!post) {
        await ctx.reply(`❌ Post #${id} nicht gefunden.`);
        return;
    }

    const { message, keyboard } = buildPreview(post);
    await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
});

composer.callbackQuery(/^vorschau_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseInt(ctx.match[1], 10);
    const post = getPost(id);

    if (!post) {
        await ctx.editMessageText(`❌ Post #${id} nicht gefunden.`);
        return;
    }

    const { message, keyboard } = buildPreview(post);
    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
});

export default composer;

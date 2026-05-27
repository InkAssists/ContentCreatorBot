import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { getPost, updatePostStatus, updatePostText, deletePost } from '../db/posts.js';
import { publishViaMake } from '../services/makecom.js';

const composer = new Composer<MyContext>();

// State: Welcher Post wird gerade bearbeitet?
export const pendingEdits = new Map<number, number>(); // userId -> postId

// /freigeben [id] – Direkter Befehl
composer.command('freigeben', async (ctx) => {
    const idStr = ctx.match?.toString().trim();
    if (!idStr) {
        await ctx.reply('⚠️ Bitte gib eine Post-ID an: `/freigeben 42`', { parse_mode: 'Markdown' });
        return;
    }
    await handleFreigabe(ctx, parseInt(idStr, 10));
});

// Inline-Button: freigeben_{id}
composer.callbackQuery(/^freigeben_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseInt(ctx.match[1], 10);
    await handleFreigabe(ctx, id);
});

// Inline-Button: delete_{id}
composer.callbackQuery(/^delete_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('🗑️ Post gelöscht');
    const id = parseInt(ctx.match[1], 10);
    deletePost(id);
    await ctx.editMessageText(`🗑️ Post #${id} wurde gelöscht.`);
});

// Inline-Button: edit_{id} – Zeigt den Text zum Kopieren und Bearbeiten
composer.callbackQuery(/^edit_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = parseInt(ctx.match[1], 10);
    const post = getPost(id);

    if (!post) {
        await ctx.editMessageText(`❌ Post #${id} nicht gefunden.`);
        return;
    }

    // Post-ID merken für den Text-Handler
    pendingEdits.set(ctx.from.id, id);

    await ctx.editMessageText(
        `✏️ *Post #${id} bearbeiten*\n\nKopiere den Text unten, ändere was du willst, und schick ihn zurück:`,
        { parse_mode: 'Markdown' }
    );

    // Text als separate, kopierbare Nachricht senden (ohne Markdown)
    await ctx.reply(post.text);
});

async function handleFreigabe(ctx: MyContext, postId: number): Promise<void> {
    const post = getPost(postId);
    if (!post) {
        await ctx.reply(`❌ Post #${postId} nicht gefunden.`);
        return;
    }

    if (post.status === 'published') {
        await ctx.reply(`ℹ️ Post #${postId} wurde bereits veröffentlicht.`);
        return;
    }

    // Status auf approved setzen
    updatePostStatus(postId, 'approved');

    await ctx.reply(`📤 Post #${postId} wird veröffentlicht...`);

    // An Make.com senden
    const result = await publishViaMake(post);

    if (result.success) {
        updatePostStatus(postId, 'published', result.message);
        const platforms = post.platforms.split(',').map(p => {
            if (p.trim() === 'facebook') return '📘 Facebook: ✓';
            if (p.trim() === 'twitter') return '🐦 X: ✓';
            if (p.trim() === 'instagram') return '📸 Instagram: ✓';
            return `${p.trim()}: ✓`;
        }).join('\n');

        await ctx.reply(
            `✅ *Post #${postId} veröffentlicht!*\n\n${platforms}\n\n_${result.message ?? ''}_`,
            { parse_mode: 'Markdown' }
        );
    } else {
        updatePostStatus(postId, 'failed', result.error);
        await ctx.reply(
            `❌ *Post #${postId} fehlgeschlagen*\n\n${result.error}\n\nVersuche es erneut mit \`/freigeben ${postId}\``,
            { parse_mode: 'Markdown' }
        );
    }
}

export default composer;

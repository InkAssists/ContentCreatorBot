import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { createPost } from '../db/posts.js';
import { generatePost, isAiAvailable } from '../services/ai.js';

const composer = new Composer<MyContext>();

// Conversation State für den /neu Flow
const pendingPosts = new Map<number, { step: 'choose' | 'topic' | 'write'; }>();

composer.command('neu', async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text('✍️ Selbst schreiben', 'neu_write')
        .row();

    if (isAiAvailable()) {
        keyboard.text('🤖 KI-Vorschlag', 'neu_ai').row();
    }

    await ctx.reply(
        '📝 *Neuen Post erstellen*\n\nWie möchtest du vorgehen?',
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
});

// Selbst schreiben
composer.callbackQuery('neu_write', async (ctx) => {
    await ctx.answerCallbackQuery();
    pendingPosts.set(ctx.from.id, { step: 'write' });
    await ctx.editMessageText(
        '✍️ *Selbst schreiben*\n\nSchick mir jetzt deinen Post-Text:',
        { parse_mode: 'Markdown' }
    );
});

// KI-Vorschlag
composer.callbackQuery('neu_ai', async (ctx) => {
    await ctx.answerCallbackQuery();
    pendingPosts.set(ctx.from.id, { step: 'topic' });
    await ctx.editMessageText(
        '🤖 *KI-Post generieren*\n\nWorüber soll der Post sein?\n\n_Beispiele: "Preiserhöhung bei E.ON", "Grundversorger-Treue", "Heizperiode startet"_',
        { parse_mode: 'Markdown' }
    );
});

// Text-Handler: Verarbeitet den Inhalt je nach State
composer.on('message:text', async (ctx, next) => {
    const userId = ctx.from.id;

    // Check: Wartet auf bearbeiteten Text?
    const { pendingEdits } = await import('./freigeben.js');
    const editPostId = pendingEdits.get(userId);
    if (editPostId) {
        pendingEdits.delete(userId);
        const { updatePostText, getPost } = await import('../db/posts.js');

        updatePostText(editPostId, ctx.message.text);
        const post = getPost(editPostId);

        const charCount = ctx.message.text.length;
        const charInfo = charCount > 280 ? `⚠️ ${charCount}/280` : `✅ ${charCount}/280`;

        const keyboard = new InlineKeyboard()
            .text('✅ Freigeben', `freigeben_${editPostId}`)
            .text('✏️ Nochmal ändern', `edit_${editPostId}`)
            .text('🗑️ Verwerfen', `delete_${editPostId}`);

        await ctx.reply(
            `✏️ *Post #${editPostId} aktualisiert!*\n\n─────────────────\n${ctx.message.text}\n─────────────────\n\n${charInfo} Zeichen`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        return;
    }

    // Check: Wartet auf Thema-Eingabe für /idee?
    const { pendingTopics } = await import('./idee_state.js');
    if (pendingTopics.get(userId)) {
        pendingTopics.delete(userId);
        const { generatePost } = await import('../services/ai.js');
        const { createPost: createDbPost } = await import('../db/posts.js');

        await ctx.reply(`🎯 Generiere Post zu:\n_"${ctx.message.text}"_`, { parse_mode: 'Markdown' });

        const result = await generatePost(ctx.message.text);
        if (!result) {
            await ctx.reply('❌ Generierung fehlgeschlagen. Versuch /idee nochmal.');
            return;
        }

        const post = createDbPost(result.text, result.hashtags);
        const charCount = result.text.length;
        const charInfo = charCount > 280 ? `⚠️ ${charCount}/280` : `✅ ${charCount}/280`;

        const keyboard = new InlineKeyboard()
            .text('✅ Freigeben', `freigeben_${post.id}`)
            .text('✏️ Bearbeiten', `edit_${post.id}`)
            .row()
            .text('🔄 Nochmal', 'idee_pillar_random')
            .text('🗑️ Verwerfen', `delete_${post.id}`);

        let message = `🎯 *Post-Idee #${post.id}*\n\n─────────────────\n${result.text}\n─────────────────\n\n${charInfo} Zeichen`;
        if (result.hashtags) message += ` · 🏷️ ${result.hashtags}`;
        if (result.imageIdea) message += `\n🎨 _${result.imageIdea}_`;

        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        return;
    }

    const state = pendingPosts.get(userId);

    if (!state) return next();

    if (state.step === 'write') {
        // Direkt als Post speichern
        const post = createPost(ctx.message.text);
        pendingPosts.delete(userId);

        const charCount = ctx.message.text.length;
        const charWarning = charCount > 280
            ? `\n\n⚠️ *${charCount}/280 Zeichen* — Post ist zu lang für Social Media!`
            : `\n\n✅ *${charCount}/280 Zeichen*`;

        const keyboard = new InlineKeyboard()
            .text('✅ Freigeben', `freigeben_${post.id}`)
            .text('✏️ Bearbeiten', `edit_${post.id}`)
            .text('🗑️ Verwerfen', `delete_${post.id}`);

        await ctx.reply(
            `📋 *Post #${post.id} erstellt!*\n\n─────────────────\n${post.text}\n─────────────────${charWarning}\n\nWas möchtest du tun?`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    } else if (state.step === 'topic') {
        // KI-Post generieren
        await ctx.reply('🤖 Generiere Post...');

        const result = await generatePost(ctx.message.text);
        if (!result) {
            pendingPosts.delete(userId);
            await ctx.reply('❌ KI-Generierung fehlgeschlagen. Bitte versuche es erneut mit /neu');
            return;
        }

        const post = createPost(result.text, result.hashtags);
        pendingPosts.delete(userId);

        const keyboard = new InlineKeyboard()
            .text('✅ Freigeben', `freigeben_${post.id}`)
            .text('✏️ Bearbeiten', `edit_${post.id}`)
            .row()
            .text('🔄 Neu generieren', 'neu_ai')
            .text('🗑️ Verwerfen', `delete_${post.id}`);

        let preview = `📋 *Post #${post.id}*\n\n─────────────────\n${post.text}\n─────────────────`;
        if (post.hashtags) {
            preview += `\n\n🏷️ ${post.hashtags}`;
        }
        preview += '\n\nWas möchtest du tun?';

        await ctx.reply(preview, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
});

export default composer;
export { pendingPosts };

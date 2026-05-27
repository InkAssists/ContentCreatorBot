import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import { createPost, getPost, updatePostImage } from '../db/posts.js';

const composer = new Composer<MyContext>();

// State: Wartet auf ein Bild oder eine Bild-URL für einen bestimmten Post
const pendingImages = new Map<number, number>(); // userId -> postId

function isPublicUrl(value: string): boolean {
    try {
        const url = new URL(value.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

async function attachImage(ctx: MyContext, postId: number, imageUrl: string): Promise<void> {
    const post = getPost(postId);
    if (!post) {
        await ctx.reply(`❌ Post #${postId} nicht gefunden.`);
        return;
    }

    updatePostImage(postId, imageUrl);

    const keyboard = new InlineKeyboard()
        .text('✅ Freigeben', `freigeben_${postId}`)
        .text('👁️ Vorschau', `vorschau_${postId}`);

    await ctx.reply(
        `📷 Bild zu *Post #${postId}* hinzugefügt!\n\n─────────────────\n${post.text}\n─────────────────\n\n🖼️ _Bild angehängt_`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
}

// /bild [id] oder /bild [id] [url] – Bild zu einem Post hinzufügen
composer.command('bild', async (ctx) => {
    const args = ctx.match?.toString().trim();
    if (!args) {
        await ctx.reply(
            '📷 *Bild zu Post hinzufügen*\n\n' +
            '`/bild [id]` — danach ein Telegram-Foto oder eine öffentliche Bild-URL senden.\n' +
            '`/bild [id] [url]` — Bild-URL direkt speichern.\n\n' +
            '_Oder ein Foto mit Bildunterschrift schicken, um automatisch einen neuen Post zu erstellen._',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const [idStr, imageUrl] = args.split(/\s+/, 2);
    const postId = parseInt(idStr, 10);
    const post = getPost(postId);
    if (!post) {
        await ctx.reply(`❌ Post #${postId} nicht gefunden.`);
        return;
    }

    if (imageUrl) {
        if (!isPublicUrl(imageUrl)) {
            await ctx.reply('❌ Bitte sende eine gültige öffentliche HTTP- oder HTTPS-URL.');
            return;
        }
        await attachImage(ctx, postId, imageUrl);
        return;
    }

    if (!ctx.from) return;
    pendingImages.set(ctx.from.id, postId);
    await ctx.reply(
        `📷 Schick mir jetzt das Bild oder eine öffentliche Bild-URL für *Post #${postId}*`,
        { parse_mode: 'Markdown' }
    );
});

// Inline-Button: bild_{id}
composer.callbackQuery(/^bild_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const postId = parseInt(ctx.match[1], 10);
    pendingImages.set(ctx.from.id, postId);
    await ctx.editMessageText(
        `📷 Schick mir jetzt das Bild oder eine öffentliche Bild-URL für *Post #${postId}*`,
        { parse_mode: 'Markdown' }
    );
});

// Text-Handler: Bild-URL nach /bild [id]
composer.on('message:text', async (ctx, next) => {
    const userId = ctx.from.id;
    const pendingPostId = pendingImages.get(userId);
    if (!pendingPostId) return next();

    const imageUrl = ctx.message.text.trim();
    if (!isPublicUrl(imageUrl)) {
        await ctx.reply('❌ Bitte sende eine gültige öffentliche HTTP- oder HTTPS-URL oder ein Telegram-Foto.');
        return;
    }

    pendingImages.delete(userId);
    await attachImage(ctx, pendingPostId, imageUrl);
});

// Foto-Handler: Fängt Bilder ab
composer.on('message:photo', async (ctx) => {
    const userId = ctx.from.id;
    const caption = ctx.message.caption;

    // Größtes Bild (höchste Auflösung) nehmen
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    // Fall 1: Bild wurde einem existierenden Post zugewiesen
    const pendingPostId = pendingImages.get(userId);
    if (pendingPostId) {
        pendingImages.delete(userId);
        await attachImage(ctx, pendingPostId, imageUrl);
        return;
    }

    // Fall 2: Neues Bild mit Bildunterschrift → Neuer Post
    if (caption) {
        const post = createPost(caption, '', imageUrl);

        const keyboard = new InlineKeyboard()
            .text('✅ Freigeben', `freigeben_${post.id}`)
            .text('✏️ Bearbeiten', `edit_${post.id}`)
            .text('🗑️ Verwerfen', `delete_${post.id}`);

        await ctx.reply(
            `📋 *Post #${post.id} mit Bild erstellt!*\n\n─────────────────\n${post.text}\n─────────────────\n\n🖼️ _Bild angehängt_`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        return;
    }

    // Fall 3: Bild ohne Kontext
    await ctx.reply(
        '📷 Bild empfangen! Was möchtest du tun?\n\n' +
        '• Schick das Bild nochmal *mit einer Bildunterschrift* → wird automatisch ein Post\n' +
        '• Oder verwende `/bild [id]` um das Bild einem bestehenden Post zuzuweisen',
        { parse_mode: 'Markdown' }
    );
});

export default composer;
export { pendingImages };

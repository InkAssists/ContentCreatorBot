import { Composer, InlineKeyboard } from 'grammy';
import type { MyContext } from '../index.js';
import {
    generatePost,
    generateNewsPost,
    generatePillarPost,
    isAiAvailable,
    pickRandomPillar,
    getPillarConfig,
    type Pillar,
} from '../services/ai.js';
import { fetchEnergyNews, type NewsContext } from '../services/news.js';
import { createPost } from '../db/posts.js';

const composer = new Composer<MyContext>();

// Cache für News
let cachedNews: NewsContext | null = null;
let newsCacheTime = 0;
const NEWS_CACHE_TTL = 30 * 60 * 1000;

async function getNews(): Promise<NewsContext | null> {
    if (cachedNews && Date.now() - newsCacheTime < NEWS_CACHE_TTL) {
        return cachedNews;
    }
    cachedNews = await fetchEnergyNews();
    newsCacheTime = Date.now();
    return cachedNews;
}

// ─── /idee → Hauptmenü ─────────────────────────────────────────

composer.command('idee', async (ctx) => {
    if (!isAiAvailable()) {
        await ctx.reply('⚠️ KI nicht verfügbar. `OPENAI_API_KEY` fehlt.', { parse_mode: 'Markdown' });
        return;
    }

    const topic = ctx.match?.toString().trim();
    if (topic) {
        await handleCustomTopic(ctx, topic);
        return;
    }

    await showMainMenu(ctx);
});

async function showMainMenu(ctx: MyContext, edit = false) {
    const keyboard = new InlineKeyboard()
        .text('📰 Aktuelle Themenideen', 'idee_news')
        .row()
        .text('🎭 Humor & Satire', 'idee_pillar_humor')
        .text('💡 Informativ & Mehrwert', 'idee_pillar_educational')
        .row()
        .text('🏆 Storytelling & Vertrauen', 'idee_pillar_storytelling')
        .text('📅 Saisonaler Bezug', 'idee_pillar_seasonal')
        .row()
        .text('🎲 Zufall (gewichteter Mix)', 'idee_pillar_random')
        .row()
        .text('🎯 Eigenes Thema', 'idee_topic_prompt');

    const msg = '💡 *Content-Idee generieren*\n\nWähle einen Pfeiler oder lass mischen:';
    if (edit) {
        await ctx.editMessageText!(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
}

// ─── PFEILER-BUTTONS ────────────────────────────────────────────

composer.callbackQuery(/^idee_pillar_(humor|educational|storytelling|seasonal)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const pillar = ctx.match[1] as Pillar;
    const config = getPillarConfig(pillar);
    await ctx.editMessageText(`${config.emoji} Generiere *${config.name}*-Post...`, { parse_mode: 'Markdown' });
    await handlePillarPost(ctx, pillar);
});

composer.callbackQuery('idee_pillar_random', async (ctx) => {
    await ctx.answerCallbackQuery();
    const pillar = pickRandomPillar();
    const config = getPillarConfig(pillar);
    await ctx.editMessageText(`🎲 Pfeiler: *${config.name}* ${config.emoji}\nGeneriere...`, { parse_mode: 'Markdown' });
    await handlePillarPost(ctx, pillar);
});

// ─── NEWS-MODUS ─────────────────────────────────────────────────

composer.callbackQuery('idee_news', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('📰 Lade Themenkontext...');

    const news = await getNews();
    if (!news || news.headlines.length === 0) {
        await ctx.editMessageText('❌ Keine Nachrichten geladen. Versuch es später.');
        return;
    }

    let message = '📰 *Aktuelle Themenideen:*\n\n';
    news.headlines.forEach((h, i) => message += `${i + 1}. ${h}\n`);
    message += `\n_${news.summary}_`;

    const keyboard = new InlineKeyboard();
    news.headlines.forEach((h, i) => {
        const label = h.length > 38 ? h.substring(0, 35) + '...' : h;
        keyboard.text(`${i + 1}. ${label}`, `idee_headline_${i}`).row();
    });
    keyboard
        .text('🤖 KI wählt', 'idee_news_auto')
        .text('🔄 Neu laden', 'idee_news_refresh')
        .row()
        .text('⬅️ Zurück', 'idee_back');

    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
});

composer.callbackQuery(/^idee_headline_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const idx = parseInt(ctx.match[1], 10);
    if (!cachedNews?.headlines[idx]) {
        await ctx.editMessageText('❌ Headline nicht mehr verfügbar.');
        return;
    }
    await ctx.editMessageText(`📰 Generiere Post zu:\n_"${cachedNews.headlines[idx]}"_`, { parse_mode: 'Markdown' });
    await handleNewsPostAction(ctx, [cachedNews.headlines[idx]], cachedNews.summary);
});

composer.callbackQuery('idee_news_auto', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!cachedNews?.headlines.length) {
        await ctx.editMessageText('❌ Kein News-Cache. Versuch /idee.');
        return;
    }
    await ctx.editMessageText('🤖 Analysiere Schlagzeilen...');
    await handleNewsPostAction(ctx, cachedNews.headlines, cachedNews.summary);
});

composer.callbackQuery('idee_news_refresh', async (ctx) => {
    await ctx.answerCallbackQuery('📰 Lade neu...');
    cachedNews = null;
    newsCacheTime = 0;
    // Re-trigger news flow
    const news = await getNews();
    if (!news?.headlines.length) {
        await ctx.editMessageText('❌ Keine Nachrichten geladen.');
        return;
    }
    let message = '📰 *Aktuelle Themenideen (neu):*\n\n';
    news.headlines.forEach((h, i) => message += `${i + 1}. ${h}\n`);
    message += `\n_${news.summary}_`;

    const keyboard = new InlineKeyboard();
    news.headlines.forEach((h, i) => {
        const label = h.length > 38 ? h.substring(0, 35) + '...' : h;
        keyboard.text(`${i + 1}. ${label}`, `idee_headline_${i}`).row();
    });
    keyboard.text('🤖 KI wählt', 'idee_news_auto').text('🔄 Neu laden', 'idee_news_refresh').row().text('⬅️ Zurück', 'idee_back');
    await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
});

// ─── EIGENES THEMA ──────────────────────────────────────────────

composer.callbackQuery('idee_topic_prompt', async (ctx) => {
    await ctx.answerCallbackQuery();
    const { pendingTopics } = await import('./idee_state.js');
    if (ctx.from) pendingTopics.set(ctx.from.id, true);
    await ctx.editMessageText(
        '🎯 *Eigenes Thema*\n\nSchick mir ein Thema, eine Nachricht, oder was dich gerade nervt:\n\n_"Netzentgelte steigen um 25%"\n"Stadtwerke erhöhen Gaspreis"\n"Keiner wechselt obwohl alle meckern"_',
        { parse_mode: 'Markdown' }
    );
});

// ─── ZURÜCK-BUTTON ──────────────────────────────────────────────

composer.callbackQuery('idee_back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx, true);
});

// ─── POST-RENDERING ─────────────────────────────────────────────

async function handlePillarPost(ctx: MyContext, pillar: Pillar): Promise<void> {
    const config = getPillarConfig(pillar);
    const result = await generatePillarPost(pillar);
    if (!result) {
        await ctx.editMessageText!('❌ Generierung fehlgeschlagen. Versuch /idee nochmal.');
        return;
    }

    const post = createPost(result.text, result.hashtags);
    const charCount = result.text.length;
    const charInfo = charCount > 280 ? `⚠️ ${charCount}/280` : `✅ ${charCount}/280`;

    const keyboard = new InlineKeyboard()
        .text('✅ Freigeben', `freigeben_${post.id}`)
        .text('✏️ Bearbeiten', `edit_${post.id}`)
        .row()
        .text(`🔄 Nochmal ${config.emoji}`, `idee_pillar_${pillar}`)
        .text('🎲 Anderer Pfeiler', 'idee_pillar_random')
        .row()
        .text('🗑️ Verwerfen', `delete_${post.id}`);

    let message = `${config.emoji} *${config.name}* · _${result.format}_\n\n`;
    message += `─────────────────\n${result.text}\n─────────────────\n\n`;
    message += `${charInfo} Zeichen`;
    if (result.hashtags) message += ` · 🏷️ ${result.hashtags}`;
    if (result.imageIdea) message += `\n🎨 _${result.imageIdea}_`;

    await ctx.editMessageText!(message, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleNewsPostAction(ctx: MyContext, headlines: string[], summary: string): Promise<void> {
    const result = await generateNewsPost(headlines, summary);
    if (!result) {
        await ctx.editMessageText!('❌ Generierung fehlgeschlagen.');
        return;
    }

    const post = createPost(result.text, result.hashtags);
    const charCount = result.text.length;
    const charInfo = charCount > 280 ? `⚠️ ${charCount}/280` : `✅ ${charCount}/280`;

    const keyboard = new InlineKeyboard()
        .text('✅ Freigeben', `freigeben_${post.id}`)
        .text('✏️ Bearbeiten', `edit_${post.id}`)
        .row()
        .text('📰 Anderen Kontext', 'idee_news')
        .text('🗑️ Verwerfen', `delete_${post.id}`);

    let message = `📰 *Basierend auf:* _${result.usedHeadline}_\n\n`;
    message += `─────────────────\n${result.text}\n─────────────────\n\n`;
    message += `${charInfo} Zeichen`;
    if (result.hashtags) message += ` · 🏷️ ${result.hashtags}`;
    if (result.imageIdea) message += `\n🎨 _${result.imageIdea}_`;

    await ctx.editMessageText!(message, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleCustomTopic(ctx: MyContext, topic: string): Promise<void> {
    await ctx.reply(`🎯 Generiere Post zu:\n_"${topic}"_`, { parse_mode: 'Markdown' });

    const result = await generatePost(topic);
    if (!result) {
        await ctx.reply('❌ Generierung fehlgeschlagen. Versuch /idee nochmal.');
        return;
    }

    const post = createPost(result.text, result.hashtags);
    const charCount = result.text.length;
    const charInfo = charCount > 280 ? `⚠️ ${charCount}/280` : `✅ ${charCount}/280`;

    const keyboard = new InlineKeyboard()
        .text('✅ Freigeben', `freigeben_${post.id}`)
        .text('✏️ Bearbeiten', `edit_${post.id}`)
        .row()
        .text('🎲 Zufällig', 'idee_pillar_random')
        .text('🗑️ Verwerfen', `delete_${post.id}`);

    let message = `🎯 *Post-Idee #${post.id}*\n\n─────────────────\n${result.text}\n─────────────────\n\n${charInfo} Zeichen`;
    if (result.hashtags) message += ` · 🏷️ ${result.hashtags}`;
    if (result.imageIdea) message += `\n🎨 _${result.imageIdea}_`;

    await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
}

export default composer;

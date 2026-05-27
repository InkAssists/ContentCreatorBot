import 'dotenv/config';
import { Bot, Context } from 'grammy';
import { getDb } from './db/posts.js';
import { startScheduler } from './services/scheduler.js';
import { isAiAvailable } from './services/ai.js';

// Commands
import neuCommand from './commands/neu.js';
import entwuerfeCommand from './commands/entwuerfe.js';
import freigebenCommand from './commands/freigeben.js';
import vorschauCommand from './commands/vorschau.js';
import planenCommand from './commands/planen.js';
import ideeCommand from './commands/idee.js';
import statsCommand from './commands/stats.js';
import bildCommand from './commands/bild.js';

// --- Type Export ---
export type MyContext = Context;

// --- Brand and Env Configurations ---
const BRAND_NAME = process.env.BRAND_NAME || 'Social Media';
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID, 10) : null;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.replace('@', '').toLowerCase() ?? null;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing in your .env file');
    process.exit(1);
}

// --- Initialize Bot ---
const bot = new Bot<MyContext>(BOT_TOKEN);

// --- Access Control Middleware: Only Admin can access the bot ---
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username?.toLowerCase();

    const isAdmin =
        (!ADMIN_USER_ID && !ADMIN_USERNAME) || // No admin set = allow all (use with caution!)
        (ADMIN_USER_ID && userId === ADMIN_USER_ID) ||
        (ADMIN_USERNAME && username === ADMIN_USERNAME);

    if (!isAdmin) {
        await ctx.reply('⛔ Access denied. This bot is only accessible by the administrator.');
        return;
    }
    await next();
});

// --- /start & /hilfe (Help) ---
bot.command('start', async (ctx) => {
    await ctx.reply(
        `⚡ *${BRAND_NAME} Social Media Bot*\n\nYour control center for curating, scheduling, and publishing posts.\n\n` +
        `*Commands:*\n` +
        `/neu — Create a new post interactively\n` +
        `/entwuerfe — List all drafts\n` +
        `/vorschau [id] — Preview post details\n` +
        `/freigeben [id] — Publish a post immediately via Webhook\n` +
        `/planen [id] [date] [time] — Schedule a post (e.g. tomorrow 10:00)\n` +
        `/idee [topic] — Generate an AI suggestion\n` +
        `/bild [id] — Add an image URL to a post\n` +
        `/stats — View statistics dashboard\n` +
        `/hilfe — Show help guide\n\n` +
        `_AI-Content Generator: ${isAiAvailable() ? '✅ Ready' : '❌ Config missing (.env)'}_\n` +
        `_Make.com Integration: ${process.env.MAKE_WEBHOOK_URL ? '✅ Connected' : '⚠️ Missing (.env)'}_`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('hilfe', async (ctx) => {
    await ctx.reply(
        `📖 *Help Guide*\n\n` +
        `*Create a Post:*\n` +
        `\`/neu\` — Start the interactive post creation flow\n` +
        `\`/idee\` — Generate a random AI post idea\n` +
        `\`/idee [topic]\` — Generate an AI post specifically on this topic\n\n` +
        `*Manage Posts:*\n` +
        `\`/entwuerfe\` — View all current drafts\n` +
        `\`/vorschau [id]\` — Show detailed post view (e.g., /vorschau 42)\n` +
        `\`/freigeben [id]\` — Instantly publish post via Make.com webhook\n` +
        `\`/bild [id]\` — Set a public image URL for the post\n` +
        `\`/planen [id] tomorrow 10:00\` — Schedule post to publish at a future time\n\n` +
        `*Insights:*\n` +
        `\`/stats\` — Show bot metrics dashboard\n\n` +
        `_💡 Pro-Tip: Send a photo with a caption directly to the bot to create a drafted post automatically!_`,
        { parse_mode: 'Markdown' }
    );
});

// --- Register Commands ---
bot.use(neuCommand);
bot.use(entwuerfeCommand);
bot.use(freigebenCommand);
bot.use(vorschauCommand);
bot.use(planenCommand);
bot.use(ideeCommand);
bot.use(statsCommand);
bot.use(bildCommand);

// --- Startup Routine ---
async function main() {
    console.log('🔌 Initializing Database SQLite...');
    getDb();

    console.log('⏰ Starting background scheduler...');
    startScheduler();

    console.log('🤖 Connecting to Telegram...');
    await bot.start({
        onStart: (info) => {
            console.log(`\n⚡ ${BRAND_NAME} Bot is running!`);
            console.log(`   Bot username: @${info.username}`);
            console.log(`   Admin restriction: ${ADMIN_USER_ID ? `User ID ${ADMIN_USER_ID}` : ADMIN_USERNAME ? `@${ADMIN_USERNAME}` : 'None (⚠️ Open to all! Set ADMIN_USER_ID in .env)'}`);
            console.log(`   OpenAI GPT status: ${isAiAvailable() ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`   Make.com webhook: ${process.env.MAKE_WEBHOOK_URL ? '✅ Configured' : '❌ Missing'}\n`);
        },
    });
}

// Graceful Shutdown Handling
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping bot gracefully...');
    bot.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    bot.stop();
    process.exit(0);
});

main().catch((err) => {
    console.error('❌ Fatal error during startup:', err);
    process.exit(1);
});

import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

// =========================================================================
// 💡 CUSTOMIZATION GUIDE: CONTENT PILLARS (INHALTSPFEILER)
// =========================================================================
// You can define different types of social media posts here.
// Each pillar has a weight (percentage of frequency), a specific prompt,
// and different format suggestions.
//
// Feel free to add, modify, or remove pillars to match your niche!
// =========================================================================

export type Pillar = 'humor' | 'educational' | 'storytelling' | 'seasonal';

export interface PillarConfig {
    id: Pillar;
    name: string;
    emoji: string;
    weight: number; // Percent probability when picked randomly
    prompt: string;
    formats: string[];
}

const PILLARS: Record<Pillar, PillarConfig> = {
    educational: {
        id: 'educational',
        name: 'Informativ & Mehrwert',
        emoji: '💡',
        weight: 40,
        prompt: `PFEILER: Informativ & Mehrwert (faktenbasiert, augenöffnend, nützlich)
        
Du schreibst einen informativen Post mit echtem Nutzwert für den Leser. Keine platte Werbung, sondern Wissen. Wähle EINES dieser Formate:`,
        formats: [
            '„Wussten Sie schon": Erkläre ein überraschendes Detail oder ein verborgenes Problem in deiner Branche, das die meisten Menschen nicht auf dem Schirm haben.',
            '„Rechenbeispiel / Statistik": Veranschauliche ein konkretes Problem mit einfachen, nachvollziehbaren Zahlen oder Ersparnissen. Nutze realistische Richtwerte.',
            '„Schritt-für-Schritt": Erkläre kurz und knackig eine simple Vorgehensweise, mit der der Leser sofort ein Problem lösen oder Geld/Zeit sparen kann.',
            '„Mythen-Entlarver": Nimm ein häufiges Vorurteil aus deiner Branche und widerlege es kurz mit einem stichhaltigen Argument.'
        ],
    },
    humor: {
        id: 'humor',
        name: 'Humor & Satire',
        emoji: '🎭',
        weight: 30,
        prompt: `PFEILER: Satire & Humor (trocken, zynisch, augenöffnend)

Du schreibst einen humorvollen oder leicht satirischen Post, der die Absurditäten der Branche auf den Punkt bringt. Wähle EINES der folgenden Formate:`,
        formats: [
            '„Die ehrliche Übersetzung": Nimm eine typische, geschönte Formulierung (z.B. von Wettbewerbern oder Großkonzernen) und übersetze sie zynisch in das, was sie wirklich bedeutet.',
            '„Sarkastischer Dank": Schreibe als wäre es ein ironischer Dankesbrief des Kunden für einen absolut miserablen, aber branchenüblichen Zustand.',
            '„Der absurde Vergleich": Vergleiche ein fragwürdiges Verhalten aus deiner Nische mit einem alltäglichen Verhalten in einem anderen Lebensbereich. Warum akzeptieren die Leute das hier, aber nirgendwo sonst?',
            '„Fiktive Produktankündigung": Erfinde ein absurdes Hilfsmittel, das man bräuchte, um die Nachteile des aktuellen Zustands zu ertragen.'
        ],
    },
    storytelling: {
        id: 'storytelling',
        name: 'Erfolgsgeschichten & Vertrauen',
        emoji: '🏆',
        weight: 15,
        prompt: `PFEILER: Erfolgsgeschichten & Vertrauensaufbau (authentisch, ermutigend, entlastend)

Du schreibst einen Post, der zeigt, wie einfach eine positive Veränderung ist. Schreibe nicht marktschreierisch, sondern überzeugend. Wähle EINES dieser Formate:`,
        formats: [
            '„Vorher vs. Nachher": Beschreibe kurz den typischen Stresszustand vor einer Lösung und das befreiende Gefühl danach.',
            '„Angst-Killer (FAQ)": Nimm eine typische Sorge oder Angst des Kunden und räume sie sachlich und beruhigend aus dem Weg.',
            '„Kurz-Erlebnis": Beschreibe ein kurzes, realistisches Kundenfeedback oder Erlebnis. Fokussiere dich auf den Moment, in dem es "Klick" gemacht hat.'
        ],
    },
    seasonal: {
        id: 'seasonal',
        name: 'Saisonaler Bezug',
        emoji: '📅',
        weight: 15,
        prompt: `PFEILER: Saisonaler Bezug & Trends (zeitgemäß, situativ, aktuell)

Du schreibst einen Post, der einen Bezug zum aktuellen Monat oder der Jahreszeit herstellt und den Leser genau da abholt. Wähle das passende saisonale Thema:`,
        formats: [
            '„Jahresanfang (Januar/Februar)": Zeit für gute Vorsätze und Aufräumen – auch bei den Verträgen und Finanzen.',
            '„Frühjahrsputz (März/April/Mai)": Ballast abwerfen, Dinge optimieren, frischen Wind reinbringen.',
            '„Sommerloch / Urlaubszeit (Juni/Juli/August)": Entspannte Zeit, aber auch die perfekte Gelegenheit für Dinge, die man sonst aufschiebt.',
            '„Herbst & Winter (September bis Dezember)": Gemütliche Zeit, Jahresendspurt, Vorbereitung auf das neue Jahr.'
        ],
    },
};

// =========================================================================
// 💡 CUSTOMIZATION GUIDE: BASE PROMPT (SYSTEM PROMPT)
// =========================================================================
// This is the core instructions for the AI's personality, tone, and formatting constraints.
// Change BRAND_NAME, industry details, and tone markers to fit your specific bot!
// =========================================================================

const getBasePrompt = () => {
    const brandName = process.env.BRAND_NAME || 'DeineMarke';
    const websiteUrl = process.env.WEBSITE_URL || 'https://deinewebsite.com';

    return `Du bist der Social-Media-Manager für ${brandName} (${websiteUrl}). 
Deine Aufgabe ist es, exzellente, engagierende und aufmerksamkeitsstarke Kurzbeiträge zu schreiben.

STIMME & TONFALL:
- Authentisch, kompetent und auf den Punkt. 
- Gerne mit einem Hauch von Augenzwinkern oder trockenem Humor, aber niemals unprofessionell.
- Keine klischeehaften Marketing-Floskeln („Mega!“, „Unglaublich!“, „Absoluter Hammer!“).
- Maximal 1 Emoji pro Post (wenn überhaupt). Vermeide Emoji-Spam wie „🔥🚀🎉💪“.
- Sprich die Leser respektvoll aber nahbar an (Siezen oder Duzen je nach Zielgruppe. Standard: Sie).
- Schreibe so, dass man den Beitrag gerne liest, teilt und darüber nachdenkt.

FORMATIERUNGS-REGELN:
- MAXIMAL 280 ZEICHEN. Halte dich zwingend daran, damit der Post auf X (Twitter) passt!
- Hashtags: Maximal 2 Stück, kurz und relevant.
- Integriere keinen Link in den Text – dieser wird automatisch am Ende angehängt.
- Der Call-to-Action (CTA) am Ende darf dezent und einladend sein.`;
};

// =========================================================================
// ─── POST GENERATION LOGIC ───────────────────────────────────────────────
// =========================================================================

/**
 * Picks a random pillar based on their percentage weights.
 */
export function pickRandomPillar(): Pillar {
    const rand = Math.random() * 100;
    if (rand < 40) return 'educational';
    if (rand < 70) return 'humor';
    if (rand < 85) return 'storytelling';
    return 'seasonal';
}

/**
 * Returns configuration details for a specific pillar.
 */
export function getPillarConfig(pillar: Pillar): PillarConfig {
    return PILLARS[pillar];
}

/**
 * Returns all available pillars.
 */
export function getAllPillars(): PillarConfig[] {
    return Object.values(PILLARS);
}

/**
 * Generates a post based on a specific content pillar.
 */
export async function generatePillarPost(
    pillar: Pillar,
    additionalContext?: string
): Promise<{ text: string; hashtags: string; imageIdea: string; format: string } | null> {
    const openai = getClient();
    if (!openai) return null;

    const config = PILLARS[pillar];
    const format = config.formats[Math.floor(Math.random() * config.formats.length)];

    let userPrompt = `${config.prompt}\n\nGEWÄHLTES FORMAT:\n${format}`;

    if (additionalContext) {
        userPrompt += `\n\nZUSÄTZLICHER KONTEXT / AKTUELLE NEWS:\n${additionalContext}`;
    }

    // Automatically inject seasonal context if the seasonal pillar is chosen
    if (pillar === 'seasonal') {
        const month = new Date().toLocaleString('de-DE', { month: 'long' });
        userPrompt += `\n\nAktueller Kalendermonat: ${month}. Wähle das passende saisonale Thema aus den Formaten.`;
    }

    userPrompt += `\n\nAntworte AUSSCHLIESSLICH im folgenden Format (ohne weiteren Text drumherum):
POST:
[Dein verfasster Post-Text, maximal 280 Zeichen]

HASHTAGS:
[#Hashtag1 #Hashtag2]

BILDIDEE:
[Eine kurze, kreative Idee für ein passendes Bild, Grafik oder Meme]`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: getBasePrompt() },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.85,
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const postMatch = content.match(/POST:\s*\n([\s\S]*?)(?=\nHASHTAGS:|\n*$)/);
        const hashtagMatch = content.match(/HASHTAGS:\s*\n(.*)/);
        const imageMatch = content.match(/BILDIDEE:\s*\n([\s\S]*?)$/);

        return {
            text: postMatch?.[1]?.trim() ?? content.trim(),
            hashtags: hashtagMatch?.[1]?.trim() ?? '',
            imageIdea: imageMatch?.[1]?.trim() ?? '',
            format: format.split(':')[0].replace(/[„"]/g, ''),
        };
    } catch (error) {
        console.error('OpenAI Error:', error);
        return null;
    }
}

/**
 * Generates a post on a custom topic provided by the user.
 */
export async function generatePost(topic: string): Promise<{ text: string; hashtags: string; imageIdea: string } | null> {
    const openai = getClient();
    if (!openai) return null;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: getBasePrompt() },
                {
                    role: 'user',
                    content: `Schreibe einen aufmerksamkeitsstarken Social-Media-Post zum konkreten Thema: "${topic}"

Gehe konkret auf dieses Thema ein und vermeide oberflächliche Floskeln.

Antworte AUSSCHLIESSLICH im folgenden Format:
POST:
[Dein Post-Text, maximal 280 Zeichen]

HASHTAGS:
[#Hashtag1 #Hashtag2]

BILDIDEE:
[Eine kurze, kreative Idee für ein passendes Bild oder Grafik]`
                }
            ],
            temperature: 0.85,
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const postMatch = content.match(/POST:\s*\n([\s\S]*?)(?=\nHASHTAGS:|\n*$)/);
        const hashtagMatch = content.match(/HASHTAGS:\s*\n(.*)/);
        const imageMatch = content.match(/BILDIDEE:\s*\n([\s\S]*?)$/);

        return {
            text: postMatch?.[1]?.trim() ?? content.trim(),
            hashtags: hashtagMatch?.[1]?.trim() ?? '',
            imageIdea: imageMatch?.[1]?.trim() ?? '',
        };
    } catch (error) {
        console.error('OpenAI Error:', error);
        return null;
    }
}

/**
 * Generates a post based on a news headline.
 */
export async function generateNewsPost(
    headlines: string[],
    marketSummary: string
): Promise<{ text: string; hashtags: string; imageIdea: string; usedHeadline: string } | null> {
    const openai = getClient();
    if (!openai) return null;

    const pillar = pickRandomPillar();
    const config = PILLARS[pillar];
    const format = config.formats[Math.floor(Math.random() * config.formats.length)];

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: getBasePrompt() },
                {
                    role: 'user',
                    content: `AKTUELLE SCHLAGZEILEN:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

MARKTLAGE / HINTERGRUND:
${marketSummary}

PFEILER: ${config.name}
FORMAT: ${format}

Wähle die Schlagzeile mit dem größten Potenzial für das Format aus.
Schreibe einen darauf bezogenen Post im Stile des Pfeilers und Formats.

Antworte AUSSCHLIESSLICH im folgenden Format:
SCHLAGZEILE: [Die von dir ausgewählte Schlagzeile]

POST:
[Dein Post-Text, maximal 280 Zeichen]

HASHTAGS:
[#Hashtag1 #Hashtag2]

BILDIDEE:
[Eine kurze, kreative Idee für ein passendes Bild]`
                }
            ],
            temperature: 0.8,
            max_tokens: 600,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const headlineMatch = content.match(/SCHLAGZEILE:\s*(.+)/);
        const postMatch = content.match(/POST:\s*\n([\s\S]*?)(?=\nHASHTAGS:|\n*$)/);
        const hashtagMatch = content.match(/HASHTAGS:\s*\n(.*)/);
        const imageMatch = content.match(/BILDIDEE:\s*\n([\s\S]*?)$/);

        return {
            text: postMatch?.[1]?.trim() ?? content.trim(),
            hashtags: hashtagMatch?.[1]?.trim() ?? '',
            imageIdea: imageMatch?.[1]?.trim() ?? '',
            usedHeadline: headlineMatch?.[1]?.trim() ?? headlines[0] ?? '',
        };
    } catch (error) {
        console.error('OpenAI Error:', error);
        return null;
    }
}

/**
 * Checks if OpenAI API key is configured.
 */
export function isAiAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
}

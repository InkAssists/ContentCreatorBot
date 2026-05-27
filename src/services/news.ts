/**
 * News Service: Fetches current news articles as context for AI post generation.
 * Custom topics can be specified in environment variables (.env).
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

export interface NewsContext {
    headlines: string[];
    summary: string;
}

/**
 * Fetches current news based on configurable topics to provide rich context for OpenAI prompts.
 */
export async function fetchEnergyNews(): Promise<NewsContext | null> {
    const openai = getClient();
    if (!openai) return null;

    const topic = process.env.NEWS_TOPIC || 'deutsche Wirtschaft und Tech-Trends';
    const focus = process.env.NEWS_FOCUS || 'aktuelle Entwicklungen, Verbrauchertipps, Trends und News';

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein Nachrichtenanalyst für das Thema: ${topic}. 
Deine Aufgabe: Fasse die wichtigsten aktuellen Entwicklungen zusammen, die für unsere Zielgruppe relevant sind.
Fokus: ${focus}.`
                },
                {
                    role: 'user',
                    content: `Was sind die 5 wichtigsten aktuellen Themen im Bereich "${topic}"?
                    
Antworte NUR in diesem Format:

HEADLINE: [Kurze Schlagzeile 1]
HEADLINE: [Kurze Schlagzeile 2]
HEADLINE: [Kurze Schlagzeile 3]
HEADLINE: [Kurze Schlagzeile 4]
HEADLINE: [Kurze Schlagzeile 5]

ZUSAMMENFASSUNG:
[2-3 Sätze über die aktuelle Lage, die für Follower von Interesse sind]`
                }
            ],
            temperature: 0.3, // Lower temp = more factual news representation
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const headlines = [...content.matchAll(/HEADLINE:\s*(.+)/g)].map(m => m[1].trim());
        const summaryMatch = content.match(/ZUSAMMENFASSUNG:\s*\n([\s\S]*?)$/);
        const summary = summaryMatch?.[1]?.trim() ?? '';

        return { headlines, summary };
    } catch (error) {
        console.error('News-Fetch Fehler:', error);
        return null;
    }
}

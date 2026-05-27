/**
 * Shared state für den /idee Topic-Eingabe-Flow.
 * Wird von idee.ts und dem Text-Handler genutzt.
 */
export const pendingTopics = new Map<number, boolean>(); // userId -> waiting for topic

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = process.env.POSTS_DB_PATH || join(__dirname, '..', '..', 'data', 'posts.db');

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        mkdirSync(dirname(DB_PATH), { recursive: true });
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema();
    }
    return db;
}

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            image_url TEXT,
            hashtags TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'draft',
            -- status: draft | approved | scheduled | published | failed
            platforms TEXT NOT NULL DEFAULT 'facebook,twitter,instagram',
            scheduled_at TEXT,
            published_at TEXT,
            make_response TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS post_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            -- action: created | edited | approved | published | failed | deleted
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
        CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);
    `);
}

// --- Post CRUD ---

export interface Post {
    id: number;
    text: string;
    image_url: string | null;
    hashtags: string;
    status: 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';
    platforms: string;
    scheduled_at: string | null;
    published_at: string | null;
    make_response: string | null;
    created_at: string;
    updated_at: string;
}

export function createPost(text: string, hashtags: string = '', imageUrl?: string): Post {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO posts (text, hashtags, image_url)
        VALUES (?, ?, ?)
    `);
    const result = stmt.run(text, hashtags, imageUrl ?? null);

    logAction(result.lastInsertRowid as number, 'created');
    return getPost(result.lastInsertRowid as number)!;
}

export function getPost(id: number): Post | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post | undefined;
}

export function getDrafts(): Post[] {
    const db = getDb();
    return db.prepare("SELECT * FROM posts WHERE status = 'draft' ORDER BY created_at DESC").all() as Post[];
}

export function getScheduledPosts(): Post[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM posts 
        WHERE status = 'scheduled' AND scheduled_at <= datetime('now', 'localtime')
        ORDER BY scheduled_at ASC
    `).all() as Post[];
}

export function updatePostText(id: number, text: string): void {
    const db = getDb();
    db.prepare(`
        UPDATE posts SET text = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
    `).run(text, id);
    logAction(id, 'edited', 'Text aktualisiert');
}

export function updatePostImage(id: number, imageUrl: string): void {
    const db = getDb();
    db.prepare(`
        UPDATE posts SET image_url = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
    `).run(imageUrl, id);
    logAction(id, 'edited', 'Bild hinzugefügt');
}

export function updatePostStatus(id: number, status: Post['status'], details?: string): void {
    const db = getDb();
    const updates: string[] = [
        `status = '${status}'`,
        `updated_at = datetime('now', 'localtime')`
    ];
    if (status === 'published') {
        updates.push(`published_at = datetime('now', 'localtime')`);
    }
    db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`).run(id);
    logAction(id, status === 'published' ? 'published' : status === 'failed' ? 'failed' : 'approved', details);
}

export function schedulePost(id: number, scheduledAt: string): void {
    const db = getDb();
    db.prepare(`
        UPDATE posts SET status = 'scheduled', scheduled_at = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
    `).run(scheduledAt, id);
    logAction(id, 'approved', `Geplant für ${scheduledAt}`);
}

export function deletePost(id: number): void {
    const db = getDb();
    logAction(id, 'deleted');
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

export function getStats(): { total: number; drafts: number; published: number; scheduled: number; thisWeek: number } {
    const db = getDb();
    const total = (db.prepare('SELECT COUNT(*) as c FROM posts').get() as { c: number }).c;
    const drafts = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE status = 'draft'").get() as { c: number }).c;
    const published = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE status = 'published'").get() as { c: number }).c;
    const scheduled = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE status = 'scheduled'").get() as { c: number }).c;
    const thisWeek = (db.prepare(`
        SELECT COUNT(*) as c FROM posts 
        WHERE status = 'published' 
        AND published_at >= datetime('now', '-7 days', 'localtime')
    `).get() as { c: number }).c;
    return { total, drafts, published, scheduled, thisWeek };
}

// --- Logging ---

function logAction(postId: number, action: string, details?: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO post_log (post_id, action, details) VALUES (?, ?, ?)
    `).run(postId, action, details ?? null);
}

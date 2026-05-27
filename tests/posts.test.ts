import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.POSTS_DB_PATH = join(mkdtempSync(join(tmpdir(), 'content-bot-test-')), 'posts.db');

const posts = await import('../src/db/posts.ts');

test('posts database creates drafts and updates image URLs', () => {
    const post = posts.createPost('Draft text', '#Draft');
    assert.equal(post.status, 'draft');
    assert.equal(post.text, 'Draft text');
    assert.equal(post.hashtags, '#Draft');

    posts.updatePostImage(post.id, 'https://example.com/image.jpg');
    const updated = posts.getPost(post.id);
    assert.equal(updated?.image_url, 'https://example.com/image.jpg');
});

test('posts database schedules due posts and records published status', () => {
    const post = posts.createPost('Scheduled text');
    posts.schedulePost(post.id, '2000-01-01 10:00');

    const duePosts = posts.getScheduledPosts();
    assert.ok(duePosts.some(duePost => duePost.id === post.id));

    posts.updatePostStatus(post.id, 'published', 'Accepted');
    const published = posts.getPost(post.id);
    assert.equal(published?.status, 'published');
    assert.ok(published?.published_at);

    const stats = posts.getStats();
    assert.equal(stats.published, 1);
});

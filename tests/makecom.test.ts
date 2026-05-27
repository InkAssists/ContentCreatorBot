import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMakePayload, publishViaMake } from '../src/services/makecom.ts';
import type { Post } from '../src/db/posts.ts';

function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: 42,
        text: 'Post text',
        image_url: 'https://example.com/image.jpg',
        hashtags: '#One #Two',
        status: 'draft',
        platforms: 'facebook, twitter, instagram',
        scheduled_at: null,
        published_at: null,
        make_response: null,
        created_at: '2026-05-27 10:00:00',
        updated_at: '2026-05-27 10:00:00',
        ...overrides,
    };
}

test('buildMakePayload creates the payload expected by Make.com', () => {
    const payload = buildMakePayload(makePost(), 'https://brand.example');

    assert.deepEqual(payload, {
        post_id: 42,
        text: 'Post text',
        text_post: 'Post text\n\n#One #Two\n\n👉 https://brand.example',
        image_url: 'https://example.com/image.jpg',
        platforms: ['facebook', 'twitter', 'instagram'],
        hashtags: '#One #Two',
        link: 'https://brand.example',
        scheduled_at: null,
    });
});

test('publishViaMake posts JSON to the configured webhook', async () => {
    const previousWebhook = process.env.MAKE_WEBHOOK_URL;
    const previousWebsite = process.env.WEBSITE_URL;
    const previousFetch = globalThis.fetch;

    process.env.MAKE_WEBHOOK_URL = 'https://hook.example/test';
    process.env.WEBSITE_URL = 'https://brand.example';

    let requestUrl = '';
    let requestInit: RequestInit | undefined;

    globalThis.fetch = async (url, init) => {
        requestUrl = String(url);
        requestInit = init;
        return new Response('Accepted', { status: 200 });
    };

    try {
        const result = await publishViaMake(makePost({ image_url: null }));

        assert.deepEqual(result, { success: true, message: 'Accepted' });
        assert.equal(requestUrl, 'https://hook.example/test');
        assert.equal(requestInit?.method, 'POST');
        assert.deepEqual(requestInit?.headers, { 'Content-Type': 'application/json' });

        const body = JSON.parse(String(requestInit?.body));
        assert.equal(body.post_id, 42);
        assert.equal(body.link, 'https://brand.example');
        assert.deepEqual(body.platforms, ['facebook', 'twitter', 'instagram']);
    } finally {
        if (previousWebhook === undefined) delete process.env.MAKE_WEBHOOK_URL;
        else process.env.MAKE_WEBHOOK_URL = previousWebhook;

        if (previousWebsite === undefined) delete process.env.WEBSITE_URL;
        else process.env.WEBSITE_URL = previousWebsite;

        globalThis.fetch = previousFetch;
    }
});

test('publishViaMake reports missing webhook configuration', async () => {
    const previousWebhook = process.env.MAKE_WEBHOOK_URL;
    delete process.env.MAKE_WEBHOOK_URL;

    try {
        const result = await publishViaMake(makePost());
        assert.equal(result.success, false);
        assert.match(result.error ?? '', /MAKE_WEBHOOK_URL/);
    } finally {
        if (previousWebhook !== undefined) process.env.MAKE_WEBHOOK_URL = previousWebhook;
    }
});

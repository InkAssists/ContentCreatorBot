import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScheduleArgs } from '../src/commands/planen.ts';

test('parseScheduleArgs parses absolute future dates', () => {
    const now = new Date('2026-05-27T12:00:00');
    const result = parseScheduleArgs('12 2026-06-01 15:30', now);

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.postId, 12);
        assert.equal(result.scheduledAt, '2026-06-01 15:30');
    }
});

test('parseScheduleArgs resolves morgen relative to the provided date', () => {
    const now = new Date('2026-05-27T12:00:00');
    const result = parseScheduleArgs('5 morgen 10:00', now);

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.postId, 5);
        assert.equal(result.scheduledAt, '2026-05-28 10:00');
    }
});

test('parseScheduleArgs rejects invalid and past schedules', () => {
    const now = new Date('2026-05-27T12:00:00');

    assert.deepEqual(parseScheduleArgs('', now), { ok: false, reason: 'missing' });
    assert.deepEqual(parseScheduleArgs('abc 2026-06-01 10:00', now), { ok: false, reason: 'invalid_id' });

    const invalid = parseScheduleArgs('5 nope 10:00', now);
    assert.equal(invalid.ok, false);
    if (!invalid.ok) assert.equal(invalid.reason, 'invalid_date');

    const past = parseScheduleArgs('5 heute 10:00', now);
    assert.equal(past.ok, false);
    if (!past.ok) assert.equal(past.reason, 'past');
});

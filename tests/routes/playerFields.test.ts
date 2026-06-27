/**
 * Tests for ?fields= field projection on GET /api/players
 * and offerCount on GET /api/players/:playerId.
 */

jest.mock('../../src/services/ipfs', () => ({
  pinJson: jest.fn(),
  checkHealth: jest.fn(),
  gatewayUrl: jest.fn((cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`),
}));
jest.mock('../../src/services/indexer', () => ({ indexEvents: jest.fn() }));
jest.mock('../../src/services/stellar', () => ({
  queryMilestones: jest.fn().mockResolvedValue([]),
  updateProfile: jest.fn(),
}));
jest.mock('../../src/services/webhooks', () => ({
  dispatchEventWebhook: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/cache', () => ({
  invalidatePlayerCache: jest.fn(),
  invalidateMilestoneCache: jest.fn(),
}));

import request from 'supertest';
import app from '../../src/app';
import * as db from '../../src/db';

jest.mock('../../src/db', () => ({
  getEvents: jest.fn().mockReturnValue([]),
  queryPlayers: jest.fn(),
  getPlayerById: jest.fn(),
  getTrialOfferCount: jest.fn().mockReturnValue(0),
}));

const mockQueryPlayers = db.queryPlayers as jest.Mock;
const mockGetPlayerById = db.getPlayerById as jest.Mock;
const mockGetTrialOfferCount = db.getTrialOfferCount as jest.Mock;

/** A minimal player row returned by the db mock */
const PLAYER_ROW = {
  player_id: 'player-1',
  wallet: 'G' + 'A'.repeat(55),
  position: 'striker',
  region: 'europe',
  metadata_uri: 'QmTest',
  progress_level: 1,
  created_at: 1700000000,
};

beforeEach(() => {
  mockQueryPlayers.mockReturnValue([PLAYER_ROW]);
  mockGetPlayerById.mockReturnValue(PLAYER_ROW);
  mockGetTrialOfferCount.mockReturnValue(0);
});

// ─── c. ?fields= field projection ─────────────────────────────────────────────

describe('GET /api/players — ?fields= projection', () => {
  it('returns all fields when ?fields is omitted', async () => {
    const res = await request(app).get('/api/players');
    expect(res.status).toBe(200);
    const player = res.body.data[0];
    expect(player).toHaveProperty('player_id');
    expect(player).toHaveProperty('wallet');
    expect(player).toHaveProperty('position');
    expect(player).toHaveProperty('region');
    expect(player).toHaveProperty('progress_level');
    expect(player).toHaveProperty('progressLabel');
    expect(player).toHaveProperty('verificationBadge');
  });

  it('returns only requested fields when ?fields=player_id,position', async () => {
    const res = await request(app).get('/api/players?fields=player_id,position');
    expect(res.status).toBe(200);
    const player = res.body.data[0];
    expect(Object.keys(player)).toEqual(['player_id', 'position']);
    expect(player.player_id).toBe('player-1');
    expect(player.position).toBe('striker');
  });

  it('returns only requested fields when ?fields=player_id,region', async () => {
    const res = await request(app).get('/api/players?fields=player_id,region');
    expect(res.status).toBe(200);
    const player = res.body.data[0];
    expect(Object.keys(player)).toEqual(['player_id', 'region']);
    expect(player.region).toBe('europe');
  });

  it('silently ignores unrecognised field names', async () => {
    const res = await request(app).get('/api/players?fields=player_id,nonexistent_field,position');
    expect(res.status).toBe(200);
    const player = res.body.data[0];
    // only the recognised fields are returned
    expect(Object.keys(player)).toEqual(['player_id', 'position']);
    expect(player).not.toHaveProperty('nonexistent_field');
  });

  it('returns empty objects when all field names are unrecognised', async () => {
    const res = await request(app).get('/api/players?fields=foo,bar,baz');
    expect(res.status).toBe(200);
    // all names unknown → projection set is empty → no fields
    expect(res.body.data[0]).toEqual({});
  });

  it('?fields= with only whitespace/commas returns all fields (empty set falls back)', async () => {
    const res = await request(app).get('/api/players?fields=');
    expect(res.status).toBe(200);
    // empty string → no fields parsed → all fields returned
    const player = res.body.data[0];
    expect(player).toHaveProperty('player_id');
    expect(player).toHaveProperty('wallet');
  });

  it('supports enriched fields like progressLabel and verificationBadge', async () => {
    const res = await request(app).get('/api/players?fields=player_id,progressLabel,verificationBadge');
    expect(res.status).toBe(200);
    const player = res.body.data[0];
    expect(Object.keys(player)).toEqual(['player_id', 'progressLabel', 'verificationBadge']);
    expect(typeof player.progressLabel).toBe('string');
    expect(typeof player.verificationBadge).toBe('string');
  });

  it('pagination envelope fields are always returned regardless of ?fields=', async () => {
    const res = await request(app).get('/api/players?fields=player_id');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('pageSize');
    expect(res.body).toHaveProperty('pages');
  });
});

// ─── d. offerCount on GET /api/players/:playerId ──────────────────────────────

describe('GET /api/players/:playerId — offerCount', () => {
  it('includes offerCount: 0 when player has no trial offers', async () => {
    mockGetTrialOfferCount.mockReturnValue(0);
    const res = await request(app).get('/api/players/player-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('offerCount', 0);
  });

  it('includes offerCount: 3 when player has three trial offers', async () => {
    mockGetTrialOfferCount.mockReturnValue(3);
    const res = await request(app).get('/api/players/player-1');
    expect(res.status).toBe(200);
    expect(res.body.data.offerCount).toBe(3);
  });

  it('offerCount is a number', async () => {
    mockGetTrialOfferCount.mockReturnValue(1);
    const res = await request(app).get('/api/players/player-1');
    expect(typeof res.body.data.offerCount).toBe('number');
  });

  it('calls getTrialOfferCount with the correct playerId', async () => {
    await request(app).get('/api/players/player-42');
    expect(mockGetTrialOfferCount).toHaveBeenCalledWith('player-42');
  });

  it('returns 404 with no offerCount when player does not exist', async () => {
    mockGetPlayerById.mockReturnValue(null);
    const res = await request(app).get('/api/players/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeUndefined();
  });

  it('all existing fields are still present alongside offerCount', async () => {
    const res = await request(app).get('/api/players/player-1');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('player_id');
    expect(d).toHaveProperty('wallet');
    expect(d).toHaveProperty('position');
    expect(d).toHaveProperty('region');
    expect(d).toHaveProperty('progress_level');
    expect(d).toHaveProperty('tierName');
    expect(d).toHaveProperty('tierDescription');
    expect(d).toHaveProperty('offerCount');
  });
});

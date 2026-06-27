/**
 * Tests for GET /api/docs (OpenAPI spec endpoint) and GET /api/docs/ui (Swagger UI).
 * Also verifies that X-API-Version is present on every response.
 */

jest.mock('../../src/services/ipfs', () => ({
  pinJson: jest.fn(),
  checkHealth: jest.fn(),
  gatewayUrl: jest.fn((cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`),
}));
jest.mock('../../src/services/indexer', () => ({ indexEvents: jest.fn() }));
jest.mock('../../src/db', () => ({
  getEvents: jest.fn().mockReturnValue([]),
  queryPlayers: jest.fn().mockReturnValue([]),
  getPlayerById: jest.fn().mockReturnValue(null),
}));

import request from 'supertest';
import app from '../../src/app';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string };
const expectedMajor = version.split('.')[0];

describe('GET /api/docs', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('spec has openapi field starting with "3.0."', async () => {
    const res = await request(app).get('/api/docs');
    expect(typeof res.body.openapi).toBe('string');
    expect(res.body.openapi).toMatch(/^3\.0\./);
  });

  it('spec has info.title and info.version', async () => {
    const res = await request(app).get('/api/docs');
    expect(typeof res.body.info.title).toBe('string');
    expect(typeof res.body.info.version).toBe('string');
  });

  it('spec has a non-empty paths object', async () => {
    const res = await request(app).get('/api/docs');
    expect(typeof res.body.paths).toBe('object');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
  });

  it('spec covers all major route groups', async () => {
    const res = await request(app).get('/api/docs');
    const paths: string[] = Object.keys(res.body.paths);
    const hasAuth = paths.some((p) => p.startsWith('/auth'));
    const hasPlayers = paths.some((p) => p.startsWith('/players'));
    const hasScouts = paths.some((p) => p.startsWith('/scouts'));
    const hasValidators = paths.some((p) => p.startsWith('/validators'));
    const hasAdmin = paths.some((p) => p.startsWith('/admin'));
    expect(hasAuth).toBe(true);
    expect(hasPlayers).toBe(true);
    expect(hasScouts).toBe(true);
    expect(hasValidators).toBe(true);
    expect(hasAdmin).toBe(true);
  });

  it('spec has BearerAuth security scheme', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.body.components?.securitySchemes?.BearerAuth).toBeDefined();
  });
});

describe('GET /api/docs/ui', () => {
  it('returns 200 with HTML content-type', async () => {
    const res = await request(app).get('/api/docs/ui');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('HTML references /api/docs as the spec URL', async () => {
    const res = await request(app).get('/api/docs/ui');
    expect(res.text).toContain('/api/docs');
  });
});

describe('X-API-Version header on all responses', () => {
  it('is present on GET /api/docs', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.headers['x-api-version']).toBe(expectedMajor);
  });

  it('is present on GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-api-version']).toBe(expectedMajor);
  });

  it('is present on GET /api/players', async () => {
    const res = await request(app).get('/api/players');
    expect(res.headers['x-api-version']).toBe(expectedMajor);
  });

  it('is present on 404 responses', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.headers['x-api-version']).toBe(expectedMajor);
  });

  it('header value matches major version from package.json', () => {
    expect(expectedMajor).toMatch(/^\d+$/);
  });
});

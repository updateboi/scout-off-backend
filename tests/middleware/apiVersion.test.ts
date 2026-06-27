import { Request, Response, NextFunction } from 'express';
import { apiVersion, API_VERSION_HEADER } from '../../src/middleware/apiVersion';

function makeMocks() {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: jest.fn((name: string, value: string) => { headers[name] = value; }),
    getHeader: (name: string) => headers[name],
  } as unknown as Response;
  const req = {} as Request;
  const next: NextFunction = jest.fn();
  return { req, res, next, headers };
}

describe('apiVersion middleware', () => {
  it('sets the X-API-Version header', () => {
    const { req, res, next } = makeMocks();
    apiVersion(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith(API_VERSION_HEADER, expect.any(String));
  });

  it('calls next()', () => {
    const { req, res, next } = makeMocks();
    apiVersion(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('header value is the major version from package.json', () => {
    const { req, res, next, headers } = makeMocks();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../../package.json') as { version: string };
    const expectedMajor = version.split('.')[0];
    apiVersion(req, res, next);
    expect(headers[API_VERSION_HEADER]).toBe(expectedMajor);
  });

  it('header value is numeric (major version only, no dots)', () => {
    const { req, res, next, headers } = makeMocks();
    apiVersion(req, res, next);
    expect(headers[API_VERSION_HEADER]).toMatch(/^\d+$/);
  });
});

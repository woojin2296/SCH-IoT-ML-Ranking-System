import { createRequestLogger } from '@/lib/request-logger';
import { logUserRequest } from '@/lib/logs';

jest.mock('@/lib/logs', () => ({
  logUserRequest: jest.fn(),
}));

describe('createRequestLogger', () => {
  const request = {
    headers: new Map([
      ['x-forwarded-for', '203.0.113.10'],
    ]),
    method: 'GET',
    ip: undefined,
    nextUrl: { pathname: '/api/example' },
  } as unknown as Request;

  it('logs with default user id and ip', () => {
    const logger = createRequestLogger(request, '/api/example', 'GET', 1);
    logger(200, { foo: 'bar' });
    expect(logUserRequest).toHaveBeenCalledWith({
      userId: 1,
      path: '/api/example',
      method: 'GET',
      status: 200,
      metadata: { foo: 'bar' },
      ipAddress: '203.0.113.10',
    });
  });

  it('allows overriding user id', () => {
    const logger = createRequestLogger(request, '/api/example', 'POST', 1);
    logger(201, undefined, 99);
    expect(logUserRequest).toHaveBeenCalledWith({
      userId: 99,
      path: '/api/example',
      method: 'POST',
      status: 201,
      metadata: undefined,
      ipAddress: '203.0.113.10',
    });
  });
});

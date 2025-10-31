import { getSeoulTimestamp } from '@/lib/time';

describe('getSeoulTimestamp', () => {
  it('returns ISO string with +09:00 offset', () => {
    const timestamp = getSeoulTimestamp();
    expect(timestamp.endsWith('+09:00')).toBe(true);
    expect(() => new Date(timestamp)).not.toThrow();
  });
});

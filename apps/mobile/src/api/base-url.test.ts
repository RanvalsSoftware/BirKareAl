import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './base-url';

describe('mobile API base URL resolution', () => {
  it('keeps the Android emulator alias on Android', () => {
    expect(
      resolveApiBaseUrl({
        configuredApiBaseUrl: 'http://10.0.2.2:4000',
        platform: 'android',
      }),
    ).toBe('http://10.0.2.2:4000');
  });

  it('never sends iOS to the Android-only 10.0.2.2 alias', () => {
    expect(
      resolveApiBaseUrl({
        configuredApiBaseUrl: 'http://10.0.2.2:4000',
        expoHostUri: '192.168.1.29:8081',
        platform: 'ios',
      }),
    ).toBe('http://192.168.1.29:4000');
  });

  it('uses the Expo LAN host for native loopback development config', () => {
    expect(
      resolveApiBaseUrl({
        configuredApiBaseUrl: 'http://localhost:4000',
        expoHostUri: 'exp://192.168.1.50:8081',
        platform: 'ios',
      }),
    ).toBe('http://192.168.1.50:4000');
  });

  it('preserves explicit public API endpoints', () => {
    expect(
      resolveApiBaseUrl({
        configuredApiBaseUrl: 'https://birkare-api.ranvals.com/',
        expoHostUri: '192.168.1.50:8081',
        platform: 'ios',
      }),
    ).toBe('https://birkare-api.ranvals.com');
  });
});

import { describe, expect, it } from 'vitest';

import { createSupportEmailDraft, resolveSupportEmail } from './email';

describe('support email', () => {
  it('uses the user-provided mailbox while retaining public-config overrides', () => {
    expect(resolveSupportEmail()).toBe('birkareal@ranvals.com');
    expect(resolveSupportEmail({ supportEmail: ' team@ranvals.com ' })).toBe('team@ranvals.com');
  });

  it.each([
    '',
    'invalid',
    'user@host.com\r\nBcc: attacker@host.com',
    'user@host.com?bcc=other@host.com',
  ])('ignores an invalid runtime email and rejects it as a draft recipient: %s', (supportEmail) => {
    expect(resolveSupportEmail({ supportEmail })).toBe('birkareal@ranvals.com');
    expect(() => createSupportEmailDraft(supportEmail, 'Destek', 'Açıklama')).toThrow();
  });

  it('encodes Turkish text, reserved characters and newlines without adding recipients', () => {
    const draft = createSupportEmailDraft(
      'birkareal@ranvals.com',
      'Üretim sorunu',
      '  Fotoğraf: &bcc=x@example.com\nİkinci satır  ',
    );
    const url = new URL(draft);
    expect(url.pathname).toBe('birkareal@ranvals.com');
    expect(url.searchParams.get('subject')).toBe('BirKare AI · Üretim sorunu');
    expect(url.searchParams.get('body')).toBe('Fotoğraf: &bcc=x@example.com\nİkinci satır');
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
  });
});

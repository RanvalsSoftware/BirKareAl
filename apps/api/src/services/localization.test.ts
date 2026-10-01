import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryRepository } from '@birkare/database';
import { authMail, accountDeletionMail, type MailMessage, type MailService } from './mail.service.js';
import { communicationLanguage, preferredRequestLanguage } from './request-language.js';
import { getRequestContext } from './http.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

test('language selection is bounded, weighted and never interprets a country as a language', () => {
  assert.equal(communicationLanguage('en-GB'), 'en');
  assert.equal(communicationLanguage('tr_TR'), 'tr');
  assert.equal(communicationLanguage('de-DE'), 'de');
  assert.equal(communicationLanguage('es_ES'), 'es');
  assert.equal(communicationLanguage('ar-SA'), 'ar');
  assert.equal(communicationLanguage('en\r\nBcc: attacker'), undefined);
  assert.equal(preferredRequestLanguage('de-DE, tr-TR;q=0.9, en;q=0.8'), 'de');
  assert.equal(preferredRequestLanguage('tr;q=0.2,en-US;q=1'), 'en');
  assert.equal(preferredRequestLanguage('tr;q=0,en;q=0.5'), 'en');
  assert.equal(preferredRequestLanguage('en;q=2,tr'), 'tr');
  assert.equal(preferredRequestLanguage('*'), undefined);
  assert.equal(preferredRequestLanguage('en'.repeat(300)), undefined);
  assert.equal(preferredRequestLanguage('en;q=oops'), undefined);
  const context = getRequestContext({ header: name => name === 'accept-language' ? 'en-US' : undefined });
  assert.equal(context.preferredLocale, 'en');
});

test('English auth email keeps exact tokens, encoded links, validity and recipients', () => {
  for (const kind of ['verification','password-reset'] as const) {
    const token = kind === 'verification' ? '042179' : 'abc_DEF-123';
    const input = { kind, token, email: 'test+locale@example.test' };
    const turkish = authMail(input);
    const english = authMail({ ...input, locale: 'en-GB' });
    assert.equal(english.to, turkish.to);
    const links = [turkish,english].map(message => message.text.match(/birkareai:\/\/\S+/)?.[0]);
    assert.ok(links[0]);
    assert.equal(links[0], links[1]);
    const link = new URL(links[1]!);
    assert.equal(link.searchParams.get(kind === 'verification' ? 'code' : 'token'), token);
    assert.match(english.subject, kind === 'verification' ? /Verify your email/ : /Reset your password/);
    assert.match(english.text, kind === 'verification' ? /10 minutes/ : /1 hour/);
    assert.match(english.text, /only be used once/);
    assert.equal(authMail({ ...input, locale: 'tr-TR' }).text, turkish.text);
    for (const locale of ['de-DE', 'es-ES', 'ar'] as const) {
      const localized = authMail({ ...input, locale });
      assert.notEqual(localized.text, turkish.text);
      assert.equal(localized.text.match(/birkareai:\/\/\S+/)?.[0], links[0]);
      assert.match(localized.text, new RegExp(token));
    }
  }
  assert.throws(() => authMail({ kind:'verification',token:'123',email:'x@example.test',locale:'en' }), { code:'MAIL_DELIVERY_UNAVAILABLE' });
});

test('English deletion mail preserves validated destination and one-time token', () => {
  const input = { email:'test@example.test',token:'x'.repeat(64),webUrl:'https://ai.ranvals.com/birkare/hesap-silme/' };
  const tr = accountDeletionMail(input);
  const en = accountDeletionMail({ ...input,locale:'en' });
  assert.equal(tr.text.match(/https:\/\/\S+/)?.[0], en.text.match(/https:\/\/\S+/)?.[0]);
  assert.match(en.subject, /account deletion link/);
  assert.match(en.text, /30 minutes/);
  for (const locale of ['de-DE', 'es-ES', 'ar'] as const) {
    const localized = accountDeletionMail({ ...input, locale });
    assert.notEqual(localized.text, tr.text);
    assert.equal(localized.text.match(/https:\/\/\S+/)?.[0], tr.text.match(/https:\/\/\S+/)?.[0]);
  }
  assert.throws(() => accountDeletionMail({ ...input,webUrl:'http://foreign.example/delete',locale:'en' }), { code:'MAIL_DELIVERY_UNAVAILABLE' });
});

class CaptureMail implements MailService {
  readonly enabled = true;
  readonly sent: MailMessage[] = [];
  async send(message: MailMessage) { this.sent.push(message); }
}
function fixture() {
  const repository = new MemoryRepository();
  const mail = new CaptureMail();
  const service = new AuthService(repository,
    new PasswordService('fixture-localization-test-pepper'),
    new TokenService({ JWT_ACCESS_SECRET:'fixture-localization-access-signing-secret',JWT_ACCESS_TTL_SECONDS:900,JWT_ISSUER:'https://api.example.test',JWT_USER_AUDIENCE:'birkare-mobile' }),
    { NODE_ENV:'test',AUTH_DEV_MODE:false,REFRESH_TOKEN_TTL_DAYS:30,MAIL_APP_SCHEME:'birkareai' },
    { verify:async () => { throw new Error('No external Google call'); } },mail);
  return { repository,mail,service };
}
const registration = {
  email:'language@gmail.com',password:'Test-Passphrase-981!',firstName:'Language',lastName:'Test',locale:'en-GB',dateOfBirth:'1990-01-01',
  consent:{ termsAccepted:true,privacyAccepted:true,aiDisclosureAccepted:true,ageConfirmed:true,ownImageOrPermissionConfirmed:true },
} as const;

test('registration and recovery honor locale without weakening verification or disclosing accounts', async () => {
  const { repository,mail,service } = fixture();
  assert.deepEqual(await service.register(registration, {}), { verificationRequired:true });
  assert.match(mail.sent[0]!.subject,/Verify your email/);
  const code = mail.sent[0]!.text.match(/verification code: (\d{6})/)?.[1];
  assert.ok(code);
  const before = await repository.getUserByEmail(registration.email);
  assert.equal(before!.status,'PENDING_VERIFICATION');
  assert.equal(before!.locale,'en-GB');
  await service.verifyEmail(registration.email,code);
  await assert.rejects(() => service.verifyEmail(registration.email,code), {code:'AUTH_INVALID_VERIFICATION_TOKEN'});
  assert.deepEqual(await service.forgotPassword(registration.email,{preferredLocale:'tr'}),{});
  assert.match(mail.sent.at(-1)!.subject,/Şifreni yenile/);
  assert.equal((await repository.getUserByEmail(registration.email))!.locale,'en-GB');
  assert.deepEqual(await service.forgotPassword('unknown@gmail.com',{preferredLocale:'en'}),{});
  await service.requestAccountDeletionLink(registration.email,{preferredLocale:'en'});
  assert.match(mail.sent.at(-1)!.subject,/account deletion link/);
  assert.equal((await repository.getUserByEmail(registration.email))!.status,'ACTIVE');
});

import argon2 from 'argon2';
import { createHmac } from 'node:crypto';
import type { BirKareConfig } from '@birkare/config';

export class PasswordService {
  constructor(private readonly pepper: Pick<BirKareConfig, 'PASSWORD_PEPPER'>['PASSWORD_PEPPER']) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(`${password}${this.pepper}`, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, `${password}${this.pepper}`);
    } catch {
      return false;
    }
  }

  private dummyHash: Promise<string> | undefined;

  /** Constant-work stand-in for accounts that do not exist or have no password. */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash('birkare-timing-equalizer-not-a-credential');
    await this.verify(await this.dummyHash, password);
  }

  /**
   * Verification codes have a deliberately small, user-friendly key space.
   * A keyed digest prevents an attacker who obtains the database from
   * recovering every six-digit code with a trivial offline lookup table.
   */
  hashEmailVerificationCode(email: string, code: string): string {
    return createHmac('sha256', this.pepper)
      .update(`email-verification:v1\u0000${email.trim().toLowerCase()}\u0000${code}`, 'utf8')
      .digest('hex');
  }
}

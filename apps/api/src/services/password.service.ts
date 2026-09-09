import argon2 from 'argon2';
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
}

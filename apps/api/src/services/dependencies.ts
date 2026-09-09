import type { BirKareConfig } from '@birkare/config';
import { getConfig } from '@birkare/config';
import { createRepository, type BirKareRepository } from '@birkare/database';
import { createLogger, type Logger } from '@birkare/logger';
import { createStorageProvider, type StorageProvider } from '@birkare/storage';
import { AuthService } from '../modules/auth/auth.service.js';
import { GoogleIdTokenService } from '../modules/auth/google-id-token.service.js';
import { createGenerationQueue, type GenerationQueue } from '../queues/generation.queue.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { createMailService, type MailService } from './mail.service.js';

export type ApiDependencies = {
  config: BirKareConfig;
  logger: Logger;
  repository: BirKareRepository;
  storage: StorageProvider;
  tokenService: TokenService;
  passwordService: PasswordService;
  authService: AuthService;
  mailService: MailService;
  generationQueue: GenerationQueue;
};

export async function createApiDependencies(config = getConfig()): Promise<ApiDependencies> {
  const logger = createLogger(config);
  const repository = await createRepository(config, logger);
  const storage = createStorageProvider(config);
  const tokenService = new TokenService(config);
  const passwordService = new PasswordService(config.PASSWORD_PEPPER);
  const googleIdentityVerifier = new GoogleIdTokenService(config);
  const mailService = createMailService(config, logger);
  const authService = new AuthService(
    repository,
    passwordService,
    tokenService,
    config,
    googleIdentityVerifier,
    mailService,
  );
  const generationQueue = await createGenerationQueue({ config, repository, storage, logger });
  return {
    config,
    logger,
    repository,
    storage,
    tokenService,
    passwordService,
    authService,
    mailService,
    generationQueue,
  };
}

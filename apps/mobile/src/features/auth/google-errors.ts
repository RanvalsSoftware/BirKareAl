export type GoogleClientConfiguration = {
  iosClientId?: string;
  iosUrlScheme?: string;
  webClientId?: string;
};

export class GoogleAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export function googleConfigurationError(
  platform: string,
  clients: GoogleClientConfiguration,
): Error | null {
  if (platform === 'web')
    return new GoogleAuthError(
      'GOOGLE_NATIVE_REQUIRED',
      'Google ile giriş iOS ve Android uygulamalarında kullanılabilir.',
    );
  const validClient = (id?: string) =>
    Boolean(id && /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id));
  if (!validClient(clients.webClientId))
    return new GoogleAuthError(
      'GOOGLE_WEB_CLIENT_INVALID',
      'Google web istemcisi yapılandırılmamış. Uygulamanın güncel geliştirme sürümünü açın.',
    );
  if (platform === 'ios') {
    if (!validClient(clients.iosClientId))
      return new GoogleAuthError(
        'GOOGLE_IOS_CLIENT_INVALID',
        'Google iOS istemcisi yapılandırılmamış. iOS geliştirme sürümünü yeniden derleyin.',
      );
    const expectedScheme = `com.googleusercontent.apps.${clients.iosClientId!.replace('.apps.googleusercontent.com', '')}`;
    if (clients.iosUrlScheme !== expectedScheme)
      return new GoogleAuthError(
        'GOOGLE_IOS_SCHEME_MISMATCH',
        'Google iOS dönüş şeması istemciyle eşleşmiyor. Uygulamayı yeni iOS derlemesiyle güncelleyin.',
      );
    if (clients.iosClientId === clients.webClientId)
      return new GoogleAuthError(
        'GOOGLE_CLIENT_TYPES_MISMATCH',
        'Google iOS ve Web istemcileri aynı olamaz. Google Cloud istemci türlerini kontrol edin.',
      );
  }
  return null;
}

/** Native errors may contain internal URLs. Expose a stable diagnosis, never their raw payload. */
export function googleSignInError(error: unknown): Error {
  const object =
    error && typeof error === 'object' ? (error as { code?: unknown; message?: unknown }) : {};
  const code = String(object.code ?? '');
  const message = typeof object.message === 'string' ? object.message : '';
  if (code === 'AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED')
    return new GoogleAuthError(
      code,
      'Bu e-posta ile hesabın var. E-posta ve şifrenle giriş yap; Ayarlar > Güvenlik bölümünde Google hesabını bağla. Sonraki girişte Google kullanabilirsin.',
    );
  // Backend errors are already deliberately display-safe, with an independently useful code.
  // Keep network diagnoses too so a provider success followed by an API failure is not misreported
  // as a Google SDK/configuration problem.
  if (/^(AUTH|NETWORK)_[A-Z0-9_]+$/.test(code) && message) return error as Error;
  if (
    code === '10' ||
    code === 'DEVELOPER_ERROR' ||
    /DEVELOPER_ERROR|developer console is not set up/i.test(message)
  )
    return new GoogleAuthError(
      'GOOGLE_CLIENT_CONFIGURATION',
      'Google istemci yapılandırması eşleşmiyor. Android paket adı, imza SHA-1 ve Web Client ID birlikte kontrol edilmeli.',
    );
  if (/URL schemes|url scheme|invalid_client|redirect_uri_mismatch/i.test(message))
    return new GoogleAuthError(
      'GOOGLE_IOS_SCHEME_MISMATCH',
      'Google dönüş şeması bu kurulumla eşleşmiyor. Yeni iOS geliştirme derlemesini kurup tekrar deneyin.',
    );
  if (
    code === '7' ||
    code === 'NETWORK_ERROR' ||
    /network|internet|connection|ağ bağlant/i.test(message)
  )
    return new GoogleAuthError(
      'GOOGLE_NETWORK_ERROR',
      'Google veya BirKare sunucusuna ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.',
    );
  if (code === 'NULL_PRESENTER')
    return new GoogleAuthError(
      code,
      'Google giriş ekranı açılamadı. Açık pencereyi kapatıp yeniden deneyin.',
    );
  if (error instanceof GoogleAuthError) return error;
  return new GoogleAuthError(
    'GOOGLE_SIGN_IN_FAILED',
    'Google girişi tamamlanamadı. Uygulamayı güncelleyip tekrar deneyin.',
  );
}

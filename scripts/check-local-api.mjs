import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

// Read-only diagnostic. Never prints passwords, full DATABASE_URL, OAuth tokens or API keys.
const expected = '2026-09-23-email-recovery-v1';
let failed = false;
try {
  const env = parseEnv(readFileSync(resolve('.env'), 'utf8'));
  const base = env.EXPO_PUBLIC_API_BASE_URL?.trim();
  console.log('Mobile API:', base ? new URL(base).origin : '(root .env içinde tanımlı değil)');
  if (!base || !['http://localhost:4000', 'http://127.0.0.1:4000'].includes(base.replace(/\/$/, ''))) {
    failed = true;
    console.error('iOS Simulator için EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 olmalı.');
  }
} catch {
  failed = true;
  console.error('Komutu .env bulunan repo kökünden çalıştır.');
}
try {
  const response = await fetch('http://localhost:4000/health', { signal: AbortSignal.timeout(5000) });
  const payload = await response.json();
  const data = payload?.data;
  console.log(JSON.stringify({
    status: response.status, service: data?.service, authProtocol: data?.authProtocol ?? '(yok / eski API)',
    emailRegistrationPolicy: data?.emailRegistrationPolicy ?? '(yok)',
    accountDeletionRecoveryDays: data?.accountDeletionRecoveryDays ?? '(yok)',
    repository: data?.repository ?? '(bilinmiyor)',
  }, null, 2));
  if (!response.ok || !payload?.success || data?.service !== 'birkare-api' || data?.authProtocol !== expected || data?.accountDeletionRecoveryDays !== 30 || data?.emailRegistrationPolicy !== 'known-providers-v1') {
    failed = true;
    console.error('4000 portundaki API bu kod sürümüyle eşleşmiyor. Yeni EAS build bunu düzeltmez. API/Docker image güncellenmeli.');
  } else {
    console.log('OK: Beklenen hesap geri alma ve e-posta politikası çalışan API üzerinde mevcut.');
    if (data?.repository === 'memory') console.log('NOT: Memory backend yeniden başlayınca test hesapları kaybolur. Kalıcı test için yerel PostgreSQL kullan.');
  }
} catch {
  failed = true;
  console.error('localhost:4000 yanıt vermedi. API terminalindeki başlatma hatasını kontrol et.');
}
if (failed) {
  if (process.platform === 'darwin') {
    const result = spawnSync('lsof', ['-nP', '-iTCP:4000', '-sTCP:LISTEN'], { encoding: 'utf8' });
    if (result.stdout) console.log(result.stdout);
  }
  const docker = spawnSync('docker', ['ps', '--filter', 'publish=4000', '--format', '{{.Names}} | {{.Image}} | {{.Ports}}'], { encoding: 'utf8' });
  if (docker.stdout) console.log('4000 portunu yayınlayan Docker container:\n' + docker.stdout);
  console.error('Hiçbir süreç durdurulmadı ve veri değiştirilmedi. Çalışan eski API’yi belirleyip güncelle.');
  process.exitCode = 1;
}

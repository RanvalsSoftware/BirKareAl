# BirKare — Rıdvan için GHCR / Portainer teslimi

Hazırlanma: 8 Eylül 2026. Bu dağıtım **backend API + worker** içindir; mobil uygulama veya web/landing-page değildir. Logo/header/favicon değişikliği bu işin kapsamında değildir.

## 1. Kurulacak parçalar

| Parça               | Konum / değer                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| API image           | `ghcr.io/ranvals-software/birkare-api:2026.09.08-2`                                |
| Worker image        | `ghcr.io/ranvals-software/birkare-worker:2026.09.08-2`                             |
| Platform            | `linux/amd64`                                                                      |
| Üretim tipi Compose | `docker-compose.production.yml`; ayrı API, worker, Redis ve tek seferlik migration |
| PostgreSQL          | **Cloud SQL üzerinde harici**; Compose PostgreSQL kurmaz, Cloud SQL Auth Proxy kullanır |
| Redis               | Compose içinde; şifreli erişim, kalıcı volume, internete yayınlanan port yok       |
| Fotoğraflar         | Portainer tek host ise API/worker ortak Docker volume'u; R2 kullanılmıyor          |
| İlk ortam           | Staging; production için ayrı DB ve sırlar kullanılmalı                            |
| Destek e-postası    | `birkareal@ranvals.com` — kullanıcı tarafından sağlandı; teslimat testi yapılmadı  |

Mevcut `docker-compose.yml` yalnız yerel geliştirme içindir ve değiştirilmeden korunur. Rıdvan'a Portainer için doğrudan **`docker-compose.portainer.yml`** dosyasını ver. Bu dosya proxy, otomatik migration, Redis, API ve worker servislerinin tamamını içerir. `docker-compose.production.yml` aynı yapının daha ayrıntılı production kopyasıdır; Portainer'a verilecek tek dosya olarak `docker-compose.portainer.yml` kullanılmalıdır.

## 2. Rıdvan'a iletilecek veritabanı bilgileri

- DB adı: `birkare_staging`
- DB kullanıcı adı: `birkare_app_bec53aef`
- DB parolası: özel `.local-credentials/deployment/portainer.env` dosyasındaki `DB_PASSWORD`; bu dokümanda veya sohbette yayımlanmaz.

Bu bilgiler yalnızca **hazırlanmıştır**; Cloud SQL'de DB/kullanıcı oluşturulmuş değildir. Rıdvan DB ve kullanıcıyı oluşturup gerekli schema/migration yetkilerini vermelidir. Cloud SQL superuser bilgilerini uygulamaya vermeyin; kullanıcıyı uygulamanın kendi veritabanıyla sınırlandırın. Şifreler e-posta/GitHub parolasından bağımsız, kriptografik rastgele üretilmiştir.

Geri dönmesi gereken bilgiler:

1. Cloud SQL host/port ve bağlantı yöntemi: özel ağ üzerinden doğrudan TLS veya operatörün sağladığı Cloud SQL Auth Proxy adresi.
2. Doğrudan TLS için gereken CA/istemci sertifikaları ve erişim/allowlist ayarları. Sertifikalar image'a konmaz; gerekiyorsa runtime secret olarak mount edilir. Yalnız `sslmode=require` yazmak sunucu kimliğinin doğrulandığını tek başına kanıtlamaz; CA/hostname doğrulaması bağlantı yöntemine göre yapılandırılmalıdır.
3. API için gerçek HTTPS alan adı ve reverse proxy'nin bağlantı/topoloji bilgisi.
4. R2 kullanılacak başka bir production topolojisi varsa private R2 endpoint, bucket ve yalnız ilgili bucket için gerekli erişim anahtarları. **Portainer için verilen `docker-compose.portainer.yml` R2 istemez.**
5. Mail gönderimi için SMTP host, port, TLS modu, gönderici adı/adresi ve sağlayıcı gerektiriyorsa uygulama parolası. Gerçek e-posta teslim kodu ayrıca tamamlanmalıdır.

Cloud SQL Auth Proxy/Connector bağlantılarında TLS yönetimi ile doğrudan TLS bağlantıları farklıdır; operatör bu seçimi netleştirmelidir. [Cloud SQL SSL/TLS belgesi](https://docs.cloud.google.com/sql/docs/postgres/configure-ssl-instance)

## 3. Env dosyaları ve sırlar

- Paylaşılabilir şablon: `.env.production.example`; gerçek sır içermez.
- Özel teslim dosyası: `.local-credentials/deployment/portainer.env`; yalnız dosya sahibi okuyabilir (`600`), üst klasör `700`.
- Bu özel dosyada yeni DB, Redis, JWT ve pepper değerleri hazır; mevcut backend AI anahtarı da yalnız buraya kopyalandı. Yerelde kullanılan DB/parola/JWT ayarları değiştirilmedi.
- `JWT_ISSUER` ve `CORS_ORIGINS` operatör bilgileri gelene kadar boştur. Portainer compose `DB_NAME/DB_USER/DB_PASSWORD` değerlerinden proxy üzerinden kullanılacak `DATABASE_URL` değerini oluşturur; R2 env değerleri bu stack için kullanılmaz.
- `DB_NAME/DB_USER/DB_PASSWORD` operatör teslim bilgisidir; bu üç değeri yazmak otomatik DB oluşturmaz. DB parolası URL-safe olmalıdır.
- `SUPPORT_EMAIL` iletişim bilgisidir; mevcut backend config bunu SMTP gönderici ayarı olarak kullanmaz. Mail şifresi ve GitHub PAT bu dosyada saklanmadı.
- Sohbette görünen GitHub tokenları, mail parolası ve AI anahtarı yenilenmelidir. Kalıcı `PASSWORD_PEPPER` veya JWT sırrını ileride plansız değiştirmeyin; hesap/oturum erişimini etkileyebilir.

Rıdvan'a özel dosyayı parola yöneticisinin güvenli paylaşımı gibi ayrı bir kanalla ilet; repoya, package açıklamasına, ekran görüntüsüne veya genel sohbet grubuna yapıştırma. Portainer yöneticileri container runtime env değerlerini görebilir; "image'a gömülmedi" ifadesi "sunucu yöneticileri göremez" anlamına gelmez.

## 4. Image build / Packages yayını

Repo kökünden build edilir. Backend Dockerfile'ları env dosyalarını kopyalamaz; sırları `ARG`, `ENV`, `--build-arg` veya Dockerfile satırlarına yazmayın. `.dockerignore` ortam dosyalarını, özel credential dizinlerini ve imzalama anahtarlarını build bağlamından dışlar.

```sh
docker build --platform=linux/amd64 -f infra/docker/api.Dockerfile -t ghcr.io/ranvals-software/birkare-api:2026.09.08-2 -t ghcr.io/ranvals-software/birkare-api:latest .
docker build --platform=linux/amd64 -f infra/docker/worker.Dockerfile -t ghcr.io/ranvals-software/birkare-worker:2026.09.08-2 -t ghcr.io/ranvals-software/birkare-worker:latest .
node scripts/audit-release-images.mjs ghcr.io/ranvals-software/birkare-api:2026.09.08-2 ghcr.io/ranvals-software/birkare-worker:2026.09.08-2
docker push ghcr.io/ranvals-software/birkare-api:2026.09.08-2
docker push ghcr.io/ranvals-software/birkare-worker:2026.09.08-2
docker push ghcr.io/ranvals-software/birkare-api:latest
docker push ghcr.io/ranvals-software/birkare-worker:latest
```

Yayın için `write:packages`, özel paket indirmek için `read:packages` yetkisi gerekir. Yeni GHCR paketleri varsayılan olarak private başlar; bu iş kapsamında public yapılmaz. Portainer'a registry olarak `ghcr.io`, yetkili kullanıcı ve sadece indirme yetkili token eklenmelidir. Tokenı Docker komut satırındaki `-p` seçeneğine yazmayın; yeniden login gerekiyorsa `--password-stdin` kullanın. [GitHub Container Registry belgesi](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

Bu klasörde Git geçmişi bulunmadığı için doğrulanmamış repo URL/commit etiketi eklenmez. Package görünmesi, kaynak kodun GitHub reposuna push edildiği anlamına gelmez.

## 5. Portainer / Compose kurulumu

Hedef: Portainer **Docker Standalone / Compose stack**. Swarm kullanılıyorsa profiles, depends_on ve env/secret davranışları ayrıca uyarlanmalı; bu dosyayı doğrudan `docker stack deploy` ile aynı davranır varsaymayın. Compose `.env` interpolation özelliği Swarm ile aynı değildir. [Docker değişken belgesi](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)

1. Rıdvan Cloud SQL DB/kullanıcıyı, instance connection name'i ve least-privilege service-account JSON'u hazırlar. Compose içindeki `cloudsql-proxy` servisi API, worker ve migration için Cloud SQL bağlantısını sağlar; Cloud SQL portu host'a yayınlanmaz.
2. Özel env dosyasındaki eksikler tamamlanır. `AUTH_DEV_MODE=false`, harici prisma DB, BullMQ ve API/worker ortak storage volume'u Portainer Compose içinde zorunludur. Bu Portainer stack R2 kullanmaz ve `ALLOW_LOCAL_STORAGE=true` ile bu bilinçli tek-host tercihini etkinleştirir.
3. Portainer registry erişimi yapılandırılır. **`docker-compose.portainer.yml` dosyasının tamamı** Stack Editor'a alınır; private env değerleri Stack > Environment variables alanına verilir. Bir `.env` dosyasının kendiliğinden sunucuda var olduğunu varsaymayın.
4. `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `CLOUD_SQL_INSTANCE_CONNECTION_NAME` ve `CLOUD_SQL_CREDENTIALS_FILE` verilir; compose uygulama bağlantısını otomatik olarak `cloudsql-proxy:5432` adresine kurar. `docker compose up -d` migration'ı tek seferlik otomatik çalıştırır; boş staging DB için geçmiş doğrulanır, dolu DB için önce yedek alınır. `migrate reset`, veri kayıplı `db push`, eski kullanıcı/kredi temizliği yapılmaz.
5. Migration başarılıysa API ve worker otomatik başlar. `DISABLE_ALL_GENERATION=false` ilk kurulumda korunur.
6. API'nin 4000 portu reverse proxy üzerinden HTTPS'e bağlanır. Host proxy için loopback bind; proxy ayrı container'daysa ortak özel Docker ağı üzerinden `api:4000` tercih edilir. API'yi yanlışlıkla tüm internete bind etmeyin. Proxy topolojisi doğrulanmadan `TRUST_PROXY=true` yapmayın.
7. Health/readiness, worker logları, Cloud SQL bağlantısı, ortak storage volume'u ve Redis kalıcılığı doğrulanır. Yalnız HTTP 200 gerçek AI/mail/ödeme işlevlerinin testi değildir.

## 5.1 Migration ve Cloud SQL Proxy otomatik başlatma akışı

Bu bölüm migration'ın nasıl **otomatik tetikleneceğini** tanımlar. `migrate`
servisi sürekli çalışan bir servis değildir; `docker compose up -d` sırasında bir
kez çalışır ve tamamlanır. API ile worker, `migrate` başarıyla tamamlanmadan
başlamaz. Böylece migration başarısızsa uygulama yarım yapılandırılmış veritabanı
ile çalışmaya başlamaz.

Rıdvan'ın Portainer sunucusunda hazırlaması gerekenler:

1. Cloud SQL'de uygulamaya özel DB ve kullanıcı oluşturulur. Uygulama parolası
	 URL-safe olmalıdır; superuser bilgisi kullanılmaz.
2. Cloud SQL için `INSTANCE_CONNECTION_NAME` değeri alınır:
	 `project-id:region:instance-name`.
3. Yalnız bu DB'ye erişebilen bir Google service account oluşturulur ve JSON
	 anahtarı Portainer host'una güvenli bir dosya olarak konur. Örnek yol:
	 `/secure/birkare/cloudsql-service-account.json`.
4. Portainer Stack environment alanına `.env.production.example` içindeki
	 değerler girilir. Özellikle şu alanlar zorunludur:
	 `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
	 `CLOUD_SQL_INSTANCE_CONNECTION_NAME`, `CLOUD_SQL_CREDENTIALS_FILE`.
5. `CLOUD_SQL_CREDENTIALS_FILE`, host üzerindeki JSON yolunu göstermelidir.
	 Compose içindeki `cloudsql-proxy` bu dosyayı
	 `/run/secrets/cloudsql-service-account` olarak okur. Proxy dışarıya port
	açmaz; API, worker ve migration yalnızca `cloudsql-proxy:5432` adresini
	kullanır. Fotoğraf ve çıktı dosyaları R2 yerine `birkare-storage` Docker
	volume'unda tutulur; API ve worker aynı volume'u mount eder.

Portainer Stack deploy edildiğinde normal başlatma komutu migration'ı otomatik
olarak tetikler:

```sh
docker compose --env-file /secure/birkare/portainer.env \
	-f docker-compose.production.yml up -d
```

Compose sırası şöyledir: `cloudsql-proxy` başlar, `migrate` servisi
`prisma migrate deploy` çalıştırır, migration başarılı olursa API ve worker
başlar. Başarılı çıktıda migration geçmişi uygulanır veya `No pending migrations
to apply` görülür. Hata olursa API ve worker başlatılmaz; proxy ve migration
loglarını kontrol edin:

```sh
docker compose --env-file /secure/birkare/portainer.env \
	-f docker-compose.production.yml logs cloudsql-proxy migrate
```

Migration container'ını elle tekrar denemek gerekirse önce hatayı düzelttikten
sonra stack'i yeniden oluşturun:

```sh
docker compose --env-file /secure/birkare/portainer.env \
	-f docker-compose.production.yml up -d --force-recreate migrate
docker compose --env-file /secure/birkare/portainer.env \
	-f docker-compose.production.yml up -d
```

Son kontrol: API'nin `/health` ve `/ready` endpointleri HTTP 200 dönmeli; worker
logunda `BullMQ worker hazır` görülmeli. Migration'dan önce dolu veritabanının
yedeğini alın. `prisma migrate reset`, `db push` veya migration container'ını
kalıcı servis olarak çalıştırmayın.

Operatörün aynı dosyayla terminalden uygulayabileceği komutlar:

```sh
docker compose --env-file /secure/birkare/portainer.env -f docker-compose.production.yml config --quiet
docker compose --env-file /secure/birkare/portainer.env -f docker-compose.production.yml pull
docker compose --env-file /secure/birkare/portainer.env -f docker-compose.production.yml --profile tools run --rm migrate
docker compose --env-file /secure/birkare/portainer.env -f docker-compose.production.yml up -d
docker compose --env-file /secure/birkare/portainer.env -f docker-compose.production.yml ps
```

`/secure/birkare/portainer.env` operatörün güvenli sunucu konumu için örnektir; bu çalışmada o sunucuya dosya gönderilmedi. `CLOUD_SQL_CREDENTIALS_FILE` bu host üzerindeki service-account JSON yolunu göstermelidir. `config` komutunu **`--quiet` olmadan** log/sohbete göndermeyin: çözümlenen sırları gösterir.

Redis şifre değişimini sıradan env düzenlemesi saymayın: API/worker bağlantı URL'si ve Redis kimlik doğrulaması birlikte yenilenmelidir. Redis volume'u silmeyin; kuyruk işleri kaybolabilir. Release sabit tag/digest ile pinlenmeli, geri dönüşte API ve worker birlikte önceki uyumlu sürüme alınmalıdır.

## 6. Henüz yayın öncesi tamamlanması gerekenler

- Gerçek SMTP teslimi: `register`, yeniden doğrulama ve parola sıfırlama kodları token oluşturuyor ama gerçek mail gönderimi henüz bağlı değil. Mail hesabı açmak/şifre vermek bu kodu tamamlamaz. `AUTH_DEV_MODE=false` korunur; bunu açarak üretimde debug token yayımlamayın.
- Cloud SQL/proxy bağlantıları bu makineden doğrulanmış değildir; R2’siz Portainer storage volume'u compose doğrulamasından geçmiştir.
- Destek adresi mobilde güncellense de mobil release bundle yeniden build edilmeden dağıtılmış uygulama değişmez. Gerçek HTTPS API adresi de mobil build ortamına verilmelidir; server sırları mobile taşınmaz.
- AI testleri ücret doğurabilir; önce ayrı onay ve düşük bütçe. Önceki onay tek test içindi, yeni deployment başka üretim için otomatik onay sayılmaz.
- Önceki incelemede saptanan kredi finalizasyonu kenar durumları ve diğer staging kabul kapıları: [runtime incelemesi](friday-generation-comparison-2026-09-08.md), [staging yol haritası](backend-staging-roadmap.md).

## 7. Bu teslimin doğrulama kaydı

API ve worker **GHCR'a yüklendi**; her ikisi için `2026.09.08-1` ve `latest` etiketleri aynı ilgili digest'i gösteriyor:

| Image                                     | Registry digest                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `ghcr.io/ranvals-software/birkare-api`    | `sha256:bd0745925aaca9978e19c73a63f077f50000220c2d2e4eeacb0fcc1ee126ed0c` |
| `ghcr.io/ranvals-software/birkare-worker` | `sha256:9fdccf71ba30997d277cd571f1fe71b6513cfedf7eda7251e4177bb191b7d5a7` |

- İki image `linux/amd64`, runtime kullanıcısı `node`; backend dependency graph'ı kuruldu.
- Her image'ın **9 katmanı**, config ve history'si bilinen yerel sırlar ve uygulama env/anahtar dosyaları için tarandı: eşleşme yok. Bu kontrol bilinmeyen sırları veya iç içe sıkıştırılmış dosyaların içeriğini bütünüyle taradığını iddia etmez.
- Son release API image'ının içinde ağsız testler **85/85** geçti. Kaynak API/worker/AI TypeScript kontrolleri de geçti.
- Compose/deployment testleri **4/4**, audit yardımcı testleri **4/4** geçti.
- Prisma CLI doğrudan Node ile `--network none --read-only` altında çalıştı. Production migration bu yolla başlatılır; runtime `pnpm` komutu kullanılmaz (non-root Corepack cache'i hazır değildir).
- Mobil destek maili değişiklikleri için **272/272** test, TypeScript ve değişen dosyaların lint kontrolü geçti; yeni mobil release oluşturulmadı.
- Mevcut Docker GHCR oturumu kullanıldı; sohbetteki tokenlar dosyaya alınmadı. Package görünürlüğünü public yapma veya başka paketleri değiştirme işlemi yapılmadı.

Yerel backend ayrıca düzeltme ile yeniden başlatıldı; sağlık/readiness ve ücretsiz model erişimi kontrolü başarılı. Cloud SQL/Portainer sunucusunda deployment veya migration **yapılmadı**; gerçek bağlantı/R2/SMTP bilgileri eksik. Image'ın Packages'a yüklenmesi sunucunun veya mobil uygulamanın canlıya alındığı anlamına gelmez.

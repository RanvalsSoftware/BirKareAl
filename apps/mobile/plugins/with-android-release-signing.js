const { withAppBuildGradle } = require('expo/config-plugins');

const start = '// @generated begin birkare-release-signing';
const end = '// @generated end birkare-release-signing';

/** Local Gradle releases must never inherit the generated debug keystore. EAS manages signing separately. */
function signingContents(contents) {
  const existing = contents.indexOf(start);
  if (existing !== -1) {
    const finish = contents.indexOf(end, existing);
    if (finish === -1) throw new Error('Incomplete BirKare Android signing block');
    contents = contents.slice(0, existing) + contents.slice(finish + end.length);
  }
  return (
    contents.trimEnd() +
    `

${start}
if (System.getenv("EAS_BUILD") != "true") {
    def uploadStore = System.getenv("BIRKARE_ANDROID_KEYSTORE_PATH")
    def uploadAlias = System.getenv("BIRKARE_ANDROID_KEY_ALIAS")
    def uploadStorePassword = System.getenv("BIRKARE_ANDROID_KEYSTORE_PASSWORD")
    def uploadKeyPassword = System.getenv("BIRKARE_ANDROID_KEY_PASSWORD")
    android.signingConfigs {
        release {
            if (uploadStore) storeFile file(uploadStore)
            if (uploadAlias) keyAlias uploadAlias
            if (uploadStorePassword) storePassword uploadStorePassword
            if (uploadKeyPassword) keyPassword uploadKeyPassword
        }
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.release
    def validateBirKareReleaseSigning = {
            if (!uploadStore || !uploadAlias || !uploadStorePassword || !uploadKeyPassword)
                throw new GradleException("BirKare: release upload signing credentials are required. Use scripts/android-release.mjs; debug signing is forbidden.")
            if (!file(uploadStore).isFile() || uploadAlias.equalsIgnoreCase("androiddebugkey"))
                throw new GradleException("BirKare: a valid non-debug upload keystore is required.")
            try {
                def store = java.security.KeyStore.getInstance(file(uploadStore), uploadStorePassword.toCharArray())
                def cert = store.getCertificate(uploadAlias)
                if (!store.isKeyEntry(uploadAlias) || cert == null || cert.subjectX500Principal.name.toLowerCase().contains("cn=android debug"))
                    throw new Exception("Invalid upload entry")
            } catch (Exception ignored) {
                throw new GradleException("BirKare: unable to validate a private non-debug upload key.")
            }
            if (!(System.getenv("EXPO_PUBLIC_APP_ENV") in ["staging", "production"]))
                throw new GradleException("BirKare: release requires an explicit staging or production environment.")
    }
    // Fail before dependency resolution for explicit release tasks; keep the
    // graph check for aggregate tasks such as bundle/assemble as well.
    if (gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") })
        validateBirKareReleaseSigning()
    gradle.taskGraph.whenReady { graph ->
        if (graph.allTasks.any { it.project == project && it.name.toLowerCase().contains("release") })
            validateBirKareReleaseSigning()
    }
}
${end}
`
  );
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== 'groovy')
      throw new Error('BirKare signing requires Groovy build.gradle');
    result.modResults.contents = signingContents(result.modResults.contents);
    return result;
  });
}

module.exports = withAndroidReleaseSigning;
module.exports.signingContents = signingContents;

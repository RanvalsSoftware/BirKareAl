const { IOSConfig, withDangerousMod, withFinalizedMod } = require('expo/config-plugins');
const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const start = '# @generated begin birkare-ios-release-environment';
const end = '# @generated end birkare-ios-release-environment';
const block = `${start}
# Xcode does not automatically select Expo's .env.production before every
# native script phase. Select it for Archive/Release; app.config validation
# then rejects any development or non-HTTPS value that still overrides it.
if [[ "$CONFIGURATION" == *Release* ]]; then
  export NODE_ENV=production
fi
${end}`;

function releaseEnvironmentContents(contents) {
  const existing = contents.indexOf(start);
  if (existing !== -1) {
    const finish = contents.indexOf(end, existing);
    if (finish === -1) throw new Error('Incomplete BirKare iOS release environment block');
    contents = contents.slice(0, existing) + contents.slice(finish + end.length);
  }
  return `${contents.trimEnd()}\n\n${block}\n`;
}

function darkInfoPlistContents(contents) {
  const styleEntry = /(<key>UIUserInterfaceStyle<\/key>\s*<string>)[^<]*(<\/string>)/;
  if (styleEntry.test(contents)) {
    return contents.replace(styleEntry, '$1Dark$2');
  }

  const dictEnd = contents.lastIndexOf('</dict>');
  if (dictEnd === -1) throw new Error('Invalid iOS Info.plist: missing </dict>');
  return `${contents.slice(0, dictEnd)}\t<key>UIUserInterfaceStyle</key>\n\t<string>Dark</string>\n${contents.slice(dictEnd)}`;
}

module.exports = function withIosReleaseEnvironment(config) {
  const releaseEnvironmentConfig = withDangerousMod(config, [
    'ios',
    async (mod) => {
      const envPath = path.join(mod.modRequest.platformProjectRoot, '.xcode.env');
      let contents = '';
      try {
        contents = await readFile(envPath, 'utf8');
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        contents = 'export NODE_BINARY=$(command -v node)\n';
      }
      await writeFile(envPath, releaseEnvironmentContents(contents), 'utf8');
      return mod;
    },
  ]);

  // Run after every other iOS mod. Expo's splash/theme plugins can otherwise
  // restore an old `Automatic` value from an existing native project.
  return withFinalizedMod(releaseEnvironmentConfig, [
    'ios',
    async (mod) => {
      const infoPlistPath = IOSConfig.Paths.getInfoPlistPath(mod.modRequest.projectRoot);
      const contents = await readFile(infoPlistPath, 'utf8');
      await writeFile(infoPlistPath, darkInfoPlistContents(contents), 'utf8');
      return mod;
    },
  ]);
};

module.exports.releaseEnvironmentContents = releaseEnvironmentContents;
module.exports.darkInfoPlistContents = darkInfoPlistContents;

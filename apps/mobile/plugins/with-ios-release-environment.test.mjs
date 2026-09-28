import { describe, expect, it } from 'vitest';
import plugin from './with-ios-release-environment.js';

const { darkInfoPlistContents, releaseEnvironmentContents } = plugin;

describe('iOS release environment config plugin', () => {
  it('adds one idempotent Release-only production selector', () => {
    const first = releaseEnvironmentContents('export NODE_BINARY=$(command -v node)\n');
    const second = releaseEnvironmentContents(first);
    expect(second).toBe(first);
    expect(second.match(/@generated begin birkare-ios-release-environment/g)).toHaveLength(1);
    expect(second).toContain('if [[ "$CONFIGURATION" == *Release* ]]');
    expect(second).toContain('export NODE_ENV=production');
  });

  it('rejects a truncated generated block', () => {
    expect(() =>
      releaseEnvironmentContents('# @generated begin birkare-ios-release-environment\n'),
    ).toThrow('Incomplete BirKare iOS release environment block');
  });

  it('forces an existing native interface style to dark', () => {
    expect(
      darkInfoPlistContents(
        '<plist><dict><key>UIUserInterfaceStyle</key>\n<string>Automatic</string></dict></plist>',
      ),
    ).toContain('<key>UIUserInterfaceStyle</key>\n<string>Dark</string>');
  });

  it('adds the native interface style when it is absent', () => {
    const updated = darkInfoPlistContents('<plist><dict>\n</dict></plist>');
    expect(updated).toContain('<key>UIUserInterfaceStyle</key>\n\t<string>Dark</string>');
  });

  it('rejects malformed plist contents', () => {
    expect(() => darkInfoPlistContents('<plist>')).toThrow('missing </dict>');
  });
});

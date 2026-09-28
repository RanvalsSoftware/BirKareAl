import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const {
  optimizationProperties,
  excludeUnusedRevenueCatAmazonStore,
  upsertGradleProperty,
  useOptimizedDefaultRules,
} = require('./with-android-code-optimization.js');

test('enables release minification, resource shrinking, and optimized resource shrinking', () => {
  assert.deepEqual(optimizationProperties, {
    'android.enableMinifyInReleaseBuilds': 'true',
    'android.enableShrinkResourcesInReleaseBuilds': 'true',
    'android.r8.optimizedResourceShrinking': 'true',
  });
});

test('replaces an existing Gradle property instead of creating conflicting values', () => {
  const properties = [
    { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'false' },
    { type: 'property', key: 'hermesEnabled', value: 'true' },
  ];
  assert.deepEqual(
    upsertGradleProperty(properties, 'android.enableMinifyInReleaseBuilds', 'true'),
    [
      { type: 'property', key: 'hermesEnabled', value: 'true' },
      { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
    ],
  );
});

test('uses the optimized Android default rules and remains idempotent', () => {
  const source =
    'proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"';
  const optimized = useOptimizedDefaultRules(source);
  assert.match(optimized, /proguard-android-optimize\.txt/);
  assert.equal(useOptimizedDefaultRules(optimized), optimized);
  assert.throws(() => useOptimizedDefaultRules('android { }'), /configuration was not found/);
});

test('excludes RevenueCat Amazon support without duplicating the Gradle block', () => {
  const source = 'plugins { id "com.android.application" }\n\nandroid {\n}';
  const optimized = excludeUnusedRevenueCatAmazonStore(source);

  assert.match(optimized, /module: "purchases-store-amazon"/);
  assert.match(optimized, /-dontoptimize/);
  assert.equal(excludeUnusedRevenueCatAmazonStore(optimized), optimized);
  assert.throws(
    () => excludeUnusedRevenueCatAmazonStore('plugins { }'),
    /application Gradle block was not found/,
  );
});

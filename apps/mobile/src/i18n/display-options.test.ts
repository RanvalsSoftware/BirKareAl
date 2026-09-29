import { afterEach, expect, it } from 'vitest';
import { setLanguagePreference, tr } from './engine';
import { displayOption } from './display-options';

afterEach(async () => { await setLanguagePreference('tr'); });
it('localizes legacy options only at the presentation boundary', async () => {
  const original = ['Önizleme','Standart','HD','Yakın','Orta','Uzak'];
  await setLanguagePreference('en');
  expect(original.map(displayOption)).toEqual(['Preview','Standard','HD','Close-up','Medium','Wide']);
  expect(original).toEqual(['Önizleme','Standart','HD','Yakın','Orta','Uzak']);
  expect(displayOption('file:///photo.jpg')).toBe('file:///photo.jpg');
  expect(displayOption('old_money_portrait')).toBe('old_money_portrait');
  await setLanguagePreference('tr');
  expect(original.map(displayOption)).toEqual(original);
});
it('uses singular and plural whole messages without altering interpolated user content', async () => {
  await setLanguagePreference('en');
  expect(tr('{{p0}} kredi',{p0:1})).toBe('1 credit');
  expect(tr('{{p0}} kredi',{p0:2})).toBe('2 credits');
  expect(tr('{{p0}} görsel',{p0:1})).toBe('1 image');
  expect(tr('{{p0}} görsel',{p0:4})).toBe('4 images');
  expect(tr('{{p0}}',{p0:'Sade Lüks'})).toBe('Sade Lüks');
});

import { useSyncExternalStore } from 'react';
import { getLanguageSnapshot, subscribeLanguage } from './engine';
export function useLanguage() { return useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getLanguageSnapshot); }
/** Subscribe without remounting the screen, form, upload or generation state. */
export function useLanguageRevision() { return useLanguage().locale; }

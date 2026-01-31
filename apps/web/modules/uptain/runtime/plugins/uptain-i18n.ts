import { defineNuxtPlugin } from 'nuxt/app';
import de from '../lang/de.json';
import en from '../lang/en.json';

export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp();

  if ($i18n?.mergeLocaleMessage) {
    $i18n.mergeLocaleMessage('de', de);
    $i18n.mergeLocaleMessage('en', en);
  }
});


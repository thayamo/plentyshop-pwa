import { defineNuxtPlugin, useHead, useRuntimeConfig } from 'nuxt/app';

export default defineNuxtPlugin(() => {
  const { getSetting } = useSiteSettings('uptainId');
  const uptainId = getSetting() || useRuntimeConfig().public.uptainId || '';

  // Only load script if uptainId is configured
  if (uptainId && uptainId !== 'XXXXXXXXXXXXXXXX') {
    useHead({
      script: [
        {
          type: 'text/javascript',
          src: `https://app.uptain.de/js/uptain.js?x=${uptainId}`,
          async: true,
        },
      ],
    });
  }
});


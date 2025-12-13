import { defineNuxtPlugin, useHead } from 'nuxt/app';

const headerCss = `
.fixed-header {
  position: fixed;
  top: 0;
  overflow: hidden;
  width: calc(100% - 2em);
  margin: 1em;
  border-radius: 0.5em;
  z-index: 50;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
}
`;

export default defineNuxtPlugin(() => {
  useHead({
    style: [
      {
        id: 'custom-header-css',
        innerHTML: headerCss,
      },
    ],
  });
});

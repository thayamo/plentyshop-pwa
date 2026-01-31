import { defineNuxtPlugin, useHead } from 'nuxt/app';

const headerCss = `
:root {
  --header-height: 154px;
}

.fixed-header {
  position: sticky;
  top: 1em;
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

import { addPlugin, addComponentsDir, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'uptain',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Add plugin for cookie registration (runs early to add cookies before cookie bar is shown)
    addPlugin(resolver.resolve('./runtime/plugins/00.uptain-cookie-registration'));
    // Add client-side plugin for script loading
    addPlugin(resolver.resolve('./runtime/plugins/uptain.client'));
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
    });
  },
});


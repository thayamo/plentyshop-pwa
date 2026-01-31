import { addPlugin, addComponentsDir, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'uptain',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Add plugin for cookie registration (runs after cookie bar initialization)
    addPlugin(resolver.resolve('./runtime/plugins/02.uptain-cookie-registration'));
    // Add client-side plugin for script loading
    addPlugin(resolver.resolve('./runtime/plugins/uptain.client'));
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
    });
  },
});


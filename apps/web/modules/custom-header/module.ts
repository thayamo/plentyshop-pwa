import { addComponentsDir, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'custom-header',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
    });

    addPlugin(resolver.resolve('./runtime/plugins/headerCss'));

    nuxt.hook('app:resolve', (app) => {
      app.layouts.default = {
        name: 'default',
        file: resolver.resolve('./runtime/layouts/default.vue'),
      };

      app.layouts.auth = {
        name: 'auth',
        file: resolver.resolve('./runtime/layouts/auth.vue'),
      };
    });
  },
});

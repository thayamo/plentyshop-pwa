import { addPlugin, addComponentsDir, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'uptain',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    addPlugin(resolver.resolve('./runtime/plugins/uptain.client'));
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
    });
  },
});


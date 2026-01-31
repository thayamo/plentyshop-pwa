import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'uptain',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);

    addPlugin(resolver.resolve('./runtime/plugins/uptain'));
  },
});


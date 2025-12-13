import { addComponentsDir, createResolver, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  meta: {
    name: 'custom-carousel',
  },
  setup(_, nuxt) {
    const resolver = createResolver(import.meta.url);
    const componentsPath = resolver.resolve('./runtime/components');

    addComponentsDir({
      path: componentsPath,
      pathPrefix: true,
      priority: 20,
      extensions: ['vue'],
    });

    nuxt.hook('components:extend', (components) => {
      const customCarouselPath = resolver.resolve('./runtime/components/blocks/structure/Carousel/Carousel.vue');

      for (let index = components.length - 1; index >= 0; index -= 1) {
        if (components[index]?.pascalName === 'BlocksStructureCarousel') {
          components.splice(index, 1);
        }
      }

      components.push({
        filePath: customCarouselPath,
        pascalName: 'BlocksStructureCarousel',
        kebabName: 'blocks-structure-carousel',
        export: 'default',
        chunkName: 'components/custom-carousel',
        shortPath: customCarouselPath,
      });
    });
  },
});

<template>
  <div class="fixed-header">
    <div
      class="bg-header-600 text-white text-sm py-2 px-2 flex items-center gap-2"
      @mouseenter="isPaused = true"
      @mouseleave="isPaused = false"
      @focusin="isPaused = true"
      @focusout="isPaused = false"
    >
      <UiButton
        class="!text-white hover:!bg-header-400 active:!bg-header-400 !p-0 !min-w-0 !min-h-0"
        variant="tertiary"
        square
        aria-label="Previous message"
        @click="prev"
      >
        <SfIconChevronLeft />
      </UiButton>

      <div class="flex-1 text-center overflow-hidden whitespace-nowrap">
        <Transition name="topbar-fade" mode="out-in">
          <span :key="activeIndex" class="inline-block">{{ slides[activeIndex] }}</span>
        </Transition>
      </div>

      <UiButton
        class="!text-white hover:!bg-header-400 active:!bg-header-400 !p-0 !min-w-0 !min-h-0"
        variant="tertiary"
        square
        aria-label="Next message"
        @click="next"
      >
        <SfIconChevronRight />
      </UiButton>
    </div>
    <UiHeader />
  </div>
</template>

<script setup lang="ts">
import { SfIconChevronLeft, SfIconChevronRight } from '@storefront-ui/vue';
import UiHeader from './UiHeader.vue';

const slides = [
  'Custom header from Nuxt module (override via layout).',
  'Welcome to your PlentyONE Shop.',
  'Fast delivery and secure checkout.',
];

const activeIndex = ref(0);
const isPaused = ref(false);

const next = () => {
  activeIndex.value = (activeIndex.value + 1) % slides.length;
};

const prev = () => {
  activeIndex.value = (activeIndex.value - 1 + slides.length) % slides.length;
};

let intervalId: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (slides.length < 2) return;
  intervalId = setInterval(() => {
    if (!isPaused.value) next();
  }, 4000);
});

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
.topbar-fade-enter-active,
.topbar-fade-leave-active {
  transition: opacity 200ms ease;
}

.topbar-fade-enter-from,
.topbar-fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div>
    <div class="bg-header-600 text-white text-center text-xs py-1 px-2">
      {{ bannerText }}
    </div>
    <UiHeader />
  </div>
</template>

<script setup lang="ts">
import UiHeader from './UiHeader.vue';

const bannerText = 'Custom header from Nuxt module (override via layout).';
</script>

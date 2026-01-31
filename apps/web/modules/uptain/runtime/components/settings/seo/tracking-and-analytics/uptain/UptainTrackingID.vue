<template>
  <div class="py-2">
    <div class="flex justify-between mb-2">
      <UiFormLabel>{{ getEditorTranslation('label') }}</UiFormLabel>
      <SfTooltip :label="getEditorTranslation('tooltip')" :placement="'top'" :show-arrow="true" class="ml-2 z-10">
        <SfIconInfo :size="'sm'" />
      </SfTooltip>
    </div>
    <label>
      <SfInput
        v-model="uptainId"
        type="text"
        data-testid="uptain-tracking-id"
        :placeholder="getEditorTranslation('placeholder')"
      />
    </label>
  </div>
</template>
<script setup lang="ts">
import { SfInput, SfIconInfo, SfTooltip } from '@storefront-ui/vue';

const { updateSetting, getSetting } = useSiteSettings('uptainId');

const uptainId = computed({
  get: () => getSetting(),
  set: (value) => updateSetting(value),
});
</script>

<i18n lang="json">
{
  "en": {
    "label": "Uptain Tracking ID",
    "placeholder": "Enter your Uptain tracking ID",
    "tooltip": "Enter your Uptain tracking ID to enable tracking on your shop. You can find this ID in your Uptain dashboard."
  },
  "de": {
    "label": "Uptain Tracking ID",
    "placeholder": "Geben Sie Ihre Uptain Tracking-ID ein",
    "tooltip": "Geben Sie Ihre Uptain Tracking-ID ein, um das Tracking in Ihrem Shop zu aktivieren. Diese ID finden Sie in Ihrem Uptain-Dashboard."
  }
}
</i18n>


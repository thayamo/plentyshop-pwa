<template>
  <div class="py-2 space-y-4">
    <!-- Uptain Logo -->
    <div class="w-full rounded-lg p-4" style="background-color: #111;">
      <div class="flex justify-center">
        <svg class="logo--dark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140.71 50" style="width: 200px;">
          <path d="M31.06 9.63L22.54 0 14 9.63h5v17.28c0 4.49-1.56 6.45-6.06 6.48s-6-2-6-6.48V10.09C-.65 12.21-.09 19.9.08 26c-.69 13 14.07 17.55 22.46 9.92C28 31.34 25.42 16 26 9.63zm23.57 8.54c-1.58-5.54-6.57-8.44-11.84-8.33-6.94-.15-11.91 3.27-12.09 9.67V50c5.53-1.59 7.41-6.62 6.91-10.93C52 42.44 58.46 31 54.63 18.17zM47 32.23c-2.13 2.47-6 2.07-9.35 1.62v-15c-.49-3.7 8.37-4.22 9.79-.84C49.07 20.45 49.39 30 47 32.23z" fill="#31b9b5"></path>
          <path d="M63.74 35.81c1.95 3.88 6.8 4.27 10.44 3v-3.5c-1.77.78-5.29.87-6.5-.37-2-1.43-.58-18.83-1-21.11h7.48v-3.37H66.7V2.27h-3.79v8.19h-5v3.42h5c.28 3.21-.76 19.29.83 21.93zm35.46-.65c2.06-2.54 1-10.24 1.25-13.34.47-12-11.57-13.72-20.77-10.43V15c6-2 17.63-3 16.93 6.43-5.68-.4-12.64-.82-17.36 3-2.58 2.27-3.13 6.9-1.53 9.88 1.51 3.21 5.16 4.47 8.33 5 4.57.44 10.23 0 13.15-4.15zm-10.43.78c-5.34 0-8.18-1.86-8.16-5.62-.84-5.75 10.45-6.7 16-5.55.1 6.02 1.23 11.3-7.84 11.17zm17.77-25.48h3.79v28.56h-3.79zm-.23-9.75h4.24v4.24h-4.24zM133 14.3c2.76.94 3.76 3.43 3.76 6.05V39h3.79c-.69-5.54 2.14-22.55-2.95-26.35-5-4.48-14.63-2.78-20.4 0V39h3.8V14.92c3.91-1.13 8.36-1.77 12-.62z" fill="#fff"></path>
        </svg>
      </div>
    </div>

    <!-- Uptain ID -->
    <div>
      <div class="flex justify-between mb-2">
        <UiFormLabel>{{ getEditorTranslation('uptainId.label') }}</UiFormLabel>
        <SfTooltip :label="getEditorTranslation('uptainId.tooltip')" :placement="'top'" :show-arrow="true" class="ml-2 z-10">
          <SfIconInfo :size="'sm'" />
        </SfTooltip>
      </div>
      <label>
        <SfInput
          v-model="uptainId"
          type="text"
          data-testid="uptain-tracking-id"
          :placeholder="getEditorTranslation('uptainId.placeholder')"
        />
      </label>
    </div>

    <!-- Block cookies initially -->
    <div class="flex justify-between mb-2">
      <UiFormLabel class="mb-1">{{ getEditorTranslation('blockCookies.label') }}</UiFormLabel>
      <SfSwitch
        v-model="blockCookiesInitially"
        class="checked:bg-editor-button checked:before:hover:bg-editor-button checked:border-gray-500 checked:hover:border:bg-gray-700 hover:border-gray-700 hover:before:bg-gray-700 checked:hover:bg-gray-300 checked:hover:border-gray-400"
      />
    </div>

    <!-- Transmit personal data for newsletter subscribers -->
    <div class="flex justify-between mb-2">
      <UiFormLabel class="mb-1">{{ getEditorTranslation('transmitNewsletterData.label') }}</UiFormLabel>
      <SfSwitch
        v-model="transmitNewsletterData"
        class="checked:bg-editor-button checked:before:hover:bg-editor-button checked:border-gray-500 checked:hover:border:bg-gray-700 hover:border-gray-700 hover:before:bg-gray-700 checked:hover:bg-gray-300 checked:hover:border-gray-400"
      />
    </div>

    <!-- Transmit personal data for existing customers -->
    <div class="flex justify-between mb-2">
      <UiFormLabel class="mb-1">{{ getEditorTranslation('transmitCustomerData.label') }}</UiFormLabel>
      <SfSwitch
        v-model="transmitCustomerData"
        class="checked:bg-editor-button checked:before:hover:bg-editor-button checked:border-gray-500 checked:hover:border:bg-gray-700 hover:border-gray-700 hover:before:bg-gray-700 checked:hover:bg-gray-300 checked:hover:border-gray-400"
      />
    </div>

    <!-- Transmit revenue -->
    <div class="flex justify-between mb-2">
      <UiFormLabel class="mb-1">{{ getEditorTranslation('transmitRevenue.label') }}</UiFormLabel>
      <SfSwitch
        v-model="transmitRevenue"
        class="checked:bg-editor-button checked:before:hover:bg-editor-button checked:border-gray-500 checked:hover:border:bg-gray-700 hover:border-gray-700 hover:before:bg-gray-700 checked:hover:bg-gray-300 checked:hover:border-gray-400"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { SfInput, SfIconInfo, SfTooltip, SfSwitch } from '@storefront-ui/vue';

const { updateSetting, getSetting } = useSiteSettings('uptainId');
const { updateSetting: updateBlockCookies, getSetting: getBlockCookies } = useSiteSettings('uptainBlockCookiesInitially');
const { updateSetting: updateNewsletterData, getSetting: getNewsletterData } = useSiteSettings('uptainTransmitNewsletterData');
const { updateSetting: updateCustomerData, getSetting: getCustomerData } = useSiteSettings('uptainTransmitCustomerData');
const { updateSetting: updateRevenue, getSetting: getRevenue } = useSiteSettings('uptainTransmitRevenue');

const uptainId = computed({
  get: () => getSetting(),
  set: (value) => updateSetting(value),
});

const blockCookiesInitially = computed({
  get: () => getBlockCookies() === 'true',
  set: (value) => updateBlockCookies(value.toString()),
});

const transmitNewsletterData = computed({
  get: () => getNewsletterData() === 'true',
  set: (value) => updateNewsletterData(value.toString()),
});

const transmitCustomerData = computed({
  get: () => getCustomerData() === 'true',
  set: (value) => updateCustomerData(value.toString()),
});

const transmitRevenue = computed({
  get: () => getRevenue() === 'true',
  set: (value) => updateRevenue(value.toString()),
});
</script>

<i18n lang="json">
{
  "en": {
    "uptainId": {
      "label": "Uptain Tracking ID",
      "placeholder": "Enter your Uptain tracking ID",
      "tooltip": "Enter your Uptain tracking ID to enable tracking on your shop. You can find this ID in your Uptain dashboard."
    },
    "blockCookies": {
      "label": "Initially block cookies and wait for visitor's cookie acceptance"
    },
    "transmitNewsletterData": {
      "label": "Transmit personal data of newsletter subscribers while being logged in"
    },
    "transmitCustomerData": {
      "label": "Transmit personal data of existing customers (minimum of one successful order) while being logged in"
    },
    "transmitRevenue": {
      "label": "Transmit the total sum of all net orders for a certain customer while being logged in"
    }
  },
  "de": {
    "uptainId": {
      "label": "Uptain Tracking ID",
      "placeholder": "Geben Sie Ihre Uptain Tracking-ID ein",
      "tooltip": "Geben Sie Ihre Uptain Tracking-ID ein, um das Tracking in Ihrem Shop zu aktivieren. Diese ID finden Sie in Ihrem Uptain-Dashboard."
    },
    "blockCookies": {
      "label": "Cookies zunächst blockieren und auf die Cookie-Zustimmung des Besuchers warten"
    },
    "transmitNewsletterData": {
      "label": "Personenbezogene Daten von Newsletter-Abonnenten während der Anmeldung übertragen"
    },
    "transmitCustomerData": {
      "label": "Personenbezogene Daten von Bestandskunden (mindestens eine erfolgreiche Bestellung) während der Anmeldung übertragen"
    },
    "transmitRevenue": {
      "label": "Gesamtsumme aller Netto-Bestellungen für einen bestimmten Kunden während der Anmeldung übertragen"
    }
  }
}
</i18n>


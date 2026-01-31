<template>
  <div class="py-2 space-y-4">
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


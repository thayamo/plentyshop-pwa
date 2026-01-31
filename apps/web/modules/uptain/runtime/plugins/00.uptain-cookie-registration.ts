import { nextTick } from 'vue';

/**
 * Plugin to register Uptain cookies in the cookie consent manager
 * Uses useRegisterCookie composable from @plentymarkets/shop-core to dynamically add cookies
 * See: https://pwa-docs.plentyone.com/guide/modules/shop-core/cookie-consent
 * 
 * This plugin runs early (00. prefix) to ensure cookies are registered before the cookie bar is shown
 */
export default defineNuxtPlugin({
  name: 'uptain-cookie-registration',
  enforce: 'pre', // Run before other plugins
  setup() {
    if (process.server) return;

    const { getSetting: getUptainEnabled } = useSiteSettings('uptainEnabled');
    const { getSetting: getUptainCookieGroup } = useSiteSettings('uptainCookieGroup');
    const { getSetting: getRegisterCookieAsOptOut } = useSiteSettings('uptainRegisterCookieAsOptOut');

    // Helper function to check if a setting value is enabled (supports both 'true'/'1' and 'false'/'0')
    const isSettingEnabled = (value: string | undefined): boolean => {
      if (!value) return false;
      return value === 'true' || value === '1';
    };

    // Check if Uptain is enabled
    const isUptainEnabled = isSettingEnabled(getUptainEnabled());
    if (!isUptainEnabled) return;

    const configuredCookieGroup = getUptainCookieGroup();
    if (!configuredCookieGroup) return;

    const registerAsOptOut = isSettingEnabled(getRegisterCookieAsOptOut());

    // Use nextTick to ensure DOM and composables are ready
    nextTick(() => {
      try {
        console.log('[Uptain] Registering cookie in group:', configuredCookieGroup);
        
        // Use useRegisterCookie composable to register the cookie
        // This is the recommended way according to the documentation
        // See: https://pwa-docs.plentyone.com/guide/modules/shop-core/cookie-consent
        const { add } = useRegisterCookie();

        // Register the cookie with the configured cookie group as second parameter
        // According to TypeScript, add() expects 2 arguments: cookie object and group name
        add(
          {
            name: 'CookieBar.uptain.cookies.uptain.name',
            Provider: 'CookieBar.uptain.cookies.uptain.provider',
            Status: registerAsOptOut ? 'CookieBar.uptain.cookies.uptain.status.optOut' : 'CookieBar.uptain.cookies.uptain.status',
            PrivacyPolicy: '/PrivacyPolicy',
            Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
            accepted: !registerAsOptOut, // If opt-out, start as not accepted
            // Note: Script loading is handled by uptain.client.ts plugin to support dynamic data attributes
          },
          configuredCookieGroup, // Second parameter: cookie group name
        );
        
        console.log('[Uptain] Cookie registered successfully');
      } catch (error) {
        console.error('[Uptain] Error registering cookie:', error);
      }
    });
  },
});


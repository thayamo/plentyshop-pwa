import { nextTick } from 'vue';

/**
 * Plugin to register Uptain cookies in the cookie consent manager
 * Uses useRegisterCookie composable from @plentymarkets/shop-core to dynamically add cookies
 * See: https://pwa-docs.plentyone.com/guide/modules/shop-core/cookie-consent
 */
export default defineNuxtPlugin(() => {
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

  // Use useRegisterCookie composable to register the cookie
  // This is the recommended way according to the documentation
  // See: https://pwa-docs.plentyone.com/guide/modules/shop-core/cookie-consent
  const { add } = useRegisterCookie();

  // Register the cookie
  add({
    name: 'CookieBar.uptain.cookies.uptain.name',
    Provider: 'CookieBar.uptain.cookies.uptain.provider',
    Status: registerAsOptOut ? 'CookieBar.uptain.cookies.uptain.status.optOut' : 'CookieBar.uptain.cookies.uptain.status',
    PrivacyPolicy: '/PrivacyPolicy',
    Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
    accepted: !registerAsOptOut, // If opt-out, start as not accepted
    // Note: Script loading is handled by uptain.client.ts plugin to support dynamic data attributes
  });

  // After registering, manually add the cookie to the configured cookie group
  // This ensures it appears in the correct group in the cookie consent manager
  const { cookieGroups } = useCookieBar();
  
  // Use nextTick to ensure cookie groups are initialized
  nextTick(() => {
    if (cookieGroups.value) {
      const targetGroup = cookieGroups.value.find((group) => group.name === configuredCookieGroup);
      const registeredCookie = cookieGroups.value
        .flatMap((group) => group.cookies || [])
        .find((cookie) => cookie.name === 'CookieBar.uptain.cookies.uptain.name');
      
      if (targetGroup && registeredCookie) {
        // Check if cookie already exists in the target group
        const cookieExists = targetGroup.cookies?.some((cookie) => cookie.name === registeredCookie.name);
        if (!cookieExists) {
          if (!targetGroup.cookies) {
            targetGroup.cookies = [];
          }
          targetGroup.cookies.push(registeredCookie);
        }
      }
    }
  });
});


import type { Cookie } from '@plentymarkets/shop-core';

/**
 * Plugin to register Uptain cookies in the cookie consent manager
 * This plugin runs after the cookie bar is initialized and adds Uptain cookies
 * to the configured cookie group dynamically.
 */
export default defineNuxtPlugin(() => {
  // Only run on client side where cookieGroups are available
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

  // Get cookie groups and add Uptain cookie to the configured group
  const { cookieGroups } = useCookieBar();

  if (cookieGroups.value) {
    const targetGroup = cookieGroups.value.find((group) => group.name === configuredCookieGroup);
    
    if (targetGroup) {
      const uptainCookie: Cookie = {
        name: 'CookieBar.uptain.cookies.uptain.name',
        Provider: 'CookieBar.uptain.cookies.uptain.provider',
        Status: registerAsOptOut ? 'CookieBar.uptain.cookies.uptain.status.optOut' : 'CookieBar.uptain.cookies.uptain.status',
        PrivacyPolicy: '/PrivacyPolicy',
        Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
        accepted: !registerAsOptOut, // If opt-out, start as not accepted
      };

      // Check if cookie already exists to avoid duplicates
      const cookieExists = targetGroup.cookies?.some((cookie) => cookie.name === uptainCookie.name);
      if (!cookieExists) {
        if (!targetGroup.cookies) {
          targetGroup.cookies = [];
        }
        targetGroup.cookies.push(uptainCookie);
      }
    }
  }
});


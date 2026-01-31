/**
 * Server-side plugin to register Uptain cookies in the cookie consent manager
 * This plugin runs before the cookie bar is initialized and adds Uptain cookies
 * to the configured cookie group dynamically.
 */
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const { getSetting: getRegisterCookieAsOptOut } = useSiteSettings('uptainRegisterCookieAsOptOut');

  // Helper function to check if a setting value is enabled
  // Handles string/number/boolean values from runtime config or site settings.
  const isSettingEnabled = (value: string | number | boolean | undefined | null): boolean => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0 || value == null) return false;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return false;
  };

  const configuredCookieGroup =
    (runtimeConfig.public.uptainCookieGroup as string | undefined) || 'CookieBar.marketing.label';

  if (!configuredCookieGroup) return;

  const registerAsOptOut = isSettingEnabled(
    getRegisterCookieAsOptOut() ?? runtimeConfig.public.uptainRegisterCookieAsOptOut,
  );

  const { add } = useRegisterCookie();
  add(
    {
      name: 'CookieBar.uptain.cookies.uptain.name',
      Provider: 'CookieBar.uptain.cookies.uptain.provider',
      Status: registerAsOptOut ? 'CookieBar.uptain.cookies.uptain.status.optOut' : 'CookieBar.uptain.cookies.uptain.status',
      PrivacyPolicy: '/PrivacyPolicy',
      Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
      accepted: !registerAsOptOut, // If opt-out, start as not accepted
    },
    configuredCookieGroup,
  );
});


/**
 * Server-side plugin to register Uptain cookies in the cookie consent manager
 * This plugin runs before the cookie bar is initialized and adds Uptain cookies
 * to the configured cookie group dynamically. Opt-in only (no opt-out mode).
 */
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();

  const configuredCookieGroup =
    (runtimeConfig.public.uptainCookieGroup as string | undefined) || 'CookieBar.marketing.label';

  if (!configuredCookieGroup) return;

  const { add } = useRegisterCookie();
  add(
    {
      name: 'CookieBar.uptain.cookies.uptain.name',
      Provider: 'CookieBar.uptain.cookies.uptain.provider',
      Status: 'CookieBar.uptain.cookies.uptain.status',
      PrivacyPolicy: '/PrivacyPolicy',
      Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
      accepted: false,
    },
    configuredCookieGroup,
  );
});


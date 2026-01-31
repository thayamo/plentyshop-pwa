import { defineNuxtPlugin, useRoute } from 'nuxt/app';
import { onMounted, watch } from 'vue';
import { useUptainData } from '../composables/useUptainData';
import { useProduct } from '~/composables/useProduct/useProduct';
import type { Cookie, CookieGroup } from '@plentymarkets/shop-core';

export default defineNuxtPlugin(() => {
  const { getAllData, shouldBlockCookies, getUptainId } = useUptainData();
  const route = useRoute();
  const { getSetting: getUptainEnabled } = useSiteSettings('uptainEnabled');
  const { getSetting: getUptainCookieGroup } = useSiteSettings('uptainCookieGroup');
  
  // Get cookie groups - useCookieBar is auto-imported
  const { cookieGroups } = useCookieBar();

  // Check if Uptain is enabled
  const isUptainEnabled = getUptainEnabled() === 'true';
  if (!isUptainEnabled) return;

  const uptainId = getUptainId();
  if (!uptainId || uptainId === 'XXXXXXXXXXXXXXXX') return;

  const loadUptainScript = () => {
    // Get product if on product page
    let product = null;
    if (process.client && route.path.includes('/product/')) {
      const slug = route.params.slug as string;
      if (slug) {
        const { data: productData } = useProduct(slug);
        product = productData.value;
      }
    }
    
    const data = getAllData(product);
    if (!data) return;

    // Remove existing script if any
    const existingScript = document.getElementById('__up_data_qp');
    if (existingScript) {
      existingScript.remove();
    }

    // Create script element with all data attributes
    const script = document.createElement('script');
    script.id = '__up_data_qp';
    script.type = 'text/javascript';
    script.src = `https://app.uptain.de/js/uptain.js?x=${uptainId}`;
    script.async = true;

    // Add all data attributes
    Object.entries(data).forEach(([key, value]) => {
      if (value && value !== '') {
        script.setAttribute(`data-${key}`, String(value));
      }
    });

    // Append to body
    document.body.appendChild(script);

    // Initialize event bus if not exists
    if (typeof window !== 'undefined' && !window._upEventBus) {
      window._upEventBus = {
        publish: (event: string) => {
          if (event === 'uptain.readData') {
            // Reload script to read updated data
            const currentScript = document.getElementById('__up_data_qp');
            if (currentScript) {
              const newScript = currentScript.cloneNode(true) as HTMLScriptElement;
              currentScript.remove();
              document.body.appendChild(newScript);
            }
          }
        },
      };
    }
  };

  const checkCookieConsent = (): boolean => {
    if (!shouldBlockCookies()) return true;

    // Get the configured cookie group from settings
    const configuredCookieGroupValue = getUptainCookieGroup();
    if (!configuredCookieGroupValue) {
      // If no cookie group is configured, allow by default (backward compatibility)
      return true;
    }

    // Find the cookie group that matches the configured value
    // The value is a translation key like 'CookieBar.functional.label'
    const uptainCookieGroup = cookieGroups.value?.find((group: CookieGroup) => {
      return group.name === configuredCookieGroupValue;
    });

    return uptainCookieGroup?.accepted ?? false;
  };

  // Load script on mount if cookies are not blocked or consent is given
  if (process.client) {
    onMounted(() => {
      // Watch for Uptain enabled/disabled changes
      watch(
        () => getUptainEnabled(),
        (enabled) => {
          if (enabled === 'true') {
            if (!shouldBlockCookies() || checkCookieConsent()) {
              loadUptainScript();
            }
          } else {
            // Remove script if disabled
            const existingScript = document.getElementById('__up_data_qp');
            if (existingScript) {
              existingScript.remove();
            }
          }
        },
        { immediate: true },
      );

      if (!shouldBlockCookies() || checkCookieConsent()) {
        loadUptainScript();
      }

      // Watch for cookie consent changes
      if (shouldBlockCookies()) {
        watch(
          () => cookieGroups.value,
          () => {
            if (getUptainEnabled() === 'true' && checkCookieConsent()) {
              loadUptainScript();
            }
          },
          { deep: true },
        );
      }

      // Watch for route changes to update data
      watch(
        () => route.path,
        () => {
          if (getUptainEnabled() !== 'true') return;
          if (!shouldBlockCookies() || checkCookieConsent()) {
            // Get product if on product page
            let product = null;
            if (route.path.includes('/product/')) {
              const slug = route.params.slug as string;
              if (slug) {
                const { data: productData } = useProduct(slug);
                product = productData.value;
              }
            }
            
            // Update script with new data
            const currentScript = document.getElementById('__up_data_qp');
            if (currentScript) {
              const data = getAllData(product);
              if (data) {
                Object.entries(data).forEach(([key, value]) => {
                  if (value && value !== '') {
                    currentScript.setAttribute(`data-${key}`, String(value));
                  } else {
                    currentScript.removeAttribute(`data-${key}`);
                  }
                });
                // Trigger data read
                if (window._upEventBus) {
                  window._upEventBus.publish('uptain.readData');
                }
              }
            } else {
              loadUptainScript();
            }
          }
        },
      );
    });
  }
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    _upEventBus?: {
      publish: (event: string) => void;
    };
  }
}


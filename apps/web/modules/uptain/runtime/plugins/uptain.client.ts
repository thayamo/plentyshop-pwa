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

  // Helper function to check if a setting value is enabled (supports both 'true'/'1' and 'false'/'0')
  const isSettingEnabled = (value: string | undefined): boolean => {
    if (!value) return false;
    return value === 'true' || value === '1';
  };

  // Check if Uptain is enabled
  const isUptainEnabled = isSettingEnabled(getUptainEnabled());
  if (!isUptainEnabled) return;

  const uptainId = getUptainId();
  if (!uptainId || uptainId === 'XXXXXXXXXXXXXXXX') return;

  const loadUptainScript = async () => {
    console.log('[Uptain] loadUptainScript called');
    
    // Get product if on product page
    let product = null;
    if (process.client && route.path.includes('/product/')) {
      const slug = route.params.slug as string;
      if (slug) {
        const { data: productData } = useProduct(slug);
        product = productData.value;
      }
    }
    
    const data = await getAllData(product);
    console.log('[Uptain] getAllData returned:', data ? 'data exists' : 'null');
    if (!data) {
      console.warn('[Uptain] No data returned from getAllData, script not loaded');
      return;
    }

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
    console.log('[Uptain] Script appended to body:', script.src);

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
        async (enabled) => {
          if (isSettingEnabled(enabled)) {
            const shouldBlock = shouldBlockCookies();
            const hasConsent = checkCookieConsent();
            
            // Debug logging
            console.log('[Uptain] Enabled:', enabled, 'Should block:', shouldBlock, 'Has consent:', hasConsent);
            
            if (!shouldBlock || hasConsent) {
              await loadUptainScript();
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

      // Initial load check
      const shouldBlock = shouldBlockCookies();
      const hasConsent = checkCookieConsent();
      
      // Debug logging
      console.log('[Uptain] Initial load - Should block:', shouldBlock, 'Has consent:', hasConsent);
      
      if (!shouldBlock || hasConsent) {
        loadUptainScript();
      }

      // Watch for cookie consent changes
      if (shouldBlockCookies()) {
        watch(
          () => cookieGroups.value,
          () => {
            if (isSettingEnabled(getUptainEnabled()) && checkCookieConsent()) {
              loadUptainScript();
            }
          },
          { deep: true },
        );
      }

      // Watch for route changes to update data
      watch(
        () => route.path,
        async () => {
          if (!isSettingEnabled(getUptainEnabled())) return;
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
              const data = await getAllData(product);
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
              await loadUptainScript();
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


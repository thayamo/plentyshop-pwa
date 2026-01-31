import { defineNuxtPlugin, useRoute } from 'nuxt/app';
import { onMounted, watch } from 'vue';
import { useUptainData } from '../composables/useUptainData';
import { useCookieBar } from '@plentymarkets/shop-core';
import { useProduct } from '~/composables/useProduct/useProduct';

export default defineNuxtPlugin(() => {
  const { getAllData, shouldBlockCookies, getUptainId } = useUptainData();
  const { cookieGroups } = useCookieBar();
  const route = useRoute();

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

    // Check if uptain cookie group is accepted
    // Assuming uptain would be in a functional or analytics cookie group
    // This needs to be configured in cookie.config.ts
    const uptainCookieGroup = cookieGroups.value?.find((group) =>
      group.cookies?.some((cookie) => cookie.name?.includes('uptain') || cookie.name?.includes('Uptain')),
    );

    return uptainCookieGroup?.accepted ?? false;
  };

  // Load script on mount if cookies are not blocked or consent is given
  if (process.client) {
    onMounted(() => {
      if (!shouldBlockCookies() || checkCookieConsent()) {
        loadUptainScript();
      }

      // Watch for cookie consent changes
      if (shouldBlockCookies()) {
        watch(
          () => cookieGroups.value,
          () => {
            if (checkCookieConsent()) {
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


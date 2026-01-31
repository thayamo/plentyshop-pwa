import { defineNuxtPlugin, useRoute } from 'nuxt/app';
import { nextTick, watch } from 'vue';
import { useUptainData } from '../composables/useUptainData';
import { useProduct } from '~/composables/useProduct/useProduct';
import type { Cookie, CookieGroup } from '@plentymarkets/shop-core';

export default defineNuxtPlugin(() => {
  const { getAllData, shouldBlockCookies, getUptainId } = useUptainData();
  const route = useRoute();
  const { getSetting: getUptainEnabled } = useSiteSettings('uptainEnabled');
  const { getSetting: getRegisterCookieAsOptOut } = useSiteSettings('uptainRegisterCookieAsOptOut');
  const { getSetting: getDebugMode } = useSiteSettings('uptainDebugMode');
  const runtimeConfig = useRuntimeConfig();
  
  // Get cookie groups - useCookieBar is auto-imported
  const { cookieGroups } = useCookieBar();

  // Helper function to check if a setting value is enabled
  // Handles string/number/boolean values from runtime config or site settings.
  const isSettingEnabled = (value: string | number | boolean | undefined | null): boolean => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0 || value == null) return false;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return false;
  };

  const getValidUptainId = (): string => {
    const id = getUptainId();
    if (!id || id === 'XXXXXXXXXXXXXXXX') return '';
    return id;
  };

  const removeUptainScript = () => {
    const existingScript = document.getElementById('__up_data_qp');
    if (existingScript) {
      existingScript.remove();
    }
  };

  const logScriptData = (script: HTMLElement | null) => {
    if (typeof window === 'undefined' || !window.__UPTAIN_DEBUG__) return;
    if (!script) return;

    const attributes = script.getAttributeNames().filter((name) => name.startsWith('data-'));
    if (attributes.length === 0) {
      return;
    }

    const extraTables: Array<{ title: string; rows: Array<Record<string, unknown>> }> = [];

    const rows = attributes.map((attr) => {
      const value = script.getAttribute(attr) ?? '';
      const key = attr.replace(/^data-/, '');

      if (key === 'category-products' && value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            const items = Object.entries(parsed).map(([id, data]) => ({
              id,
              ...(data as Record<string, unknown>),
            }));
            extraTables.push({ title: 'category-products', rows: items });
            return { key, value: `[${items.length} items]` };
          }
        } catch {
          // ignore parse errors
        }
      }

      return { key, value };
    });

    console.groupCollapsed(
      '%cUptain Debug%c data-* attributes',
      'background:#111;color:#31b9b5;padding:2px 6px;border-radius:4px;',
      'color:#9ca3af;',
    );
    console.table(rows);
    extraTables.forEach(({ title, rows: tableRows }) => {
      console.groupCollapsed(`%c${title}`, 'background:#111;color:#fbbf24;padding:2px 6px;border-radius:4px;');
      console.table(tableRows);
      console.groupEnd();
    });
    console.groupEnd();
  };

  const setDebugFlag = () => {
    if (typeof window === 'undefined') return;
    window.__UPTAIN_DEBUG__ = isSettingEnabled(getDebugMode());
    if (window.__UPTAIN_DEBUG__) {
      logScriptData(document.getElementById('__up_data_qp'));
    }
  };

  const loadUptainScript = async () => {
    console.log('[Uptain] loadUptainScript called');
    const uptainId = getValidUptainId();
    if (!uptainId) {
      console.warn('[Uptain] No valid Uptain ID set, script not loaded');
      removeUptainScript();
      return;
    }
    
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
    removeUptainScript();

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
    logScriptData(script);

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

    const groupName = (runtimeConfig.public.uptainCookieGroup as string | undefined) || 'CookieBar.marketing.label';
    const rawConsent = consentCookie.value ?? null;
    const storedConsent = getStoredUptainConsent(groupName, rawConsent);
    const registerAsOptOut = isSettingEnabled(getRegisterCookieAsOptOut());

    if (storedConsent !== null) {
      return storedConsent;
    }

    // If a consent cookie exists (user clicked a button), fall back to group acceptance.
    if (rawConsent) {
      const group = cookieGroups.value?.find((cookieGroup: CookieGroup) => cookieGroup.name === groupName);
      return group?.accepted ?? false;
    }

    // Opt-in: no consent cookie yet -> false. Opt-out: allow by default.
    return registerAsOptOut ? true : false;
  };

  const consentCookie = useCookie<string>('consent-cookie');
  let lastConsentSnapshot: string | null = consentCookie.value ?? null;
  let isUpdatingConsentCookie = false;
  let lastUptainSelection: boolean | null = null;

  const getStoredUptainConsent = (groupName: string, rawConsent: string | null): boolean | null => {
    if (!rawConsent) return null;
    try {
      const parsed = JSON.parse(rawConsent);
      const stored = parsed?.groups?.[groupName]?.['CookieBar.uptain.cookies.uptain.name'];
      return typeof stored === 'boolean' ? stored : null;
    } catch {
      return null;
    }
  };

  const persistUptainConsent = (groupName: string, accepted: boolean) => {
    const rawConsent = consentCookie.value;
    if (!rawConsent) return;
    try {
      const parsed = JSON.parse(rawConsent);
      const groups = parsed?.groups ?? {};
      const group = groups[groupName] ?? {};

      if (group['CookieBar.uptain.cookies.uptain.name'] === accepted) {
        return;
      }

      group['CookieBar.uptain.cookies.uptain.name'] = accepted;
      groups[groupName] = group;
      parsed.groups = groups;

      const nextValue = JSON.stringify(parsed);
      if (nextValue !== rawConsent) {
        isUpdatingConsentCookie = true;
        consentCookie.value = nextValue;
        lastConsentSnapshot = nextValue;
        nextTick(() => {
          isUpdatingConsentCookie = false;
        });
      }
    } catch {
      // ignore malformed consent cookie
    }
  };

  const captureUptainSelection = () => {
    const groups = cookieGroups.value;
    if (!groups) return;
    const uptainCookie = groups
      .flatMap((group) => group.cookies || [])
      .find((cookie) => cookie.name === 'CookieBar.uptain.cookies.uptain.name');
    if (typeof uptainCookie?.accepted === 'boolean') {
      lastUptainSelection = uptainCookie.accepted;
    }
  };

  const syncCookieOptOutState = () => {
    const registerAsOptOut = isSettingEnabled(getRegisterCookieAsOptOut());
    const groups = cookieGroups.value;
    if (!groups) return;

    const groupName = (runtimeConfig.public.uptainCookieGroup as string | undefined) || 'CookieBar.marketing.label';
    const rawConsent = consentCookie.value ?? null;
    const hasConsentChanged = rawConsent !== lastConsentSnapshot;
    const storedConsent = getStoredUptainConsent(groupName, rawConsent);

    const uptainCookie = groups
      .flatMap((group) => group.cookies || [])
      .find((cookie) => cookie.name === 'CookieBar.uptain.cookies.uptain.name');

    if (!uptainCookie) return;

    const desiredStatus = registerAsOptOut
      ? 'CookieBar.uptain.cookies.uptain.status.optOut'
      : 'CookieBar.uptain.cookies.uptain.status';
    const desiredAccepted =
      storedConsent !== null ? storedConsent : registerAsOptOut ? true : false;

    if (uptainCookie.Status !== desiredStatus) {
      uptainCookie.Status = desiredStatus;
    }
    if (storedConsent !== null && uptainCookie.accepted !== desiredAccepted) {
      uptainCookie.accepted = desiredAccepted;
    }

    const uptainGroup = groups.find((group) =>
      (group.cookies || []).some((cookie) => cookie.name === uptainCookie.name),
    );
    if (uptainGroup && storedConsent !== null && hasConsentChanged) {
      uptainGroup.accepted = (uptainGroup.cookies || []).some((cookie) => cookie.accepted);
    }

    // If consent cookie changed but Uptain is missing, persist the current selection
    if (hasConsentChanged && storedConsent === null) {
      const selection = lastUptainSelection ?? !!uptainCookie.accepted;
      persistUptainConsent(groupName, selection);
    }

    if (hasConsentChanged && !isUpdatingConsentCookie) {
      lastConsentSnapshot = rawConsent;
    }
  };

  // Load script on client and keep it in sync with settings/route
  if (process.client) {
    const syncUptainScript = async () => {
      const enabled = isSettingEnabled(getUptainEnabled());
      const uptainId = getValidUptainId();
      const shouldBlock = shouldBlockCookies();
      const hasConsent = checkCookieConsent();

      // Debug logging
      console.log('[Uptain] Sync - Enabled:', enabled, 'ID set:', !!uptainId, 'Should block:', shouldBlock, 'Has consent:', hasConsent);

      if (enabled && uptainId && (!shouldBlock || hasConsent)) {
        await loadUptainScript();
      } else {
        removeUptainScript();
      }
    };

    const scheduleSync = () => {
      void nextTick().then(() => syncUptainScript());
    };

    // Watch for Uptain enabled/disabled, ID or cookie group changes
    watch(
      [() => getUptainEnabled(), () => getUptainId(), () => shouldBlockCookies(), () => getRegisterCookieAsOptOut()],
      () => {
        scheduleSync();
        syncCookieOptOutState();
      },
      { immediate: true },
    );

    watch(
      () => getDebugMode(),
      () => {
        setDebugFlag();
      },
      { immediate: true },
    );

    // Watch for cookie consent changes
    watch(
      () => cookieGroups.value,
      () => {
        captureUptainSelection();
        scheduleSync();
        syncCookieOptOutState();
      },
      { deep: true },
    );

    // Watch for consent cookie changes (after user confirms selection)
    watch(
      () => consentCookie.value,
      () => {
        if (isUpdatingConsentCookie) return;
        syncCookieOptOutState();
      },
    );

    // Watch for route changes to update data
    watch(
      () => route.path,
      async () => {
        const enabled = isSettingEnabled(getUptainEnabled());
        const uptainId = getValidUptainId();
        if (!enabled || !uptainId) {
          removeUptainScript();
          return;
        }
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
              logScriptData(currentScript);
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
  }
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    _upEventBus?: {
      publish: (event: string) => void;
    };
    __UPTAIN_DEBUG__?: boolean;
  }
}


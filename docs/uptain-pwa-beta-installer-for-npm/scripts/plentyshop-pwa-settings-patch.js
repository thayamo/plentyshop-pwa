/**
 * Postinstall: Richtet die komplette Uptain-Integration in der Plentyshop-PWA ein.
 * - Patcht Settings-Discovery (customerWorkspaceRoot, settingsOverrides)
 * - Legt lokale UptainSettings.vue an (Auto-Imports)
 * - Legt Provide-Plugin für Editor-Composables an
 * - Patcht cookie.config + i18n (Uptain im Consent Manager / Marketing-Gruppe)
 * - Patcht nuxt.config (noExternal, appManifest)
 * Idempotent und mehrfach ausführbar.
 *
 * @see https://github.com/plentymarkets/plentyshop-pwa
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');

function findHostUtilsDir() {
  const hostRoot = resolve(packageRoot, '..', '..');
  const pkgPath = join(hostRoot, 'package.json');
  if (!existsSync(pkgPath)) return null;
  let name = '';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    name = pkg.name || '';
  } catch {
    return null;
  }
  const isPlentyshop = /plentyshop-pwa|plentyone/i.test(name);
  const utilsMonorepo = join(hostRoot, 'apps', 'web', 'app', 'utils');
  const utilsFlat = join(hostRoot, 'app', 'utils');
  if (isPlentyshop && existsSync(utilsMonorepo)) return utilsMonorepo;
  if (isPlentyshop && existsSync(utilsFlat)) return utilsFlat;
  return null;
}

/** Host-App-Verzeichnis (apps/web/app oder app). */
function getAppDir(utilsDir) {
  const isMonorepo = utilsDir.includes(join('apps', 'web'));
  const hostRoot = isMonorepo ? resolve(utilsDir, '..', '..', '..', '..') : resolve(utilsDir, '..', '..');
  return isMonorepo ? join(hostRoot, 'apps', 'web', 'app') : join(hostRoot, 'app');
}

// --- Settings-Groups: customerWorkspaceRoot (bestehend) ---
const SNIPPET_GROUPS = {
  before: `const customer = import.meta.glob('/node_modules/*/runtime/components/settings/**/*.vue', {
  import: 'default',
}) as Record<string, Loader>;

const nuxtModules`,
  after: `const customer = import.meta.glob('/node_modules/*/runtime/components/settings/**/*.vue', {
  import: 'default',
}) as Record<string, Loader>;

const customerWorkspaceRoot = import.meta.glob('../../../../node_modules/*/runtime/components/settings/**/*.vue', {
  import: 'default',
}) as Record<string, Loader>;

const nuxtModules`,
};

const SNIPPET_GROUPS_MERGE = {
  before: `Object.entries(customer).forEach(([path, loader]) => (modules[normalize(path)] = loader));
Object.entries(nuxtModules)`,
  after: `Object.entries(customer).forEach(([path, loader]) => (modules[normalize(path)] = loader));
Object.entries(customerWorkspaceRoot).forEach(([path, loader]) => (modules[normalize(path)] = loader));
Object.entries(nuxtModules)`,
};

// --- Settings-Groups: settingsOverrides (lokale Uptain-Komponente) ---
const SETTINGS_OVERRIDES_DECL = {
  before: `const core = import.meta.glob('@/components/**/settings/**/*.vue', { import: 'default' }) as Record<string, Loader>;

const stripPrefix`,
  after: `const core = import.meta.glob('@/components/**/settings/**/*.vue', { import: 'default' }) as Record<string, Loader>;

/** Lokale Overrides (z. B. UptainSettings) – überschreiben node_modules. */
const settingsOverrides = import.meta.glob('@/components/settings/seo/tracking-and-analytics/uptain/*.vue', {
  import: 'default',
}) as Record<string, Loader>;

const stripPrefix`,
};

const SETTINGS_OVERRIDES_MERGE = {
  before: `Object.entries(customerWorkspaceRoot).forEach(([path, loader]) => (modules[normalize(path)] = loader));

export const getSettingsGroups`,
  after: `Object.entries(customerWorkspaceRoot).forEach(([path, loader]) => (modules[normalize(path)] = loader));
Object.entries(settingsOverrides).forEach(([path, loader]) => (modules[normalize(path)] = loader));

export const getSettingsGroups`,
};

const SNIPPET_TRANSLATIONS = {
  before: `const localeFilesCustomer = import.meta.glob('/node_modules/*/runtime/components/settings/**/lang.json', {
  eager: true,
  import: 'default',
}) as Messages;
const localeFilesNuxtModules`,
  after: `const localeFilesCustomer = import.meta.glob('/node_modules/*/runtime/components/settings/**/lang.json', {
  eager: true,
  import: 'default',
}) as Messages;
const localeFilesCustomerWorkspaceRoot = import.meta.glob('../../../../node_modules/*/runtime/components/settings/**/lang.json', {
  eager: true,
  import: 'default',
}) as Messages;
const localeFilesNuxtModules`,
};

const SNIPPET_TRANSLATIONS_MERGE = {
  before: `Object.entries(localeFilesCustomer).forEach(([path, loader]) => (localeFiles[normalize(path)] = loader));
Object.entries(localeFilesNuxtModules)`,
  after: `Object.entries(localeFilesCustomer).forEach(([path, loader]) => (localeFiles[normalize(path)] = loader));
Object.entries(localeFilesCustomerWorkspaceRoot).forEach(([path, loader]) => (localeFiles[normalize(path)] = loader));
Object.entries(localeFilesNuxtModules)`,
};

const SNIPPET_TRIGGERS = {
  before: `const customerTriggers = import.meta.glob('/node_modules/*/runtime/components/**/settings/*/*ToolbarTrigger.vue', {
  import: 'default',
}) as Record<string, Loader>;

const nuxtModuleTriggers`,
  after: `const customerTriggers = import.meta.glob('/node_modules/*/runtime/components/**/settings/*/*ToolbarTrigger.vue', {
  import: 'default',
}) as Record<string, Loader>;

const customerWorkspaceRootTriggers = import.meta.glob(
  '../../../../node_modules/*/runtime/components/**/settings/*/*ToolbarTrigger.vue',
  {
    import: 'default',
  },
) as Record<string, Loader>;

const nuxtModuleTriggers`,
};

const SNIPPET_TRIGGERS_MERGE = {
  before: `Object.entries(customerTriggers).forEach(([path, loader]) => (ordered[slug(path)] = loader));
Object.entries(nuxtModuleTriggers)`,
  after: `Object.entries(customerTriggers).forEach(([path, loader]) => (ordered[slug(path)] = loader));
Object.entries(customerWorkspaceRootTriggers).forEach(([path, loader]) => (ordered[slug(path)] = loader));
Object.entries(nuxtModuleTriggers)`,
};

function patchFile(filePath, patches) {
  if (!existsSync(filePath)) return false;
  let content = readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { before, after } of patches) {
    if (content.includes(before) && !content.includes(after)) {
      content = content.replace(before, after);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function patchFileSkipIfPresent(filePath, patches, skipMarker) {
  if (!existsSync(filePath)) return false;
  let content = readFileSync(filePath, 'utf8');
  if (skipMarker && content.includes(skipMarker)) return false;
  let changed = false;
  for (const { before, after } of patches) {
    if (content.includes(before) && !content.includes(after)) {
      content = content.replace(before, after);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const PLUGIN_CONTENT = `/**
 * Stellt Editor-Composables für npm-Module (z. B. uptain-pwa-beta) bereit.
 * Abruf in Modul-Komponenten: useNuxtApp().$useSiteSettings / .$getEditorTranslation
 */
import { useSiteSettings } from '~/composables/useSiteSettings';
import { getEditorTranslation } from '~/utils/sortingOptionsHelper';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('useSiteSettings', useSiteSettings);
  nuxtApp.provide('getEditorTranslation', getEditorTranslation);
});
`;

function main() {
  const utilsDir = findHostUtilsDir();
  if (!utilsDir) return;

  const appDir = getAppDir(utilsDir);
  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  let any = false;

  // --- 1) Lokale UptainSettings.vue anlegen ---
  const componentDir = join(appDir, 'components', 'settings', 'seo', 'tracking-and-analytics', 'uptain');
  const componentPath = join(componentDir, 'UptainSettings.vue');
  const templatePath = join(scriptsDir, 'templates', 'UptainSettings.vue');
  if (!existsSync(componentPath) && existsSync(templatePath)) {
    mkdirSync(componentDir, { recursive: true });
    writeFileSync(componentPath, readFileSync(templatePath, 'utf8'));
    console.log('[uptain-pwa-beta] Created:', componentPath);
    any = true;
  }

  // --- 2) Settings-Dateien patchen ---
  const settingsGroupsPath = join(utilsDir, 'settings-groups-imports.ts');
  if (patchFile(settingsGroupsPath, [SNIPPET_GROUPS, SNIPPET_GROUPS_MERGE])) {
    console.log('[uptain-pwa-beta] Patched:', settingsGroupsPath);
    any = true;
  }
  if (patchFileSkipIfPresent(settingsGroupsPath, [SETTINGS_OVERRIDES_DECL, SETTINGS_OVERRIDES_MERGE], 'settingsOverrides')) {
    console.log('[uptain-pwa-beta] Patched settingsOverrides:', settingsGroupsPath);
    any = true;
  }

  const files = [
    { path: join(utilsDir, 'settings-translations-imports.ts'), patches: [SNIPPET_TRANSLATIONS, SNIPPET_TRANSLATIONS_MERGE] },
    { path: join(utilsDir, 'triggers-imports.ts'), patches: [SNIPPET_TRIGGERS, SNIPPET_TRIGGERS_MERGE] },
  ];
  for (const { path: filePath, patches } of files) {
    if (patchFile(filePath, patches)) {
      console.log('[uptain-pwa-beta] Patched:', filePath);
      any = true;
    }
  }

  // --- 3) Provide-Plugin anlegen ---
  const pluginsDir = join(appDir, 'plugins');
  const pluginPath = join(pluginsDir, '00.provide-editor-composables.client.ts');
  if (!existsSync(pluginPath)) {
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(pluginPath, PLUGIN_CONTENT);
    console.log('[uptain-pwa-beta] Created:', pluginPath);
    any = true;
  }

  // --- 4) Cookie-Config: Uptain im Consent Manager (Marketing-Gruppe) ---
  const configDir = join(appDir, 'configuration');
  const cookieConfigPath = join(configDir, 'cookie.config.ts');
  const COOKIE_CONFIG_MARKETING = {
    before: `name: 'CookieBar.marketing.label',
      showMore: false,
      description: 'CookieBar.marketing.description',
      cookies: [],
    },
  ],
} as CookieGroupFromNuxtConfig`,
    after: `name: 'CookieBar.marketing.label',
      showMore: false,
      description: 'CookieBar.marketing.description',
      cookies: [
        {
          name: 'CookieBar.uptain.cookies.uptain.name',
          Provider: 'CookieBar.uptain.cookies.uptain.provider',
          Status: 'CookieBar.uptain.cookies.uptain.status',
          PrivacyPolicy: 'https://uptain.de/datenschutz',
          Lifespan: 'CookieBar.uptain.cookies.uptain.lifespan',
          accepted: false,
        },
      ],
    },
  ],
} as CookieGroupFromNuxtConfig`,
  };
  if (patchFileSkipIfPresent(cookieConfigPath, [COOKIE_CONFIG_MARKETING], 'CookieBar.uptain.cookies.uptain')) {
    console.log('[uptain-pwa-beta] Patched cookie.config (Consent Manager):', cookieConfigPath);
    any = true;
  }

  // --- 5) i18n: Uptain-Cookie-Texte für Consent Manager ---
  const langDir = join(appDir, 'lang');
  const UPTAIN_LANG_EN = {
    before: `"marketing": {
      "description": "Marketing cookies are used by third parties and publishers to display personalised advertisements by following users across websites.",
      "label": "Marketing"
    },
    "More information": "More information",`,
    after: `"marketing": {
      "description": "Marketing cookies are used by third parties and publishers to display personalised advertisements by following users across websites.",
      "label": "Marketing"
    },
    "uptain": {
      "cookies": {
        "uptain": {
          "name": "Uptain",
          "provider": "Uptain GmbH",
          "status": "Newsletter signup and personalisation.",
          "lifespan": "Session"
        }
      }
    },
    "More information": "More information",`,
  };
  const UPTAIN_LANG_DE = {
    before: `"marketing": {
      "description": "Marketing-Cookies werden von Drittanbietern und Publishern verwendet, um personalisierte Werbung anzuzeigen. Sie tun dies, indem Sie Besucher über Websites hinweg verfolgen.",
      "label": "Marketing"
    },
    "More information": "Mehr Informationen",`,
    after: `"marketing": {
      "description": "Marketing-Cookies werden von Drittanbietern und Publishern verwendet, um personalisierte Werbung anzuzeigen. Sie tun dies, indem Sie Besucher über Websites hinweg verfolgen.",
      "label": "Marketing"
    },
    "uptain": {
      "cookies": {
        "uptain": {
          "name": "Uptain",
          "provider": "Uptain GmbH",
          "status": "Newsletter-Anmeldung und Personalisierung.",
          "lifespan": "Session"
        }
      }
    },
    "More information": "Mehr Informationen",`,
  };
  for (const { path: filePath, patches } of [
    { path: join(langDir, 'en.json'), patches: [UPTAIN_LANG_EN] },
    { path: join(langDir, 'de.json'), patches: [UPTAIN_LANG_DE] },
  ]) {
    if (patchFileSkipIfPresent(filePath, patches, 'Uptain GmbH')) {
      console.log('[uptain-pwa-beta] Patched lang (Consent Manager):', filePath);
      any = true;
    }
  }

  // --- 6) nuxt.config patchen (appManifest, noExternal) ---
  const nuxtConfigPath = join(appDir, '..', 'nuxt.config.ts');
  if (existsSync(nuxtConfigPath)) {
    let configContent = readFileSync(nuxtConfigPath, 'utf8');
    let configChanged = false;
    if (!configContent.includes('appManifest')) {
      configContent = configContent.replace(
        'asyncContext: true',
        'asyncContext: true,\n    // Verhindert 404 bei "Error fetching app manifest" in Deployment (z. B. PlentyONE).\n    appManifest: false',
      );
      configChanged = true;
    }
    if (!configContent.includes("noExternal: ['uptain-pwa-beta']")) {
      configContent = configContent.replace(
        /vite:\s*\{\s*server:/,
        "vite: {\n    ssr: {\n      noExternal: ['uptain-pwa-beta'],\n    },\n    server:",
      );
      configChanged = true;
    }
    if (configChanged) {
      writeFileSync(nuxtConfigPath, configContent);
      console.log('[uptain-pwa-beta] Patched:', nuxtConfigPath);
      any = true;
    }
  }

  if (any) {
    console.log('[uptain-pwa-beta] Uptain-Integration eingerichtet. Settings unter SEO → Tracking & analytics, Uptain im Consent Manager (Marketing).');
  }
}

main();

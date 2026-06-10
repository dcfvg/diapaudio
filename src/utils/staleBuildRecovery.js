import * as logger from "./logger.js";

const RECOVERY_FLAG = "diapaudio:stale-build-recovery-attempted";

const STALE_IMPORT_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk [\w-]+ failed/i,
  /failed to fetch module script/i,
];

function getErrorText(error) {
  if (!error) return "";
  const parts = [];
  if (typeof error === "string") {
    parts.push(error);
  } else {
    parts.push(error.message, error.stack, error.toString?.());
  }
  return parts.filter(Boolean).join("\n");
}

function getAppBaseHref() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return new URL(import.meta.env.BASE_URL || "/", window.location.origin).href;
  } catch {
    return window.location.origin;
  }
}

function shouldDeleteCache(cacheName, appBaseHref) {
  if (!cacheName) {
    return false;
  }
  return (
    cacheName.includes("diapaudio") ||
    (appBaseHref && cacheName.includes(appBaseHref)) ||
    (appBaseHref && cacheName.includes(encodeURIComponent(appBaseHref)))
  );
}

async function clearAppCaches() {
  const cacheStorage = globalThis.caches;
  if (!cacheStorage || typeof cacheStorage.keys !== "function") {
    return;
  }
  const appBaseHref = getAppBaseHref();
  const keys = await cacheStorage.keys();
  await Promise.all(
    keys
      .filter((key) => shouldDeleteCache(key, appBaseHref))
      .map((key) => cacheStorage.delete(key))
  );
}

async function unregisterAppServiceWorkers() {
  if (
    typeof navigator === "undefined" ||
    !navigator.serviceWorker ||
    typeof navigator.serviceWorker.getRegistrations !== "function"
  ) {
    return;
  }

  const appBaseHref = getAppBaseHref();
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        if (!appBaseHref) {
          return true;
        }
        return registration.scope === appBaseHref || registration.scope?.startsWith(appBaseHref);
      })
      .map((registration) => registration.unregister())
  );
}

export function isStaleBuildImportError(error) {
  const text = getErrorText(error);
  return STALE_IMPORT_PATTERNS.some((pattern) => pattern.test(text));
}

export async function clearStaleBuildCaches() {
  await Promise.allSettled([clearAppCaches(), unregisterAppServiceWorkers()]);
}

export function recoverFromStaleBuildImport(error, options = {}) {
  const {
    force = false,
    reload = () => window.location.reload(),
    storage = typeof window !== "undefined" ? window.sessionStorage : null,
  } = options;

  if (!isStaleBuildImportError(error) || typeof window === "undefined") {
    return false;
  }

  try {
    if (!force && storage?.getItem(RECOVERY_FLAG) === "1") {
      return false;
    }
    storage?.setItem(RECOVERY_FLAG, "1");
  } catch {
    // Session storage can be unavailable in private contexts; still try one recovery.
  }

  window.setTimeout(() => {
    clearStaleBuildCaches()
      .catch((cacheError) => {
        logger.warn("Failed to clear stale build caches before reload:", cacheError);
      })
      .finally(() => {
        reload();
      });
  }, 0);

  return true;
}

export function installStaleBuildRecovery() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("unhandledrejection", (event) => {
    recoverFromStaleBuildImport(event.reason);
  });

  window.addEventListener("error", (event) => {
    recoverFromStaleBuildImport(event.error || event.message);
  });
}

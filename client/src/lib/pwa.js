let deferredPrompt = null;
const listeners = new Set();

export function setInstallPrompt(e) {
  deferredPrompt = e;
  listeners.forEach((l) => l(e));
}

export function getInstallPrompt() {
  return deferredPrompt;
}

export function clearInstallPrompt() {
  deferredPrompt = null;
  listeners.forEach((l) => l(null));
}

export function onInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

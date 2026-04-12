function resolveLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storage = window.localStorage as Partial<Storage> | undefined
  if (
    !storage ||
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  ) {
    return null
  }

  return storage as Storage
}

export function getLocalStorageItem(key: string) {
  try {
    return resolveLocalStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function setLocalStorageItem(key: string, value: string) {
  try {
    resolveLocalStorage()?.setItem(key, value)
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}

export function removeLocalStorageItem(key: string) {
  try {
    resolveLocalStorage()?.removeItem(key)
  } catch {
    // Ignore storage removal failures in restricted environments.
  }
}

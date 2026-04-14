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

export function removeLocalStorageItemsMatching(
  matcher: ((key: string) => boolean) | RegExp,
) {
  const storage = resolveLocalStorage()
  if (!storage) {
    return
  }

  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key),
    )

    for (const key of keys) {
      const shouldRemove =
        matcher instanceof RegExp ? matcher.test(key) : matcher(key)

      if (shouldRemove) {
        storage.removeItem(key)
      }
    }
  } catch {
    // Ignore storage iteration failures in restricted environments.
  }
}

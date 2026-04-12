import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/lib/utils/safe-storage'

const DEBUG_AUTH_STORAGE_KEY = 'genius-actuary-debug-basic-auth'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getDebugAuthHeader() {
  if (!isBrowser()) {
    return null
  }

  return getLocalStorageItem(DEBUG_AUTH_STORAGE_KEY)
}

export function setDebugAuthHeader(value: string) {
  if (!isBrowser()) {
    return
  }

  setLocalStorageItem(DEBUG_AUTH_STORAGE_KEY, value)
}

export function clearDebugAuthHeader() {
  if (!isBrowser()) {
    return
  }

  removeLocalStorageItem(DEBUG_AUTH_STORAGE_KEY)
}

export function buildBasicAuthHeader(username: string, password: string) {
  const encoded = window.btoa(`${username}:${password}`)
  return `Basic ${encoded}`
}

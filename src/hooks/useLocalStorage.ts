import { useState, useEffect } from 'react'

type QuotaErrorCallback = (key: string) => void
let onQuotaError: QuotaErrorCallback | null = null

export function setQuotaErrorHandler(handler: QuotaErrorCallback) {
  onQuotaError = handler
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error(`localStorage quota exceeded for key: ${key}`)
        onQuotaError?.(key)
      }
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

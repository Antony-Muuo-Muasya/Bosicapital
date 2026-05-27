'use client'

import { useState, useEffect, useCallback } from 'react'

export function usePrismaQuery<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  const refresh = useCallback(() => {
    setRefreshCount(c => c + 1)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetcher()
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [...dependencies, refreshCount])

  return { data, isLoading, error, refresh }
}

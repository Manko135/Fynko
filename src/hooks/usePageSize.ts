import { useEffect, useState } from 'react'

/** 12 rows per page on desktop, 8 on mobile — updates live on resize. */
export function usePageSize(desktop = 12, mobile = 8): number {
  const get = () =>
    typeof window !== 'undefined' && window.innerWidth >= 640 ? desktop : mobile
  const [size, setSize] = useState(get)
  useEffect(() => {
    const onResize = () => setSize(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return size
}

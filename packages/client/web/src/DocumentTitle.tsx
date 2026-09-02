import { useEffect, useRef } from 'react'

/** Props for the shell-owned browser title projection. */
export interface DocumentTitleProps {
  /** Durable title of the selected session, or undefined for the product title. */
  title?: string
  /** Active branding service product title. */
  productTitle: string
}

/**
 * Project active product and session identity into the browser title, restoring
 * the pre-shell title on unmount.
 * @param props - selected session and active product titles.
 * @returns no rendered content.
 */
export function DocumentTitle({ title, productTitle }: DocumentTitleProps): null {
  const original = useRef(document.title)
  useEffect(() => {
    document.title = title === undefined ? productTitle : `${title} — ${productTitle}`
    return () => { document.title = original.current }
  }, [productTitle, title])
  return null
}

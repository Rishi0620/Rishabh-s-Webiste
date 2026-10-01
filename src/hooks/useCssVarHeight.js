import { useEffect } from 'react'

// Publishes an element's rendered height as a CSS custom property on <html>,
// so fixed-position neighbours can lay themselves out around it.
export function useCssVarHeight(ref, name) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const publish = () => root.style.setProperty(name, `${el.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [ref, name])
}

import * as React from "react"

export function usePointerPosition(active = true) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    if (!active) return

    const onMove = (event: PointerEvent) => {
      setPosition({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [active])

  return position
}

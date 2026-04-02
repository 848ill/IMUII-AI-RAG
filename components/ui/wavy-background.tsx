"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface WavyBackgroundProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  colors?: string[]
  waveWidth?: number
  backgroundFill?: string
  blur?: number
  speed?: "slow" | "fast"
  waveOpacity?: number
  waveStyle?: "fill" | "line"
}

export function WavyBackground({
  children,
  className,
  containerClassName,
  colors = ["#0B3B75", "#1e5a9e", "#FDB913", "#0d4a8f", "#2d6bb3"],
  waveWidth = 50,
  backgroundFill = "rgb(15, 23, 42)",
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  waveStyle = "fill",
}: WavyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0
    const speedMultiplier = speed === "fast" ? 0.02 : 0.01

    let width = 0
    let height = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width
      canvas.height = height
    }

    const draw = () => {
      if (width === 0 || height === 0) return

      ctx.clearRect(0, 0, width, height)
      if (backgroundFill && backgroundFill !== "transparent") {
        ctx.fillStyle = backgroundFill
        ctx.fillRect(0, 0, width, height)
      }

      ctx.globalAlpha = waveOpacity
      if (blur > 0) ctx.filter = `blur(${blur}px)`

      if (waveStyle === "line") {
        // Wave tebal + efek neon - menyala
        ctx.filter = `blur(12px)`
        colors.forEach((color, i) => {
          const baseY = height * 0.5 + (i - colors.length / 2) * 100
          ctx.beginPath()
          ctx.moveTo(0, baseY)

          for (let x = 0; x <= width + 20; x += 5) {
            const y =
              baseY -
              Math.sin((x * 0.008) + time + i * 0.8) * waveWidth -
              Math.sin((x * 0.015) + time * 0.6 + i * 2) * waveWidth * 0.4
            ctx.lineTo(x, y)
          }

          ctx.strokeStyle = color
          ctx.lineWidth = 16
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.shadowColor = color
          // Neon: 5 layer glow - semakin kuat
          ctx.shadowBlur = 280
          ctx.globalAlpha = 0.6
          ctx.stroke()
          ctx.shadowBlur = 200
          ctx.globalAlpha = 0.8
          ctx.stroke()
          ctx.shadowBlur = 140
          ctx.globalAlpha = 0.9
          ctx.stroke()
          ctx.shadowBlur = 80
          ctx.globalAlpha = 1
          ctx.stroke()
          ctx.shadowBlur = 40
          ctx.globalAlpha = waveOpacity
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        })
      } else {
        // Wave fill (default)
        colors.forEach((color, i) => {
          ctx.beginPath()
          ctx.moveTo(0, height)

          for (let x = 0; x <= width + 10; x += 10) {
            const y =
              height -
              (Math.sin((x * 0.01) + time + i * 0.5) * waveWidth +
                Math.sin((x * 0.02) + time * 0.7 + i) * waveWidth * 0.5) -
              i * 30
            ctx.lineTo(x, y)
          }

          ctx.lineTo(width + 10, height)
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()
        })
      }

      ctx.globalAlpha = 1
      ctx.filter = "none"
      time += speedMultiplier
      animationId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [colors, waveWidth, backgroundFill, blur, speed, waveOpacity, waveStyle])

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        containerClassName
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  )
}

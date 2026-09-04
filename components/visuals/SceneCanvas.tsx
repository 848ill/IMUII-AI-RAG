"use client"

import dynamic from "next/dynamic"

export const SceneCanvas = dynamic(
  () => import("./SceneCanvasImpl").then((mod) => mod.SceneCanvasImpl),
  {
    ssr: false,
    loading: () => (
      <div
        className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-[#070709]"
        aria-hidden="true"
      />
    ),
  }
)

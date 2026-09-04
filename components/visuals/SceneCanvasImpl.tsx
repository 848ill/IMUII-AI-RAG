"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function SceneCanvasImpl() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") return

    // Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070709, 0.0018)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 85

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x070709, 1)
    container.appendChild(renderer.domElement)

    // 1. Particle Constellation
    const particleCount = 1800
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const palette = [
      new THREE.Color(0x00f5a0),
      new THREE.Color(0x00d2ff),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x10b981),
      new THREE.Color(0x6366f1),
    ]

    for (let i = 0; i < particleCount; i++) {
      const radius = 40 + Math.random() * 85
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const color = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    // Canvas particle circular sprite texture
    const canvas = document.createElement("canvas")
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      gradient.addColorStop(0, "rgba(255,255,255,1)")
      gradient.addColorStop(0.3, "rgba(255,255,255,0.7)")
      gradient.addColorStop(0.7, "rgba(255,255,255,0.15)")
      gradient.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 32, 32)
    }
    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // 2. Central Core Wireframe
    const coreGeometry = new THREE.IcosahedronGeometry(28, 2)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f5a0,
      wireframe: true,
      transparent: true,
      opacity: 0.045,
    })
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial)
    scene.add(coreMesh)

    const outerGeometry = new THREE.IcosahedronGeometry(42, 1)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.025,
    })
    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial)
    scene.add(outerMesh)

    // Interactive mouse tracking
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (event: MouseEvent) => {
      const halfX = window.innerWidth / 2
      const halfY = window.innerHeight / 2
      mouseX = (event.clientX - halfX) * 0.00045
      mouseY = (event.clientY - halfY) * 0.00045
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener("resize", handleResize)

    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      targetX += (mouseX - targetX) * 0.04
      targetY += (mouseY - targetY) * 0.04

      particles.rotation.y = elapsedTime * 0.035 + targetX * 1.5
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1 + targetY * 1.5

      coreMesh.rotation.y = -elapsedTime * 0.04 + targetX * 0.8
      coreMesh.rotation.x = elapsedTime * 0.02 + targetY * 0.8

      outerMesh.rotation.y = elapsedTime * 0.02 + targetX * 0.5
      outerMesh.rotation.z = elapsedTime * 0.015

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrameId)

      geometry.dispose()
      material.dispose()
      texture.dispose()
      coreGeometry.dispose()
      coreMaterial.dispose()
      outerGeometry.dispose()
      outerMaterial.dispose()
      renderer.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden bg-[#070709]"
      aria-hidden="true"
    />
  )
}

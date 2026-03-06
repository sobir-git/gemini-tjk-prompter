import { useEffect, useRef } from 'react'

interface Props {
  analyser: AnalyserNode
}

export default function AudioVisualizer({ analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const barCount = 32
      const barWidth = 1
      const gap = (width - barCount * barWidth) / (barCount - 1)
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255
        const barHeight = Math.max(2, value * height)
        const x = i * (barWidth + gap)
        const y = height - barHeight

        ctx.fillStyle = `rgba(240, 238, 233, ${0.2 + value * 0.8})`
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }

    draw()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyser])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={60}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

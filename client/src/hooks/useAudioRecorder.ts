import { useRef, useCallback } from 'react'

interface UseAudioRecorderOptions {
  onStop: (blob: Blob, analyser: AnalyserNode) => void
  onAnalyserReady: (analyser: AnalyserNode) => void
  onError: (message: string) => void
}

export function useAudioRecorder({ onStop, onAnalyserReady, onError }: UseAudioRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyserRef.current = analyser
      onAnalyserReady(analyser)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        onStop(audioBlob, analyser)
      }

      mediaRecorder.start()
    } catch {
      onError('Microphone access denied or unavailable.')
    }
  }, [onStop, onAnalyserReady, onError])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    audioContextRef.current?.close()
  }, [])

  return { start, stop, analyserRef }
}

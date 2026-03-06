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
  const startTimeRef = useRef<number>(0)
  const canceledRef = useRef<boolean>(false)

  const timerRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    audioContextRef.current?.close()
  }, [])

  const cancel = useCallback(() => {
    canceledRef.current = true
    stop()
  }, [stop])

  const start = useCallback(async () => {
    try {
      canceledRef.current = false
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

      mediaRecorder.onstart = () => {
        startTimeRef.current = Date.now()
      }

      mediaRecorder.onstop = () => {
        if (canceledRef.current) {
          // Silent exit if canceled
          return
        }

        const duration = Date.now() - startTimeRef.current
        
        // Discard recordings shorter than 2 seconds (2000ms)
        if (duration < 2000) {
          onError('Сабт хеле кӯтоҳ аст. Лутфан на камтар аз 2 сония сухан гӯед.')
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        onStop(audioBlob, analyser)
      }

      mediaRecorder.start()

      // Set 2-minute limit
      timerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stop()
        }
      }, 120000)

    } catch {
      onError('Дастрасӣ ба микрофон рад шуд ё дастнорас аст.')
    }
  }, [onStop, onAnalyserReady, onError, stop])

  return { start, stop, cancel, analyserRef }
}

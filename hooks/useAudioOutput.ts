import {useCallback, useRef} from 'react'

const useAudioOutput = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({sampleRate: 24000})
      await audioContextRef.current.audioWorklet.addModule('/pcm-processor.js')
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor')
      workletNodeRef.current.connect(audioContextRef.current.destination)
    }
  }, [])

  const playAudioChunk = useCallback(
    async (base64AudioChunk: string) => {
      try {
        await initializeAudio()

        const binaryString = window.atob(base64AudioChunk)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        const float32Data = new Float32Array(bytes.length / 2)
        const dataView = new DataView(bytes.buffer)
        for (let i = 0; i < float32Data.length; i++) {
          float32Data[i] = dataView.getInt16(i * 2, true) / 32768
        }

        workletNodeRef.current?.port.postMessage(float32Data)
      } catch (error) {
        console.error('Failed to play audio chunk:', error)
      }
    },
    [initializeAudio],
  )

  const cleanup = useCallback(() => {
    workletNodeRef.current?.disconnect()
    audioContextRef.current?.close()
    audioContextRef.current = null
    workletNodeRef.current = null
  }, [])

  return {playAudioChunk, cleanup}
}

export default useAudioOutput

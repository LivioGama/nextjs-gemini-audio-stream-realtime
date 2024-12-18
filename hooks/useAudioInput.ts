import {useEffect, useState} from 'react'
import useAsyncEffect from 'use-async-effect'

const useAudioInput = ({
  onAudioChunk,
  isEnabled,
  deviceId,
}: {
  onAudioChunk: (chunk: string) => void
  isEnabled: boolean
  deviceId?: string
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useAsyncEffect(async () => {
    if (!isEnabled || !deviceId) {
      setIsRecording(false)
      setStream(null)
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          deviceId: {exact: deviceId},
        },
      })
      setStream(mediaStream)
    } catch (error) {
      console.error('Failed to setup media stream:', error)
      setIsRecording(false)
      setStream(null)
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [isEnabled, deviceId])

  useEffect(() => {
    if (!stream) {
      setIsRecording(false)
      return
    }

    let audioContext: AudioContext | null = null
    let intervalId: NodeJS.Timer
    let pcmData: number[] = []

    try {
      audioContext = new AudioContext({sampleRate: 16000})
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = e => {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = inputData[i] * 0x7fff
        }
        pcmData.push(...Array.from(pcm16))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      intervalId = setInterval(() => {
        if (pcmData.length > 0) {
          const buffer = new ArrayBuffer(pcmData.length * 2)
          const view = new DataView(buffer)
          pcmData.forEach((value, index) => {
            view.setInt16(index * 2, value, true)
          })

          // @ts-ignore
          const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
          onAudioChunk(base64)
          pcmData = []
        }
      }, 1000)

      setIsRecording(true)
    } catch (error) {
      console.error('Failed to setup audio processing:', error)
      setIsRecording(false)
    }

    return () => {
      intervalId && clearInterval(intervalId as NodeJS.Timeout)
      audioContext?.close()
    }
  }, [stream, onAudioChunk])

  return {isRecording}
}

export default useAudioInput

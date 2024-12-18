import {useCallback, useEffect, useState} from 'react'
import useAsyncEffect from 'use-async-effect'

interface UseVideoCaptureProps {
  videoElement?: HTMLVideoElement | null
  canvasElement?: HTMLCanvasElement | null
  onFrame: (frameData: string) => void
  deviceId?: string
  mode?: 'webcam' | 'screen'
  fps?: number
  setActive: (active: boolean) => void
}

const useVideoCapture = ({
  videoElement,
  canvasElement,
  onFrame,
  deviceId,
  mode,
  fps = 1,
  setActive,
}: UseVideoCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (videoElement) {
      videoElement.srcObject = null
    }
    setStream(null)
    setIsCapturing(false)
    setActive(false)
  }, [stream, videoElement, setActive])

  useAsyncEffect(async () => {
    let intervalId: NodeJS.Timeout
    try {
      if (!videoElement || !canvasElement || !mode) {
        throw new Error('Source disappeared')
      }
      if (stream) return
      let newStream: MediaStream | null = null
      if (mode === 'webcam' && deviceId) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? {deviceId: {exact: deviceId}} : true,
        })
      }
      if (mode === 'screen') {
        newStream = await navigator.mediaDevices.getDisplayMedia({video: true})
      }
      if (!newStream) {
        throw new Error('Could not retrieve the stream')
      }

      if (mode === 'screen') {
        newStream.getVideoTracks()[0].onended = () => {
          cleanup()
        }
      }

      videoElement.srcObject = newStream
      videoElement.playsInline = true
      videoElement.autoplay = true

      await new Promise<void>(resolve => {
        videoElement.onloadedmetadata = () => {
          canvasElement.width = videoElement.videoWidth
          canvasElement.height = videoElement.videoHeight
          resolve()
        }
      })
      await videoElement.play()

      const ctx = canvasElement.getContext('2d')
      if (!ctx) {
        throw new Error('No canvas context found')
      }

      setIsCapturing(true)
      setStream(newStream)

      intervalId = setInterval(() => {
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
          ctx.drawImage(videoElement, 0, 0)
          const frameData = canvasElement.toDataURL('image/jpeg').split(',')[1]
          onFrame(frameData)
        }
      }, 1000 / fps)
    } catch (err) {
      console.log('Stream acquisition failed:', err)
      clearInterval(intervalId)
      cleanup()
    }
    return () => {
      clearInterval(intervalId)
      cleanup()
    }
  }, [videoElement, canvasElement, mode, stream, cleanup, setActive, deviceId])

  useEffect(() => {
    if (!isCapturing || !videoElement || !canvasElement) return
  }, [isCapturing, videoElement, canvasElement, fps, onFrame])

  return {isCapturing}
}

export default useVideoCapture

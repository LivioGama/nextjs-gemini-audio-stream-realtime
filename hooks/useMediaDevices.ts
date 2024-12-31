import {useState} from 'react'
import useAsyncEffect from 'use-async-effect'

const useMediaDevices = () => {
  const [audioSources, setAudioSources] = useState<MediaDeviceInfo[]>([])
  const [videoSources, setVideoSources] = useState<MediaDeviceInfo[]>([])

  useAsyncEffect(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({audio: true, video: true})

      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioSources(devices.filter(d => d.kind === 'audioinput'))
      setVideoSources(devices.filter(d => d.kind === 'videoinput'))
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }, [])

  return {audioSources, videoSources}
}

export default useMediaDevices

import {useState} from 'react'
import useAsyncEffect from 'use-async-effect'

const useMediaDevices = () => {
  const [audioSources, setAudioSources] = useState<MediaDeviceInfo[]>([])
  const [videoSources, setVideoSources] = useState<MediaDeviceInfo[]>([])

  useAsyncEffect(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({audio: true, video: true})
    } catch (error) {}
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioSources(devices.filter(d => d.kind === 'audioinput'))
      setVideoSources(devices.filter(d => d.kind === 'videoinput'))
    } catch (error) {
      console.error('Error enumerating media devices:', error)
    }
  }, [])

  return {audioSources, videoSources}
}

export default useMediaDevices

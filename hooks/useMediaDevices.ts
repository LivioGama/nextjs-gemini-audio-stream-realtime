import {useState} from 'react'
import useAsyncEffect from 'use-async-effect'

const useMediaDevices = () => {
  const [audioSources, setAudioSources] = useState<MediaDeviceInfo[]>([])
  const [videoSources, setVideoSources] = useState<MediaDeviceInfo[]>([])

  useAsyncEffect(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    setAudioSources(devices.filter(d => d.kind === 'audioinput'))
    setVideoSources(devices.filter(d => d.kind === 'videoinput'))
  }, [])

  return {audioSources, videoSources}
}

export default useMediaDevices

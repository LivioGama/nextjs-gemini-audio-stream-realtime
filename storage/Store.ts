import {observable} from '@legendapp/state'
import {configureObservableSync, syncObservable} from '@legendapp/state/sync'
import {ObservablePersistLocalStorage} from '@legendapp/state/persist-plugins/local-storage'
import {PROJECT_ID} from '@/consts'

configureObservableSync({
  persist: {
    plugin: ObservablePersistLocalStorage,
  },
})

const lastSelectedMicrophone = observable<string>()
const lastSelectedWebcam = observable<string>()
const projectId = observable<string>(PROJECT_ID || '')
const accessToken = observable<string>('')

const Store = {
  lastSelectedMicrophone,
  lastSelectedWebcam,
  projectId,
  accessToken,
}

syncObservable(lastSelectedMicrophone, {persist: {name: 'lastSelectedMicrophone'}})
syncObservable(lastSelectedWebcam, {persist: {name: 'lastSelectedWebcam'}})
syncObservable(projectId, {persist: {name: 'projectId'}})
syncObservable(accessToken, {persist: {name: 'accessToken'}})

export default Store

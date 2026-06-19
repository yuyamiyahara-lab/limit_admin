import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 1. 食材を登録する（db.jsのadd-ingredientを実行する）
  addIngredient: (data) => ipcRenderer.invoke('add-ingredient', data),
  // 2. 食材を取得する
  getIngredients: (sortBy) => ipcRenderer.invoke('get-ingredients', sortBy),
  // 3. 食材を更新する
  updateIngredient: (data) => ipcRenderer.invoke('update-ingredient', data),
  // 4. 食材を削除する
  deleteIngredient: (id) => ipcRenderer.invoke('delete-ingredient', id),

  getFrequents: () => ipcRenderer.invoke('get-frequents'),
  addFrequent: (data) => ipcRenderer.invoke('add-frequent', data),
  deleteFrequent: (id) => ipcRenderer.invoke('delete-frequent', id),

  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

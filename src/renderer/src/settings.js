// ------------------------------
// 設定の処理
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupSettingsHandler()
})

async function setupSettingsHandler() {
  const apiKeyInput = document.querySelector('.screen-settings__input')
  const saveButton = document.querySelector('.screen-settings__button')

  if (!apiKeyInput || !saveButton) return

  try {
    const savedKey = await window.api.getApiKey()
    if (savedKey) {
      apiKeyInput.value = savedKey
    }
  } catch (error) {
    console.error('APIキーの取得に失敗しました:', error)
  }

  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim()
    try {
      await window.api.saveApiKey(apiKey)
      alert('APIキーを保存しました！')
    } catch (error) {
      console.error('APIキーの保存に失敗しました:', error)
      alert('保存に失敗しました。')
    }
  })
}

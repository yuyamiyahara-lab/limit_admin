import { marked } from 'marked'
// ------------------------------
// レシピ提案（AIチャット）画面の処理
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupRecipeChatHandler()
})

function setupRecipeChatHandler() {
  const chatForm = document.querySelector('.js-recipe-form')
  const chatInput = document.querySelector('.js-recipe-input')
  const chatMessagesArea = document.querySelector('.js-recipe-messages')

  if (!chatForm || !chatInput || !chatMessagesArea) return

  // これまでの会話のやり取り（文脈）を保存する配列
  let chatHistory = []

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const userText = chatInput.value.trim()
    if (!userText) return

    // 1. ユーザー発言の表示と追加
    appendMessage(userText, 'user')
    chatInput.value = ''

    // 履歴にユーザーの発言を追加
    chatHistory.push({
      role: 'user',
      parts: [{ text: userText }]
    })

    // 2. ローディング表示
    const loadingId = appendMessage('AIがレシピを考え中...', 'ai', true)

    try {
      // 3. DBから現在の食材リストを取得
      const ingredients = await window.api.getIngredients()
      let ingredientsPrompt =
        '現在、冷蔵庫には以下の食材があります。この情報も踏まえてレシピを提案してください。\n\n'
      if (ingredients.length > 0) {
        ingredients.forEach((item) => {
          ingredientsPrompt += `- ${item.name} (${item.amount}${item.unit || ''}) ${item.type}: ${item.deadline}\n`
        })
      } else {
        ingredientsPrompt += '現在、登録されている食材はありません。\n'
      }

      // 4. メインプロセスに「現在の食材リスト」「会話履歴」を投げて、結果を待つ
      //（APIキーはrenderer側には見えない）
      const result = await window.api.sendRecipeChat(ingredientsPrompt, chatHistory)

      removeMessage(loadingId)

      if (!result.success) {
        if (result.error === 'API_KEY_NOT_FOUND') {
          appendMessage('APIキーが設定されていません。設定画面から保存してください。', 'system')
        } else if (result.error === 'API_KEY_INVALID') {
          appendMessage(
            'APIキーが正しくありません。設定画面から正しいキーを保存してください。',
            'system'
          )
        } else {
          appendMessage(
            `エラーが発生しました: ${result.error}\n時間を置いて試すか、APIキーを確認してください。`,
            'system'
          )
        }
        return
      }

      // 5. AIの回答を表示して履歴に追加
      appendMessage(result.recipe, 'ai')

      // 次のチャットのために履歴に追加するテキストは、タイトルと本文を結合したものにする
      const historyText = `${result.recipe.title}\n\n${result.recipe.content}`
      chatHistory.push({
        role: 'model', // SDKを使う場合、AI側のroleは 'model' にします
        parts: [{ text: historyText }]
      })
    } catch (error) {
      console.error(error)
      removeMessage(loadingId)
      appendMessage('通信エラーが発生しました。', 'system')
    }
  })

  // --- メッセージを画面に追加する補助関数 ---
  function appendMessage(data, sender, isLoading = false) {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message message--${sender}` // CSS装飾用クラス
    if (isLoading) {
      messageDiv.id = `loading-${Date.now()}`
      messageDiv.style.opacity = '0.5'
    }

    if (sender === 'ai' && !isLoading) {
      const { title, content, ingredients } = data

      // タイトルの表示
      const titleEl = document.createElement('h3')
      titleEl.textContent = title
      titleEl.style.margin = '0 0 10px 0'
      messageDiv.appendChild(titleEl)

      // 主要な食材の表示
      if (ingredients && ingredients.length > 0) {
        const ingEl = document.createElement('div')
        ingEl.textContent = `主要な食材: ${ingredients.join(', ')}`
        ingEl.style.fontSize = '0.9em'
        ingEl.style.color = '#666'
        ingEl.style.marginBottom = '10px'
        messageDiv.appendChild(ingEl)
      }

      // レシピ本文の表示
      const contentEl = document.createElement('div')
      contentEl.innerHTML = marked.parse(content)
      messageDiv.appendChild(contentEl)

      // 「このレシピを保存する」ボタンを作成
      const saveButton = document.createElement('button')
      saveButton.textContent = 'このレシピを保存する'
      saveButton.className = 'btn-save-recipe' // スタイル付けのためのクラス
      saveButton.style.marginTop = '10px' // ボタンの上に少し余白を追加
      saveButton.onclick = async () => {
        try {
          await window.api.addRecipe({
            title,
            content,
            ingredients: JSON.stringify(ingredients)
          })
          saveButton.textContent = '保存しました'
          saveButton.disabled = true
          saveButton.style.backgroundColor = '#ccc'
          saveButton.style.cursor = 'default'
        } catch (error) {
          console.error(error)
          alert('レシピの保存に失敗しました。')
        }
      }
      messageDiv.appendChild(saveButton)
    } else {
      // ユーザーやシステムメッセージ、ローディング中はそのままテキストとして表示
      messageDiv.innerText = typeof data === 'string' ? data : JSON.stringify(data)
    }
    chatMessagesArea.appendChild(messageDiv)
    return messageDiv.id
  }

  function removeMessage(id) {
    const el = document.getElementById(id)
    if (el) el.remove()
  }
}

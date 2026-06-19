// ------------------------------
// レシピ提案（AIチャット）画面の処理
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupRecipeChatHandler();
});

function setupRecipeChatHandler() {
  const chatForm = document.querySelector('.js-recipe-form'); // 送信フォーム
  const chatInput = document.querySelector('.js-recipe-input'); // テキスト入力欄
  const chatMessagesArea = document.querySelector('.js-recipe-messages'); // メッセージの表示エリア

  if (!chatForm || !chatInput || !chatMessagesArea) return;

  // これまでの会話のやり取り（文脈）を保存する配列
  let chatHistory = [];

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const userText = chatInput.value.trim();
    if (!userText) return;

    // 1. ユーザーのメッセージを画面に表示して入力欄を空にする
    appendMessage(userText, 'user');
    chatInput.value = '';

    // 2. 履歴にユーザーの発言を追加
    chatHistory.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    // 3. ローディング表示を出す
    const loadingId = appendMessage('AIがレシピを考え中...', 'ai', true);

    try {
      // 4. 設定画面で保存したAPIキーを取得
      const apiKey = await window.api.getApiKey();
      if (!apiKey) {
        removeMessage(loadingId);
        appendMessage('APIキーが設定されていません。設定画面からGeminiのAPIキーを保存してください。', 'system');
        return;
      }

      // 5. GeminiのAPIを直接呼び出してチャットする（Gemini 1.5 Flashを使用）
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: chatHistory,
          // system_instructionでAIのキャラクター付けをします
          system_instruction: {
            parts: [{ text: "あなたはプロの料理研究家です。ユーザーが持っている食材を使った美味しくて作りやすいレシピを提案してください。返答は親しみやすいトーンでお願いします。" }]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`APIリクエストに失敗しました: ${response.status}`);
      }

      const data = await response.json();
      const aiResponseText = data.candidates[0].content.parts[0].text;

      // 6. ローディングを消してAIの回答を表示
      removeMessage(loadingId);
      appendMessage(aiResponseText, 'ai');

      // 7. 履歴にAIの回答を追加
      chatHistory.push({
        role: 'model',
        parts: [{ text: aiResponseText }]
      });

    } catch (error) {
      console.error('Gemini APIエラー:', error);
      removeMessage(loadingId);
      appendMessage('エラーが発生しました。APIキーが正しいか確認してください。', 'system');
    }
  });

  // --- メッセージを画面に追加する補助関数 ---
  function appendMessage(text, sender, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${sender}`; // CSS装飾用クラス
    if (isLoading) {
      messageDiv.id = `loading-${Date.now()}`;
      messageDiv.style.opacity = '0.5';
    }
    messageDiv.innerText = text;
    chatMessagesArea.appendChild(messageDiv);
    return messageDiv.id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}
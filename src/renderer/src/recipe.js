import { marked } from 'marked';
// ------------------------------
// レシピ提案（AIチャット）画面の処理
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupRecipeChatHandler();
});

function setupRecipeChatHandler() {
  const chatForm = document.querySelector('.js-recipe-form');
  const chatInput = document.querySelector('.js-recipe-input');
  const chatMessagesArea = document.querySelector('.js-recipe-messages');

  if (!chatForm || !chatInput || !chatMessagesArea) return;

  // これまでの会話のやり取り（文脈）を保存する配列
  let chatHistory = [];

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const userText = chatInput.value.trim();
    if (!userText) return;

    // 1. ユーザー発言の表示と追加
    appendMessage(userText, 'user');
    chatInput.value = '';

    // 履歴にユーザーの発言を追加
    chatHistory.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    // 2. ローディング表示
    const loadingId = appendMessage('AIがレシピを考え中...', 'ai', true);

    try {
      // 3. DBから現在の食材リストを取得
      const ingredients = await window.api.getIngredients();
      let ingredientsPrompt = '現在、冷蔵庫には以下の食材があります。この情報も踏まえてレシピを提案してください。\n\n';
      if (ingredients.length > 0) {
        ingredients.forEach(item => {
          ingredientsPrompt += `- ${item.name} (${item.amount}${item.unit || ''}) ${item.type}: ${item.deadline}\n`;
        });
      } else {
        ingredientsPrompt += '現在、登録されている食材はありません。\n';
      }

      // 4. メインプロセスに「現在の食材リスト」「会話履歴」を投げて、結果を待つ
      //（APIキーはrenderer側には見えない）
      const result = await window.api.sendRecipeChat(ingredientsPrompt, chatHistory);

      removeMessage(loadingId);

      if (!result.success) {
        if (result.error === 'API_KEY_NOT_FOUND') {
          appendMessage('APIキーが設定されていません。設定画面から保存してください。', 'system');
        } else if (result.error === 'API_KEY_INVALID') {
          appendMessage('APIキーが正しくありません。設定画面から正しいキーを保存してください。', 'system');
        } else {
          appendMessage('エラーが発生しました。時間を置いて試すか、APIキーを確認してください。', 'system');
        }
        return;
      }

      // 5. AIの回答を表示して履歴に追加
      appendMessage(result.text, 'ai');
      chatHistory.push({
        role: 'model', // SDKを使う場合、AI側のroleは 'model' にします
        parts: [{ text: result.text }]
      });

    } catch (error) {
      console.error(error);
      removeMessage(loadingId);
      appendMessage('通信エラーが発生しました。', 'system');
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

    if (sender === 'ai' && !isLoading) {
      // AIからの返答はMarkdownとしてパースしてHTMLに変換
      messageDiv.innerHTML = marked.parse(text);

      // 「このレシピを保存する」ボタンを作成
      const saveButton = document.createElement('button');
      saveButton.textContent = 'このレシピを保存する';
      saveButton.className = 'btn-save-recipe'; // スタイル付けのためのクラス
      saveButton.style.marginTop = '5px'; // ボタンの上に少し余白を追加
      saveButton.onclick = () => {
        // とりあえずコンソールにログを出すモック実装
        console.log('レシピ保存ボタンがクリックされました');
        alert('レシピの保存機能は現在準備中です。');
      };
      messageDiv.appendChild(saveButton);
    } else {
      // ユーザーやシステムメッセージ、ローディング中はそのままテキストとして表示
      messageDiv.innerText = text;
    }
    chatMessagesArea.appendChild(messageDiv);
    return messageDiv.id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
}
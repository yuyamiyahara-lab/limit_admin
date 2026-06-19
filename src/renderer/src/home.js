// ------------------------------
// ホーム画面の処理
// ------------------------------

// 画面が読み込まれたらリストを表示する
document.addEventListener('DOMContentLoaded', () => {
  renderHomeFoodList();
});

// 他の画面（追加・管理画面など）でもリストの再描画を行うために export しておく
export async function renderHomeFoodList() {
  // ホーム画面の表示先コンテナ
  const container = document.querySelector('.food-list__items');
  if (!container) return;

  try {
    const ingredients = await window.api.getIngredients();
    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ★ サマリー用のカウント変数
    let expiringCount = 0;
    const totalCount = ingredients.length;

    ingredients.forEach(item => {
      // 日数計算
      const deadlineDate = new Date(item.deadline);
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // ★ 3日以内（マイナス＝超過も含む）ならカウントアップ
      if (diffDays <= 3) {
        expiringCount++;
      }

      // 残り日数の表示テキスト
      let daysLeftText = '';
      if (diffDays < 0) {
        daysLeftText = `${Math.abs(diffDays)}日超過`;
      } else {
        daysLeftText = `あと${diffDays}日`;
      }

      const cardHTML = `
        <div class="card">
          <div class="card__meta">
            <div class="card__name">${item.name}</div>
            <div class="card__deadline">${item.type}: ${item.deadline}</div>
          </div>
          <div class="card__amount">${item.amount}${item.unit}</div>
          <div class="card__days-left">${daysLeftText}</div>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', cardHTML);
    });

    // ★ ループが終わったら画面上部のサマリー数値を更新
    const expiringElement = document.getElementById('expiring-count');
    const registeredElement = document.getElementById('registered-count');
    
    if (expiringElement) expiringElement.textContent = expiringCount;
    if (registeredElement) registeredElement.textContent = totalCount;

  } catch (error) {
    console.error('データの取得に失敗しました:', error);
  }
}
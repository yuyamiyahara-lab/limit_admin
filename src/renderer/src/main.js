import '../assets/main.scss'
import 'simplebar';
import 'simplebar/dist/simplebar.css';

// ------------------------------
// サイドバーの処理
// ------------------------------

// 1. 必要な要素をすべて取得する
const navButtons = document.querySelectorAll('.sidebar__nav-btn');
const screens = document.querySelectorAll('main > div'); // main直下の画面div

// 2. すべてのボタンにクリックイベントを設定
navButtons.forEach(button => {
  button.addEventListener('click', () => {
    
    // ① ボタンのactiveクラスを切り替える
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // ② data-targetから対応する画面のクラス名を特定する
    // 例: "view-home" -> "screen-home"
    const targetId = button.getAttribute('data-target');
    const screenClass = targetId.replace('view-', 'screen-');

    // ③ すべての画面を inactive にし、対象の画面だけを active にする
    screens.forEach(screen => {
      if (screen.classList.contains(screenClass)) {
        screen.classList.remove('inactive');
        screen.classList.add('active');
      } else {
        screen.classList.remove('active');
        screen.classList.add('inactive');
      }
    });

  });
});

// ------------------------------
// ホーム画面の処理
// ------------------------------

// 画面が読み込まれたらリストを表示する
document.addEventListener('DOMContentLoaded', () => {
  renderFoodList();
});

async function renderFoodList() {
  // 表示先となるコンテナ要素を取得
  const container = document.querySelector('.food-list__items');
  if (!container) return;

  try {
    // preload.js（window.api）を経由してDBからデータを取得（デフォルトは期限が近い順）
    const ingredients = await window.api.getIngredients();

    // まずコンテナの中身を空にする（再描画時の重複を防ぐため）
    container.innerHTML = '';

    // 今日の日付を取得（時間部分は切り捨てて0時0分0秒にする）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 取得した食材データの数だけループしてカードを生成
    ingredients.forEach(item => {
      // 1. 残り日数を計算する
      const deadlineDate = new Date(item.deadline);
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // ミリ秒を日数に変換

      // 残り日数の表示テキストを条件分岐
      let daysLeftText = '';
      if (diffDays < 0) {
        daysLeftText = `${Math.abs(diffDays)}日超過`;
      } else {
        daysLeftText = `あと${diffDays}日`;
      }

      // 2. HTMLのテンプレート文字列にデータを埋め込む
      const cardHTML = `
        <div class="card">
          <div class="card__meta">
            <div class="card__name">${item.name}</div>
            <div class="card__deadline">${item.type}期限: ${item.deadline}</div>
          </div>
          <div class="card__amount">${item.amount}${item.unit}</div>
          <div class="card__days-left">${daysLeftText}</div>
        </div>
      `;

      // 3. コンテナに生成したカードを追加する
      container.insertAdjacentHTML('beforeend', cardHTML);
    });

  } catch (error) {
    console.error('データの取得に失敗しました:', error);
  }
}

// ------------------------------
// 食材追加画面の処理
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupFormHandler();
});

function setupFormHandler() {
  // 追加フォームをクラス名で狙い撃ちして取得
  const form = document.querySelector('.js-add-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // フォーム内の全入力データを一撃でオブジェクトに変換する裏ワザ
    // これを使うと、form内の name="name" や name="amount" が自動で集まります
    const formData = new FormData(form);

    const ingredientData = {
      name: formData.get('name'),
      amount: parseFloat(formData.get('amount')), // 数値に変換
      unit: formData.get('unit'),
      deadline: formData.get('deadline'),
      type: formData.get('type'),
      remarks: formData.get('notes')
    };

    try {
      const newId = await window.api.addIngredient(ingredientData);
      console.log('保存完了:', newId);

      form.reset();
      renderFoodList();
    } catch (error) {
      console.error('保存失敗:', error);
    }
  });
}

// ------------------------------
// 食材編集画面の処理
// ------------------------------

// ------------------------------
// レシピ提案画面の処理
// ------------------------------
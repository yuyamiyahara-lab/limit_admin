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
  renderHomeFoodList();
});

async function renderHomeFoodList() {
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

// ------------------------------
// 食材追加画面の処理
// ------------------------------

// よく追加するものの編集モード状態
let isEditingFrequent = false;

document.addEventListener('DOMContentLoaded', () => {
  setupFormHandler();
  renderFrequentItems();
  setupFrequentModalHandler();
  setupFrequentEditHandler();
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
      renderHomeFoodList();
      renderMiniFoodList();
    } catch (error) {
      console.error('保存失敗:', error);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderMiniFoodList();
});

async function renderMiniFoodList() {
  // 追加画面の表示先コンテナ
  const container = document.querySelector('.mini-food-list__items');
  if (!container) return;

  try {
    const ingredients = await window.api.getIngredients();
    container.innerHTML = '';

    ingredients.forEach((item, index) => {
      // 日数計算
      const deadlineDate = new Date(item.deadline);
      if (index < 5) {
        const cardHTML = `
            <div class="card">
                <div class="card__name">${item.name}</div>
                <div class="card__amount">${item.amount}${item.unit}</div>
                <div class="card__deadline">${item.deadline}まで</div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);
      }
    });

  } catch (error) {
    console.error('データの取得に失敗しました:', error);
  }
}

// 1. よく追加するもののボタンリストを描画＆メインフォーム連動
async function renderFrequentItems() {
  const container = document.getElementById('frequent-items-container');
  const openModalBtn = document.getElementById('js-open-frequent-modal-btn');
  if (!container || !openModalBtn) return;

  try {
    const frequents = await window.api.getFrequents();

    // 既存の動的ボタンをクリア
    const oldButtons = container.querySelectorAll('button:not(#js-open-frequent-modal-btn)');
    oldButtons.forEach(btn => btn.remove());

    frequents.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frequent-item-btn';
      btn.textContent = item.name;

      // 食材ボタンがクリックされたときの処理（編集状態によって分岐）
      btn.addEventListener('click', async () => {
        if (isEditingFrequent) {
          // 編集中なら削除処理を行う
          const confirmDelete = confirm(`「${item.name}」をよく追加するものから削除しますか？`);
          if (confirmDelete) {
            try {
              // メインプロセス経由でデータベースから削除する（※バックエンドの実装が必要です）
              await window.api.deleteFrequent(item.id);
              console.log(`${item.name} を削除しました`);
              renderFrequentItems(); // ボタン一覧を再描画して最新状態に更新
            } catch (error) {
              console.error('削除失敗:', error);
              alert('削除に失敗しました。');
            }
          }
        } else {
          // 通常時は下のメイン追加フォームに自動補完する
          const mainForm = document.querySelector('.js-add-form');
          if (!mainForm) return;
  
          // 名前・量・単位・種類をそれぞれセット！
          mainForm.querySelector('[name="name"]').value = item.name;
          mainForm.querySelector('[name="amount"]').value = item.amount !== null ? item.amount : '';
          mainForm.querySelector('[name="unit"]').value = item.unit || '';
          mainForm.querySelector('[name="type"]').value = item.type || '賞味期限';
          
          // 次に入力すべき「期限」にフォーカスを当てる
          mainForm.querySelector('[name="deadline"]').focus();
        }
      });

      // 「＋ 登録」ボタンの手前に挿入（末尾固定）
      container.insertBefore(btn, openModalBtn);
    });

  } catch (error) {
    console.error('よく追加するものの取得に失敗しました:', error);
  }
}

// 2 & 3. 【新設計】専用フォーム（モーダル）の開閉と送信処理
function setupFrequentModalHandler() {
  const openBtn = document.getElementById('js-open-frequent-modal-btn');
  const closeBtn = document.querySelector('.js-close-frequent-modal-btn');
  const modal = document.querySelector('.js-frequent-modal');
  const frequentForm = document.querySelector('.js-frequent-form');

  if (!modal || !frequentForm) return;

  // 「＋ 登録」ボタンで専用フォームを開く
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('inactive'); // 表示する
    });
  }

  // キャンセルボタンで閉じる
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      frequentForm.reset();
      modal.classList.add('inactive'); // 非表示にする
    });
  }

  // 専用フォームの送信（マスターへの登録処理）
  frequentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 専用フォーム内のデータをname属性を使って収集
    const formData = new FormData(frequentForm);
    const name = formData.get('name');
    const amountVal = formData.get('amount');
    const unit = formData.get('unit');
    const type = formData.get('type');

    const frequentData = {
      name: name,
      amount: amountVal ? parseFloat(amountVal) : null,
      unit: unit || null,
      type: type
    };

    try {
      // データベースへ保存！
      await window.api.addFrequent(frequentData);
      console.log(`マスターに「${name}」を登録しました。`);

      // 後片付け
      frequentForm.reset(); // 入力欄を綺麗に
      modal.classList.add('inactive'); // フォームを閉じる
      
      // 上のボタン一覧を再描画（今登録したのが即座に並びます）
      renderFrequentItems();

    } catch (error) {
      console.error('よく追加するものの登録に失敗しました:', error);
      alert('登録に失敗しました。');
    }
  });
}

// 4. 編集ボタンでの削除モード切り替え処理
function setupFrequentEditHandler() {
  const editBtn = document.querySelector('.screen-add__frequent-edit');
  if (!editBtn) return;

  // 「編集中」テキスト用要素を生成
  const editingTextSpan = document.createElement('span');
  editingTextSpan.textContent = '編集中';
  editingTextSpan.style.display = 'none';
  editingTextSpan.style.color = '#DF5656'; // 赤色など目立つように設定
  editingTextSpan.style.fontWeight = 'bold';
  editingTextSpan.style.marginRight = '10px';

  // 編集ボタンの直前（同じ親要素内）に挿入
  editBtn.parentNode.insertBefore(editingTextSpan, editBtn);

  editBtn.addEventListener('click', () => {
    isEditingFrequent = !isEditingFrequent; // 状態を反転させる

    if (isEditingFrequent) {
      // 編集モードをONにする
      editBtn.textContent = '完了';
      editingTextSpan.style.display = 'inline'; // 「編集中」を表示
    } else {
      // 編集モードをOFFに戻す
      editBtn.textContent = '編集';
      editingTextSpan.style.display = 'none'; // 「編集中」を隠す
    }
  });
}
// ------------------------------
// 食材編集画面の処理
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderManageFoodList();
  setupManageSortHandler();
});

// 管理画面のリスト描画関数
async function renderManageFoodList(sortBy = 'deadline') {
  const container = document.getElementById('manage-food-list');
  if (!container) return;

  try {
    const ingredients = await window.api.getIngredients(sortBy);
    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    ingredients.forEach(item => {
      const deadlineDate = new Date(item.deadline);
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let daysLeftText = '';
      if (diffDays < 0) {
        daysLeftText = `${Math.abs(diffDays)}日超過`;
      } else {
        daysLeftText = `あと${diffDays}日`;
      }

      const noteHTML = item.remarks ? `<div class="card__note">${item.remarks}</div>` : '';
      const itemDataJson = JSON.stringify(item).replace(/"/g, '&quot;');

      const cardHTML = `
        <div class="card" id="card-${item.id}" data-item="${itemDataJson}">
          <div class="card__meta">
            <div class="card__name">${item.name}</div>
            <div class="card__deadline">${item.type}: ${item.deadline}</div>
          </div>
          <div class="card__amount">${item.amount}${item.unit}</div>
          
          <div class="card__actions">
            <div class="card__menu"><button class="js-edit-btn">編集</button></div>
            <div class="card__delete"><button class="js-delete-btn" data-id="${item.id}" data-name="${item.name}">削除</button></div>
            <div class="card__pulldown"></div>
          </div>
          
          ${noteHTML}
        </div>
      `;

      container.insertAdjacentHTML('beforeend', cardHTML);
    });

    // 編集ボタンのイベント
    attachEditEventListeners();
    
    // 削除ボタンのイベントを設定する
    attachDeleteEventListeners();

  } catch (error) {
    console.error('管理画面のデータ取得に失敗しました:', error);
  }
}

// 編集ボタンのクリックを監視する関数
function attachEditEventListeners() {
  const editButtons = document.querySelectorAll('.js-edit-btn');
  
  editButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      // クリックされたボタンから、一番近い親要素の「.card」を取得
      const card = event.target.closest('.card');
      // 仕込んでおいた食材のデータを復元
      const item = JSON.parse(card.getAttribute('data-item'));

      // カードの中身をご提示いただいた「編集用フォーム」に書き換える！
      // 各インプットに value="${item.◯◯}" を仕込んで、現在の値を初期表示させます
      card.innerHTML = `
        <div class="form__container">
          <form class="js-edit-form">
            <input type="hidden" name="id" value="${item.id}">

            <div class="form__group--full">
              <label class="label">食材名</label>
              <input type="text" name="name" value="${item.name}" required>
            </div>

            <div class="form--row">
              <div class="form__group">
                <label class="label">量</label>
                <input type="number" name="amount" min="0" step="any" value="${item.amount}" required>
              </div>

              <div class="form__group">
                <label class="label">単位</label>
                <input type="text" name="unit" value="${item.unit || ''}">
              </div>

              <div class="form__group">
                <label class="label">期限</label>
                <input type="date" name="deadline" value="${item.deadline}" required>
              </div>

              <div class="form__group">
                <label class="label"></label>
                <select name="type">
                  <option value="賞味期限" ${item.type === '賞味期限' ? 'selected' : ''}>賞味期限</option>
                  <option value="消費期限" ${item.type === '消費期限' ? 'selected' : ''}>消費期限</option>
                </select>
              </div>
            </div>

            <div class="form__group--full">
              <label class="label">備考</label>
              <textarea name="notes" placeholder="メモや補足（例：冷凍保存中、早めに使うなど）">${item.remarks || ''}</textarea>
            </div>

            <button type="submit" class="form__submit">完了</button>
          </form>
        </div>
      `;

      // 変身したフォームの「完了（送信）」イベントを監視する
      setupEditFormHandler(card);
    });
  });
}

// 変身後の編集フォームが送信されたときの処理
function setupEditFormHandler(cardElement) {
  const form = cardElement.querySelector('.js-edit-form');
  
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // id属性に頼らず、フォーム内のデータからnameを使って一撃で集める作戦（大成功です！）
    const formData = new FormData(form);

    const updatedData = {
      id: parseInt(formData.get('id')), // hiddenから取得したID
      name: formData.get('name'),
      amount: parseFloat(formData.get('amount')),
      unit: formData.get('unit'),
      deadline: formData.get('deadline'),
      type: formData.get('type'),
      remarks: formData.get('notes')
    };

    try {
      // データベースを更新！
      const success = await window.api.updateIngredient(updatedData);
      
      if (success) {
        console.log('データの更新に成功しました！');
        // 現在の並び順の設定を引き継ぎたいので、管理画面用のプルダウンから現在の値を取得して再描画
        const currentSort = document.getElementById('manage-sort-order')?.value || 'deadline';
        renderManageFoodList(currentSort);
        
        // 合わせてホーム画面のリスト（先頭5件）も最新の状態に更新しておく
        renderHomeFoodList();
      }
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新に失敗しました。');
    }
  });
}

// 削除ボタンのクリックを監視する関数
function attachDeleteEventListeners() {
  const deleteButtons = document.querySelectorAll('.js-delete-btn');
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      // ボタンに仕込んだIDと食材名を取得
      const id = parseInt(event.target.getAttribute('data-id'));
      const name = event.target.getAttribute('data-name');

      // ユーザーに確認する（誤操作防止）
      const confirmDelete = confirm(`「${name}」をリストから削除してもよろしいですか？`);
      
      if (confirmDelete) {
        try {
          // preload.js経由でメインプロセスへ削除を依頼
          const success = await window.api.deleteIngredient(id);
          
          if (success) {
            console.log(`${name} を削除しました。`);
            
            // 削除が成功したら、現在の並び順を維持したまま管理画面を再描画
            const currentSort = document.getElementById('manage-sort-order')?.value || 'deadline';
            renderManageFoodList(currentSort);
            
            // ホーム画面のリストとサマリー（カウント）も最新状態に更新！
            renderHomeFoodList();
          }
        } catch (error) {
          console.error('削除失敗:', error);
          alert('削除に失敗しました。');
        }
      }
    });
  });
}

// ------------------------------
// レシピ提案画面の処理
// ------------------------------
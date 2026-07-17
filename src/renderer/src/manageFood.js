import { renderHomeFoodList } from './home.js';

// ------------------------------
// 食材編集画面の処理
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
  renderManageFoodList();
  if (typeof setupManageSortHandler === 'function') {
    setupManageSortHandler();
  } else if (typeof window.setupManageSortHandler === 'function') {
    window.setupManageSortHandler();
  }
});

// 表示順の更新を監視
const select = document.getElementById('manage-sort-order');
if (select) {
  select.addEventListener('change', (event) => {
    const currentSort = event.target?.value || 'deadline';
    renderManageFoodList(currentSort);
  });
}

// 管理画面のリスト描画関数
export async function renderManageFoodList(sortBy = 'deadline') {
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

      const noteHTML = item.remarks ? `<div class="card__note"><div class='card__notetitle'>備考</div>${item.remarks}</div>`
                                      : `<div class="card__note"><div class='card__notetitle'>備考</div></div>`;
      const itemDataJson = JSON.stringify(item).replace(/"/g, '&quot;');

      const cardHTML = `
        <div class="card__wrap">
          <div class="card" id="card-${item.id}" data-item="${itemDataJson}">
            <div class="card__meta">
              <div class="card__name">${item.name}</div>
              <div class="card__deadline">${item.type}: ${item.deadline}</div>
            </div>
            <div class="card__amount">${item.amount}${item.unit}</div>
            
            <div class="card__actions">
              <div class="card__delete"><button class="js-delete-btn" data-id="${item.id}" data-name="${item.name}"><img src="./assets/images/trash-icon.svg"></button></div>
              <div class="card__menu"><button class="js-edit-btn">⋯</button></div>
              <div class="card__pulldown"><button class="js-pulldown-btn"><img src="./assets/images/pulldown-icon.svg"></button></div>
            </div>
          </div>
          
          ${noteHTML}
        </div>
      `;

      container.insertAdjacentHTML('beforeend', cardHTML);

      const card = container.lastElementChild.querySelector('.card');

      if (diffDays <= 3) {
        card.classList.remove('is_warning');
        card.classList.add('is_alert');
      } else if (diffDays <= 7) {
        card.classList.remove('is_alert');
        card.classList.add('is_warning');
      } else {
        card.classList.remove('is_alert', 'is_warning');
      }
    });

    // 編集ボタンのイベント
    attachEditEventListeners();
    
    // 削除ボタンのイベント
    attachDeleteEventListeners();

    // プルダウンボタンのイベント
    attachPulldownEventListeners();

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

    const formData = new FormData(form);

    const updatedData = {
      id: parseInt(formData.get('id')),
      name: formData.get('name'),
      amount: parseFloat(formData.get('amount')),
      unit: formData.get('unit'),
      deadline: formData.get('deadline'),
      type: formData.get('type'),
      remarks: formData.get('notes')
    };

    try {
      const success = await window.api.updateIngredient(updatedData);
      
      if (success) {
        console.log('データの更新に成功しました！');
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
      const id = parseInt(event.currentTarget.getAttribute('data-id'));
      const name = event.currentTarget.getAttribute('data-name');

      const confirmDelete = confirm(`「${name}」をリストから削除してもよろしいですか？`);
      
      if (confirmDelete) {
        try {
          const success = await window.api.deleteIngredient(id);
          
          if (success) {
            console.log(`${name} を削除しました。`);
            
            const currentSort = document.getElementById('manage-sort-order')?.value || 'deadline';
            renderManageFoodList(currentSort);
            
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

// プルダウンボタンのクリックを監視する関数
function attachPulldownEventListeners() {
  const pulldownButtons = document.querySelectorAll('.js-pulldown-btn');
  
  pulldownButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      const wrap = event.currentTarget.closest('.card__wrap');
      const note = wrap.querySelector('.card__note');
      note.classList.toggle('open');
    });
  });
}
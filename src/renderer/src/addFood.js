import { renderHomeFoodList } from './home.js'
import { renderManageFoodList } from './manageFood.js'

// ------------------------------
// 食材追加画面の処理
// ------------------------------

// よく追加するものの編集モード状態
let isEditingFrequent = false

document.addEventListener('DOMContentLoaded', () => {
  setupFormHandler()
  renderFrequentItems()
  setupFrequentModalHandler()
  setupFrequentEditHandler()
  renderMiniFoodList()
  setupReceiptReaderHandler()
})

function setupFormHandler() {
  // 追加フォームをクラス名で狙い撃ちして取得
  const form = document.querySelector('.js-add-form')
  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    // フォーム内の全入力データを一撃でオブジェクトに変換する裏ワザ
    const formData = new FormData(form)

    const ingredientData = {
      name: formData.get('name'),
      amount: parseFloat(formData.get('amount')), // 数値に変換
      unit: formData.get('unit'),
      deadline: formData.get('deadline'),
      type: formData.get('type'),
      remarks: formData.get('notes')
    }

    try {
      const newId = await window.api.addIngredient(ingredientData)
      console.log('保存完了:', newId)

      form.reset()
      renderHomeFoodList()
      renderMiniFoodList()
      const currentSort = document.getElementById('manage-sort-order')?.value || 'deadline'
      renderManageFoodList(currentSort)
    } catch (error) {
      console.error('保存失敗:', error)
    }
  })
}

async function renderMiniFoodList() {
  // 追加画面の表示先コンテナ
  const container = document.querySelector('.mini-food-list__items')
  if (!container) return

  try {
    const ingredients = await window.api.getIngredients()
    container.innerHTML = ''

    ingredients.forEach((item, index) => {
      // 日数計算
      const deadlineDate = new Date(item.deadline)
      if (index < 5) {
        const cardHTML = `
            <div class="card">
                <div class="card__name">${item.name}</div>
                <div class="card__amount">${item.amount}${item.unit}</div>
                <div class="card__deadline">${item.deadline}まで</div>
            </div>
        `

        container.insertAdjacentHTML('beforeend', cardHTML)
      }
    })
  } catch (error) {
    console.error('データの取得に失敗しました:', error)
  }
}

// 1. よく追加するもののボタンリストを描画＆メインフォーム連動
async function renderFrequentItems() {
  const container = document.getElementById('frequent-items-container')
  const openModalBtn = document.getElementById('js-open-frequent-modal-btn')
  if (!container || !openModalBtn) return

  try {
    const frequents = await window.api.getFrequents()

    // 既存の動的ボタンをクリア
    const oldButtons = container.querySelectorAll('button:not(#js-open-frequent-modal-btn)')
    oldButtons.forEach((btn) => btn.remove())

    frequents.forEach((item) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'frequent-item-btn'
      btn.textContent = item.name

      // 食材ボタンがクリックされたときの処理（編集状態によって分岐）
      btn.addEventListener('click', async () => {
        if (isEditingFrequent) {
          // 編集中なら削除処理を行う
          const confirmDelete = confirm(`「${item.name}」をよく追加するものから削除しますか？`)
          if (confirmDelete) {
            try {
              await window.api.deleteFrequent(item.id)
              console.log(`${item.name} を削除しました`)
              renderFrequentItems() // ボタン一覧を再描画して最新状態に更新
            } catch (error) {
              console.error('削除失敗:', error)
              alert('削除に失敗しました。')
            }
          }
        } else {
          // 通常時は下のメイン追加フォームに自動補完する
          const mainForm = document.querySelector('.js-add-form')
          if (!mainForm) return

          // 名前・量・単位・種類をそれぞれセット！
          mainForm.querySelector('[name="name"]').value = item.name
          mainForm.querySelector('[name="amount"]').value = item.amount !== null ? item.amount : ''
          mainForm.querySelector('[name="unit"]').value = item.unit || ''
          mainForm.querySelector('[name="type"]').value = item.type || '賞味期限'

          // 次に入力すべき「期限」にフォーカスを当てる
          mainForm.querySelector('[name="deadline"]').focus()
        }
      })

      // 「＋ 登録」ボタンの手前に挿入（末尾固定）
      container.insertBefore(btn, openModalBtn)
    })
  } catch (error) {
    console.error('よく追加するものの取得に失敗しました:', error)
  }
}

// 2 & 3. 【新設計】専用フォーム（モーダル）の開閉と送信処理
function setupFrequentModalHandler() {
  const openBtn = document.getElementById('js-open-frequent-modal-btn')
  const closeBtn = document.querySelector('.js-close-frequent-modal-btn')
  const modal = document.querySelector('.js-frequent-modal')
  const frequentForm = document.querySelector('.js-frequent-form')

  if (!modal || !frequentForm) return

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('inactive')
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      frequentForm.reset()
      modal.classList.add('inactive')
    })
  }

  frequentForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const formData = new FormData(frequentForm)
    const name = formData.get('name')
    const amountVal = formData.get('amount')
    const unit = formData.get('unit')
    const type = formData.get('type')

    const frequentData = {
      name: name,
      amount: amountVal ? parseFloat(amountVal) : null,
      unit: unit || null,
      type: type
    }

    try {
      await window.api.addFrequent(frequentData)
      console.log(`マスターに「${name}」を登録しました。`)

      frequentForm.reset()
      modal.classList.add('inactive')

      renderFrequentItems()
    } catch (error) {
      console.error('よく追加するものの登録に失敗しました:', error)
      alert('登録に失敗しました。')
    }
  })
}

// 4. 編集ボタンでの削除モード切り替え処理
function setupFrequentEditHandler() {
  const editBtn = document.querySelector('.screen-add__frequent-edit')
  if (!editBtn) return

  const container = document.getElementById('frequent-items-container')

  const editingTextSpan = document.createElement('span')
  editingTextSpan.textContent = '編集中'
  editingTextSpan.style.display = 'none'
  editingTextSpan.style.color = '#DF5656'
  editingTextSpan.style.fontWeight = 'bold'
  editingTextSpan.style.marginRight = '10px'

  editBtn.parentNode.insertBefore(editingTextSpan, editBtn)

  editBtn.addEventListener('click', () => {
    isEditingFrequent = !isEditingFrequent

    if (isEditingFrequent) {
      editBtn.textContent = '完了'
      editingTextSpan.style.display = 'inline'

      if (container) container.classList.add('is-editing')
    } else {
      editBtn.textContent = '編集'
      editingTextSpan.style.display = 'none'

      if (container) container.classList.remove('is-editing')
    }
  })
}

function setupReceiptReaderHandler() {
  const uploadBtn = document.getElementById('js-receipt-upload-btn')
  const fileInput = document.getElementById('js-receipt-file-input')
  const loadingText = document.querySelector('.js-receipt-loading')
  const itemsContainer = document.querySelector('.js-receipt-items-container')

  if (!uploadBtn || !fileInput || !loadingText || !itemsContainer) return

  uploadBtn.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0]
    if (!file) return

    loadingText.classList.remove('inactive')
    itemsContainer.innerHTML = ''

    try {
      const { base64Data, mimeType } = await fileToBase64(file)
      const result = await window.api.analyzeReceipt(base64Data, mimeType)

      loadingText.classList.add('inactive')

      if (!result.success) {
        if (result.error === 'API_KEY_NOT_FOUND') {
          alert('APIキーが設定されていません。設定画面から保存してください。')
        } else if (result.error === 'API_KEY_INVALID') {
          alert('APIキーが正しくありません。設定画面から正しいキーを保存してください。')
        } else {
          alert(`解析に失敗しました: ${result.error}`)
        }
        return
      }

      const items = result.data.items || []
      if (items.length === 0) {
        alert('レシートから食材を検出できませんでした。別の画像をお試しください。')
        return
      }

      items.forEach((item) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'receipt-item-btn'
        btn.textContent = `${item.name} (${item.amount}${item.unit || ''})`

        btn.addEventListener('click', () => {
          const mainForm = document.querySelector('.js-add-form')
          if (!mainForm) return

          mainForm.querySelector('[name="name"]').value = item.name
          mainForm.querySelector('[name="amount"]').value = item.amount
          mainForm.querySelector('[name="unit"]').value = item.unit || ''
          mainForm.querySelector('[name="type"]').value = item.type || '賞味期限'

          const deadlineInput = mainForm.querySelector('[name="deadline"]')
          if (deadlineInput) {
            const today = new Date()
            today.setDate(today.getDate() + (item.daysLimit || 0))

            const yyyy = today.getFullYear()
            const mm = String(today.getMonth() + 1).padStart(2, '0')
            const dd = String(today.getDate()).padStart(2, '0')
            deadlineInput.value = `${yyyy}-${mm}-${dd}`

            deadlineInput.focus()
          }
        })

        itemsContainer.appendChild(btn)
      })
    } catch (error) {
      console.error('レシート処理エラー:', error)
      loadingText.classList.add('inactive')
      alert('エラーが発生しました。ファイルの読み込みに失敗した可能性があります。')
    } finally {
      fileInput.value = ''
    }
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result
      const commaIndex = result.indexOf(',')
      const base64Data = result.substring(commaIndex + 1)
      const mimeType = file.type
      resolve({ base64Data, mimeType })
    }
    reader.onerror = (error) => reject(error)
  })
}

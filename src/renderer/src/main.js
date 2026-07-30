import '../assets/main.scss'
import 'simplebar'
import 'simplebar/dist/simplebar.css'

// window.alert と window.confirm をネイティブダイアログに差し替えて、入力不能になるバグを回避
if (window.api) {
  window.alert = (message) => {
    window.api.showAlert(message)
  }
  window.confirm = (message) => {
    return window.api.showConfirm(message)
  }
}

// 各画面の処理を別ファイルから読み込みます
import './sidebar.js'
import './home.js'
import './addFood.js'
import './manageFood.js'
import './settings.js'
import './recipe.js'
import './saved.js'

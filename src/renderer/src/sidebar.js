// ------------------------------
// サイドバーの処理
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // 1. 必要な要素をすべて取得する
  const navButtons = document.querySelectorAll('.sidebar__nav-btn, .sidebar__settings');
  const screens = document.querySelectorAll('main > div'); // main直下の画面div

  // 2. すべてのボタンにクリックイベントを設定
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 画面切り替え時に古い画面のフォーカスを解除する
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      // ① ボタンのactiveクラスを切り替える
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // ② data-targetから対応する画面のクラス名を特定する
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
});
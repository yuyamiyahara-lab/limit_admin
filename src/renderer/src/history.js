import { marked } from 'marked';

document.addEventListener('DOMContentLoaded', () => {
  setupHistoryHandlers();
});

function setupHistoryHandlers() {
  const goToHistoryBtn = document.querySelector('.js-go-to-history-btn');
  const backToRecipeBtn = document.querySelector('.js-back-to-recipe-btn');
  const recipeScreen = document.querySelector('.screen-recipe');
  const historyScreen = document.querySelector('.screen-history');

  if (goToHistoryBtn && recipeScreen && historyScreen) {
    goToHistoryBtn.addEventListener('click', () => {
      recipeScreen.classList.remove('active');
      recipeScreen.classList.add('inactive');
      historyScreen.classList.remove('inactive');
      historyScreen.classList.add('active');
      renderSavedRecipes();
    });
  }

  if (backToRecipeBtn && recipeScreen && historyScreen) {
    backToRecipeBtn.addEventListener('click', () => {
      historyScreen.classList.remove('active');
      historyScreen.classList.add('inactive');
      recipeScreen.classList.remove('inactive');
      recipeScreen.classList.add('active');
    });
  }
}

async function renderSavedRecipes() {
  const container = document.querySelector('.screen-history__cards');
  if (!container) return;

  try {
    const recipes = await window.api.getRecipes();
    container.innerHTML = '';

    if (recipes.length === 0) {
      container.innerHTML = '<p>保存されたレシピはありません。</p>';
      return;
    }

    recipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'card';

      // タイトル
      const titleEl = document.createElement('h3');
      titleEl.textContent = recipe.title;
      card.appendChild(titleEl);

      // 保存日時
      const dateEl = document.createElement('div');
      dateEl.textContent = `保存日時: ${recipe.created_at}`;
      dateEl.style.fontSize = '0.8em';
      dateEl.style.color = '#666';
      dateEl.style.marginBottom = '10px';
      card.appendChild(dateEl);

      // 食材
      if (recipe.ingredients) {
        try {
          const ingList = JSON.parse(recipe.ingredients);
          if (Array.isArray(ingList) && ingList.length > 0) {
            const ingEl = document.createElement('div');
            ingEl.textContent = `食材: ${ingList.join(', ')}`;
            ingEl.style.fontSize = '0.9em';
            ingEl.style.color = '#333';
            ingEl.style.marginBottom = '10px';
            card.appendChild(ingEl);
          }
        } catch (e) {
          console.error('Failed to parse ingredients JSON', e);
        }
      }

      // レシピ本文（Markdown）
      const contentEl = document.createElement('div');
      contentEl.innerHTML = marked.parse(recipe.content);
      card.appendChild(contentEl);

      // 削除ボタン
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '削除';
      
      deleteBtn.onclick = async () => {
        const confirmDelete = confirm(`「${recipe.title}」を削除してもよろしいですか？`);
        if (confirmDelete) {
          try {
            await window.api.deleteRecipe(recipe.id);
            renderSavedRecipes();
          } catch (error) {
            console.error('Failed to delete recipe:', error);
            alert('レシピの削除に失敗しました。');
          }
        }
      };
      card.appendChild(deleteBtn);

      container.appendChild(card);
    });

  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    container.innerHTML = '<p>レシピの読み込みに失敗しました。</p>';
  }
}

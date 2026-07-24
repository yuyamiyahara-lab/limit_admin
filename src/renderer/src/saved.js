import { marked } from 'marked';
import deleteIcon from '../assets/images/delete-icon.svg?url';


document.addEventListener('DOMContentLoaded', () => {
  setupSavedHandlers();
});

function setupSavedHandlers() {
  const goToSavedBtn = document.querySelector('.js-go-to-saved-btn');
  const backToRecipeBtn = document.querySelector('.js-back-to-recipe-btn');
  const backToSavedListBtn = document.querySelector('.js-back-to-saved-list-btn');
  const recipeScreen = document.querySelector('.screen-recipe');
  const savedListScreen = document.querySelector('.screen-saved-list');
  const savedScreen = document.querySelector('.screen-saved');

  if (goToSavedBtn && recipeScreen && savedListScreen) {
    goToSavedBtn.addEventListener('click', () => {
      recipeScreen.classList.remove('active');
      recipeScreen.classList.add('inactive');
      savedListScreen.classList.remove('inactive');
      savedListScreen.classList.add('active');
      renderSavedRecipes();
    });
  }

  if (backToRecipeBtn && recipeScreen && savedListScreen) {
    backToRecipeBtn.addEventListener('click', () => {
      savedListScreen.classList.remove('active');
      savedListScreen.classList.add('inactive');
      recipeScreen.classList.remove('inactive');
      recipeScreen.classList.add('active');
    });
  }

  if (backToSavedListBtn && savedListScreen && savedScreen) {
    backToSavedListBtn.addEventListener('click', () => {
      savedScreen.classList.remove('active');
      savedScreen.classList.add('inactive');
      savedListScreen.classList.remove('inactive');
      savedListScreen.classList.add('active');
      renderSavedRecipes();
    });
  }
}

async function renderSavedRecipes() {
  const container = document.querySelector('.screen-saved-list__cards');
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
      card.className = 'saved-card';
      card.style.cursor = 'pointer';

      // タイトル
      const titleEl = document.createElement('h4');
      titleEl.textContent = recipe.title;
      card.appendChild(titleEl);

      // 保存日時と削除ボタンをまとめるコンテナdiv
      const metaContainer = document.createElement('div');
      metaContainer.className = 'saved-card__meta';

      // 保存日時
      const dateEl = document.createElement('div');
      dateEl.textContent = `保存日: ${recipe.created_at.slice(0, 10)}`;
      metaContainer.appendChild(dateEl);

      // 削除ボタン
      const deleteBtn = document.createElement('button');
      const deleteIconImg = document.createElement('img');
      deleteIconImg.src = deleteIcon;
      deleteIconImg.alt = '削除';
      deleteBtn.appendChild(deleteIconImg);
      deleteBtn.onclick = async (event) => {
        event.stopPropagation(); // 詳細画面への遷移を防ぐ
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
      metaContainer.appendChild(deleteBtn);
      card.appendChild(metaContainer);

      // 食材
      if (recipe.ingredients) {
        try {
          const ingList = JSON.parse(recipe.ingredients);
          if (Array.isArray(ingList) && ingList.length > 0) {
            const ingEl = document.createElement('div');
            ingEl.className = 'saved-card__ingredients';
            ingEl.innerHTML = `<span>${ingList.join('</span><span>')}</span>`;
            card.appendChild(ingEl);
          }
        } catch (e) {
          console.error('Failed to parse ingredients JSON', e);
        }
      }

      // カードクリック時の詳細画面遷移
      card.addEventListener('click', () => {
        showRecipeDetail(recipe);
      });

      container.appendChild(card);
    });

  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    container.innerHTML = '<p>レシピの読み込みに失敗しました。</p>';
  }
}

function showRecipeDetail(recipe) {
  const savedListScreen = document.querySelector('.screen-saved-list');
  const savedScreen = document.querySelector('.screen-saved');

  if (savedListScreen && savedScreen) {
    savedListScreen.classList.remove('active');
    savedListScreen.classList.add('inactive');
    savedScreen.classList.remove('inactive');
    savedScreen.classList.add('active');

    const titleEl = savedScreen.querySelector('.js-saved-recipe-title');
    const dateEl = savedScreen.querySelector('.js-saved-recipe-date');
    const ingredientsEl = savedScreen.querySelector('.js-saved-recipe-ingredients');
    const bodyEl = savedScreen.querySelector('.js-saved-recipe-body');

    if (titleEl) titleEl.textContent = recipe.title;
    if (dateEl) dateEl.textContent = `保存日時: ${recipe.created_at}`;

    if (ingredientsEl) {
      ingredientsEl.textContent = '';
      if (recipe.ingredients) {
        try {
          const ingList = JSON.parse(recipe.ingredients);
          if (Array.isArray(ingList) && ingList.length > 0) {
            ingredientsEl.textContent = `食材: ${ingList.join(', ')}`;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (bodyEl) {
      bodyEl.innerHTML = marked.parse(recipe.content);
    }
  }
}

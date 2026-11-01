/**
 * quest.js
 * Основная логика игрового квеста.
 */

import { Storage } from './storage.js';
import { AudioManager } from './audio.js';

// DOM-элементы
const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-bg');
const clueTextElement = document.getElementById('clue-text');
const progressTextElement = document.getElementById('progress-text');
const exhibitPanel = document.getElementById('exhibit-panel');
const exhibitPanelClose = document.getElementById('exhibit-panel-close');
const exhibitImage = document.getElementById('exhibit-image');
const exhibitTitle = document.getElementById('exhibit-title');
const exhibitDesc = document.getElementById('exhibit-desc');
const exhibitNextBtn = document.getElementById('exhibit-next-btn');
const resetBtn = document.getElementById('reset-progress');
const muteBtn = document.getElementById('toggle-sound');

let state = Storage.load();
let clues = [];

// Инициализация
async function init() {
  try {
    const response = await fetch('data/clues.json');
    if (!response.ok) throw new Error('Ошибка загрузки clues.json');
    clues = await response.json();
    
    // Если игра только началась, фиксируем время старта
    if (!state.startedAt) {
      state = Storage.update(state, { startedAt: Date.now() });
    }

    renderMap();
    updateUI();
    updateSoundIcon();

    // Если игра уже пройдена, можно показать финал (в будущем)
    if (state.completed.length === clues.length) {
      console.log('Квест уже пройден!');
    }

  } catch (error) {
    console.error('Критическая ошибка:', error);
    clueTextElement.textContent = 'Не удалось загрузить данные квеста. Проверьте соединение.';
  }
}

// Отрисовка миниатюр на карте
function renderMap() {
  // Удаляем старые хотспоты, если есть
  document.querySelectorAll('.hotspot').forEach(el => el.remove());

  clues.forEach((clue, index) => {
    const hotspot = document.createElement('button');
    hotspot.className = 'hotspot';
    hotspot.dataset.index = index;
    
    // Проверяем, найден ли уже этот предмет
    if (state.completed.includes(index)) {
      hotspot.classList.add('completed');
    }

    // Умное позиционирование
    let leftPct = 50; // По умолчанию по центру
    let topPct = 50;

    if (clue.left && clue.top) {
      // Берем базовые координаты из JSON
      const baseLeft = parseFloat(clue.left);
      const baseTop = parseFloat(clue.top);
      
      // Добавляем случайный сдвиг (от -2% до +2%), чтобы сохранить эффект "поиска"
      // Но не выходим за границы (5% - 95%)
      const randomShiftLeft = (Math.random() - 0.5) * 4;
      const randomShiftTop = (Math.random() - 0.5) * 4;
      
      leftPct = Math.max(5, Math.min(95, baseLeft + randomShiftLeft));
      topPct = Math.max(5, Math.min(95, baseTop + randomShiftTop));
    } else {
      // Если координат нет (на всякий случай), раскидываем случайно
      leftPct = 10 + Math.random() * 80;
      topPct = 10 + Math.random() * 80;
    }

    hotspot.style.left = `${leftPct}%`;
    hotspot.style.top = `${topPct}%`;

    // Добавляем миниатюру
    const img = document.createElement('img');
    img.src = clue.thumb || clue.media;
    img.alt = clue.objectName || 'Экспонат';
    img.loading = 'lazy';
    hotspot.appendChild(img);

    // Обработчик клика
    hotspot.addEventListener('click', () => handleHotspotClick(index));

    mapContainer.appendChild(hotspot);
  });
}

// Обработка клика по миниатюре
function handleHotspotClick(clickedIndex) {
  const currentIndex = state.currentStep - 1; // Индексы в массиве начинаются с 0
  const clickedClue = clues[clickedIndex];

  // Если экспонат уже найден, просто показываем его без проверки
  if (state.completed.includes(clickedIndex)) {
    showExhibitPanel(clickedClue, true);
    return;
  }

  // Проверка правильности ответа
  if (clickedIndex === currentIndex) {
    // ПРАВИЛЬНО
    AudioManager.play('success');
    
    // Сохраняем прогресс
    const newCompleted = [...state.completed, clickedIndex];
    const nextStep = state.currentStep < clues.length ? state.currentStep + 1 : clues.length;
    
    state = Storage.update(state, { 
      completed: newCompleted,
      currentStep: nextStep
    });

    // Обновляем визуал
    document.querySelector(`.hotspot[data-index="${clickedIndex}"]`).classList.add('completed');
    updateUI();
    
    // Показываем панель с экспонатом
    showExhibitPanel(clickedClue, true);

    // Если это был последний экспонат, показываем финал (в следующем этапе)
    if (newCompleted.length === clues.length) {
      state = Storage.update(state, { finishedAt: Date.now() });
      setTimeout(() => {
        alert('Поздравляем! Вы нашли все 21 экспонат! Финальный экран появится в следующем обновлении.');
      }, 1000);
    }

  } else {
    // НЕПРАВИЛЬНО
    AudioManager.play('error');
    
    // Увеличиваем счетчик ошибок
    state = Storage.update(state, { errors: state.errors + 1 });
    updateUI();
    
    // Показываем панель с ошибкой (но не раскрываем секрет)
    showExhibitPanel({ 
      objectName: 'Неверно', 
      descr: 'Это не тот экспонат, который описан в подсказке. Попробуйте найти другой.',
      media: null 
    }, false);
  }
}

// Управление выезжающей панелью
function showExhibitPanel(clue, isCorrect) {
  if (isCorrect) {
    exhibitTitle.textContent = clue.objectName || clue.title || 'Экспонат';
    exhibitDesc.textContent = clue.descr || clue.objectDesc || '';
    exhibitImage.src = clue.media || clue.thumb;
    exhibitImage.style.display = 'block';
    
    // Настраиваем кнопку "Далее" (она просто закрывает панель)
    exhibitNextBtn.classList.remove('hidden');
    exhibitNextBtn.onclick = closeExhibitPanel;
  } else {
    exhibitTitle.textContent = 'Ошибка';
    exhibitDesc.textContent = clue.descr;
    exhibitImage.style.display = 'none';
    
    // Кнопка "Попробовать снова" (закрывает панель)
    exhibitNextBtn.classList.add('hidden');
  }

  // Если есть аудио (например, Левитан)
  if (isCorrect && clue.audio) {
    AudioManager.play('levitan');
  }

  exhibitPanel.classList.add('active');
}

function closeExhibitPanel() {
  exhibitPanel.classList.remove('active');
  AudioManager.stop('levitan'); // Останавливаем Левитана при закрытии
}

// Обновление текста подсказки и счетчиков
function updateUI() {
  if (state.currentStep > clues.length) return;

  const currentClue = clues[state.currentStep - 1];
  if (currentClue) {
    clueTextElement.textContent = currentClue.clue || currentClue.text;
  }

  // Обновляем прогресс (найдено/всего, ошибки)
  progressTextElement.innerHTML = `
    Найдено: <span class="text-gold">${state.completed.length}</span> / ${clues.length} 
    <br><small>Ошибок: ${state.errors}</small>
  `;
}

// Обновление иконки звука
function updateSoundIcon() {
  if (AudioManager.isMuted) {
    muteBtn.innerHTML = '🔇 Звук выкл.';
    muteBtn.classList.remove('text-gold');
  } else {
    muteBtn.innerHTML = '🔊 Звук вкл.';
    muteBtn.classList.add('text-gold');
  }
}

// --- Обработчики событий ---
exhibitPanelClose.addEventListener('click', closeExhibitPanel);

resetBtn.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите сбросить весь прогресс? Все найденные экспонаты будут скрыты.')) {
    Storage.reset();
  }
});

muteBtn.addEventListener('click', () => {
  AudioManager.toggleMute();
  updateSoundIcon();
});

// Запуск
init();
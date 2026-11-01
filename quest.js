/**
 * quest.js
 * Основная логика игрового квеста.
 */

import { Storage } from './storage.js';
import { AudioManager } from './audio.js';

// DOM-элементы интерфейса
const mapContainer = document.getElementById('map-container');
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

// Элементы финального экрана
const finalScreen = document.getElementById('final-screen');
const finalFound = document.getElementById('final-found');
const finalErrors = document.getElementById('final-errors');
const restartQuestBtn = document.getElementById('restart-quest');

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

    // Если игра уже была пройдена ранее (загрузились с пройденным сейвом)
    if (state.completed.length === clues.length && state.finishedAt) {
      showFinalScreen();
    }

  } catch (error) {
    console.error('Критическая ошибка:', error);
    clueTextElement.textContent = 'Не удалось загрузить данные квеста. Проверьте соединение.';
  }
}

// Отрисовка миниатюр на карте
function renderMap() {
  document.querySelectorAll('.hotspot').forEach(el => el.remove());

  clues.forEach((clue, index) => {
    const hotspot = document.createElement('button');
    hotspot.className = 'hotspot';
    hotspot.dataset.index = index;
    
    if (state.completed.includes(index)) {
      hotspot.classList.add('completed');
    }

    // Позиционирование с легким разбросом
    let leftPct = 50;
    let topPct = 50;

    if (clue.left && clue.top) {
      const baseLeft = parseFloat(clue.left);
      const baseTop = parseFloat(clue.top);
      
      const randomShiftLeft = (Math.random() - 0.5) * 4; // от -2% до +2%
      const randomShiftTop = (Math.random() - 0.5) * 4;
      
      leftPct = Math.max(5, Math.min(95, baseLeft + randomShiftLeft));
      topPct = Math.max(5, Math.min(95, baseTop + randomShiftTop));
    } else {
      leftPct = 10 + Math.random() * 80;
      topPct = 10 + Math.random() * 80;
    }

    hotspot.style.left = `${leftPct}%`;
    hotspot.style.top = `${topPct}%`;

    const img = document.createElement('img');
    img.src = clue.thumb || clue.media;
    img.alt = clue.objectName || 'Экспонат';
    img.loading = 'lazy';
    hotspot.appendChild(img);

    hotspot.addEventListener('click', () => handleHotspotClick(index));
    mapContainer.appendChild(hotspot);
  });
}

// Обработка клика
function handleHotspotClick(clickedIndex) {
  const currentIndex = state.currentStep - 1;
  const clickedClue = clues[clickedIndex];

  // Если уже найден, просто смотрим
  if (state.completed.includes(clickedIndex)) {
    showExhibitPanel(clickedClue, true);
    return;
  }

  // Верный ответ
  if (clickedIndex === currentIndex) {
    AudioManager.play('success');
    
    const newCompleted = [...state.completed, clickedIndex];
    const nextStep = state.currentStep < clues.length ? state.currentStep + 1 : clues.length;
    
    // Проверяем, не победа ли это
    const isVictory = newCompleted.length === clues.length;

    state = Storage.update(state, { 
      completed: newCompleted,
      currentStep: nextStep,
      ...(isVictory ? { finishedAt: Date.now() } : {})
    });

    document.querySelector(`.hotspot[data-index="${clickedIndex}"]`).classList.add('completed');
    updateUI();
    
    // Показываем панель с экспонатом
    showExhibitPanel(clickedClue, true);

    // Если победили, после закрытия панели показываем финал
    if (isVictory) {
      exhibitNextBtn.onclick = () => {
        closeExhibitPanel();
        showFinalScreen();
      };
    }

  } else {
    // Ошибка
    AudioManager.play('error');
    
    state = Storage.update(state, { errors: state.errors + 1 });
    updateUI();
    
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
    
    exhibitNextBtn.classList.remove('hidden');
    // По умолчанию кнопка "Далее" просто закрывает панель
    exhibitNextBtn.onclick = closeExhibitPanel; 
  } else {
    exhibitTitle.textContent = 'Ошибка';
    exhibitDesc.textContent = clue.descr;
    exhibitImage.style.display = 'none';
    exhibitNextBtn.classList.add('hidden');
  }

  if (isCorrect && clue.audio) {
    AudioManager.play('levitan');
  }

  exhibitPanel.classList.add('active');
}

function closeExhibitPanel() {
  exhibitPanel.classList.remove('active');
  AudioManager.stop('levitan');
}

// Обновление текста подсказки и счетчиков
function updateUI() {
  if (state.currentStep > clues.length) return;

  const currentClue = clues[state.currentStep - 1];
  if (currentClue) {
    clueTextElement.textContent = currentClue.clue || currentClue.text;
  }

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

// Показ финального экрана
function showFinalScreen() {
  finalFound.textContent = state.completed.length;
  finalErrors.textContent = state.errors;
  
  finalScreen.classList.remove('hidden');
  // Плавное появление через добавление класса (если нужно анимировать, стили уже готовы)
}

// --- Обработчики событий ---
exhibitPanelClose.addEventListener('click', closeExhibitPanel);

resetBtn.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите сбросить весь прогресс?')) {
    Storage.reset();
  }
});

muteBtn.addEventListener('click', () => {
  AudioManager.toggleMute();
  updateSoundIcon();
});

restartQuestBtn.addEventListener('click', () => {
  Storage.reset(); // Перезагрузит страницу и начнет заново
});

// Запуск
init();
/**
 * storage.js
 * Модуль для управления сохранением прогресса квеста в localStorage.
 * Защищает от сбоев и повреждения данных.
 */

const STORAGE_KEY = 'echo_of_war_quest_v2';
const VERSION = 2;

// Начальное состояние игры
const DEFAULT_STATE = {
  version: VERSION,
  currentStep: 1, // Текущий шаг (от 1 до 21)
  completed: [],  // Массив ID (или индексов) найденных экспонатов
  errors: 0,      // Счетчик неправильных ответов
  startedAt: null,// Время начала игры (timestamp)
  finishedAt: null// Время окончания игры (timestamp)
};

export const Storage = {
  /**
   * Загружает состояние из localStorage.
   * Если данных нет или они повреждены, возвращает дефолтное состояние.
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };

      const parsed = JSON.parse(raw);

      // Проверка версии (если обновили игру, старые сейвы могут не подойти)
      if (parsed.version !== VERSION) {
        console.warn('Версия сохранения устарела. Сброс прогресса.');
        return this.reset(false); // Сбрасываем без перезагрузки страницы
      }

      // Валидация структуры данных
      if (!Array.isArray(parsed.completed) || typeof parsed.currentStep !== 'number') {
        throw new Error('Неверная структура данных');
      }

      return parsed;
    } catch (error) {
      console.error('Ошибка при чтении localStorage:', error);
      return { ...DEFAULT_STATE };
    }
  },

  /**
   * Сохраняет текущее состояние.
   * @param {Object} state - Объект состояния игры.
   */
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Не удалось сохранить прогресс (возможно, переполнен localStorage или режим инкогнито):', error);
    }
  },

  /**
   * Полный сброс прогресса.
   * @param {boolean} reload - Перезагружать ли страницу после сброса.
   */
  reset(reload = true) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Не удалось очистить localStorage:', error);
    }

    if (reload) {
      window.location.reload();
    }
    return { ...DEFAULT_STATE };
  },

  /**
   * Обновляет конкретные поля в состоянии и сохраняет.
   * @param {Object} currentState - Текущее состояние.
   * @param {Object} updates - Объект с изменениями (например, { errors: 1 }).
   */
  update(currentState, updates) {
    const newState = { ...currentState, ...updates };
    this.save(newState);
    return newState;
  }
};
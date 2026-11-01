/**
 * audio.js
 * Модуль для управления звуками и музыкой в квесте.
 */

class AudioController {
  constructor() {
    // Пути к аудиофайлам (относительно корня проекта)
    this.paths = {
      success: 'assets/audio/ok.mp3',
      error: 'assets/audio/fail.mp3',
      levitan: 'assets/audio/levitan.mp3',
      // bgm: 'assets/audio/bgm.mp3' // Если найдете фоновую музыку, раскомментируйте
    };

    this.audioElements = {};
    this.isMuted = false;

    // Инициализация аудиообъектов
    for (const [key, path] of Object.entries(this.paths)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.audioElements[key] = audio;
    }

    // Загружаем настройку звука из localStorage (если есть)
    this.loadSettings();
  }

  /**
   * Воспроизводит указанный звук.
   * @param {string} name - Ключ звука ('success', 'error', 'levitan').
   */
  play(name) {
    if (this.isMuted) return;
    const audio = this.audioElements[name];
    if (audio) {
      audio.currentTime = 0; // Сбрасываем на начало, если звук играл
      audio.play().catch((err) => {
        // Браузер может заблокировать воспроизведение, если не было клика
        console.warn(`Не удалось воспроизвести звук ${name}:`, err);
      });
    }
  }

  /**
   * Останавливает указанный звук.
   * @param {string} name - Ключ звука.
   */
  stop(name) {
    const audio = this.audioElements[name];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Останавливает все звуки.
   */
  stopAll() {
    for (const audio of Object.values(this.audioElements)) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Переключает режим "Без звука".
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAll();
    }
    this.saveSettings();
    return this.isMuted;
  }

  /**
   * Устанавливает громкость (от 0.0 до 1.0).
   * @param {number} volume 
   */
  setVolume(volume) {
    for (const audio of Object.values(this.audioElements)) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Сохраняет настройки звука в localStorage.
   */
  saveSettings() {
    try {
      localStorage.setItem('echo_of_war_audio_muted', this.isMuted);
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
  }

  /**
   * Загружает настройки звука из localStorage.
   */
  loadSettings() {
    try {
      const muted = localStorage.getItem('echo_of_war_audio_muted');
      if (muted !== null) {
        this.isMuted = muted === 'true';
      }
    } catch (e) {
      this.isMuted = false;
    }
  }
}

// Экспортируем единственный экземпляр (Singleton)
export const AudioManager = new AudioController();
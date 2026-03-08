// Логика для страницы проверки орфографии
document.addEventListener('DOMContentLoaded', function() {
    const textArea = document.getElementById('spelling-text-area');
    const checkSpellingButton = document.getElementById('check-spelling-button');
    const copyCorrectedButton = document.getElementById('copy-corrected-button');
    const spellingResults = document.getElementById('spelling-results');
    const errorsList = document.getElementById('errors-list');
    const wordCountElement = document.querySelector('.word-count');
    const charCountElement = document.querySelector('.char-count');

    let correctedText = '';

    // Загрузка сохраненного текста
    const savedText = localStorage.getItem('spellingText');
    if (savedText) {
        textArea.value = savedText;
        updateStats();
    }

    // Функция для обновления статистики
    function updateStats() {
        const text = textArea.value;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        const charCount = text.length;

        wordCountElement.textContent = `${wordCount} ${getWordEnding(wordCount)}`;
        charCountElement.textContent = `${charCount} ${getSymbolEnding(charCount)}`;
    }

    function getWordEnding(count) {
        if (count % 10 === 1 && count % 100 !== 11) return 'слово';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'слова';
        return 'слов';
    }

    function getSymbolEnding(count) {
        if (count % 10 === 1 && count % 100 !== 11) return 'символ';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'символа';
        return 'символов';
    }

    // Функция для проверки орфографии
    async function checkSpelling(text) {
        try {
            const response = await fetch('https://speller.yandex.net/services/spellservice.json/checkText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `text=${encodeURIComponent(text)}&lang=ru,en&options=512`
            });

            if (!response.ok) {
                throw new Error('Ошибка сети');
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка при проверке орфографии:', error);
            throw new Error('Не удалось проверить орфографию. Проверьте подключение к интернету.');
        }
    }

    // Функция для применения исправлений
    function applyCorrections(text, corrections) {
        let correctedText = text;
        
        // Сортируем исправления по позиции в обратном порядке, чтобы не сбивать индексы
        corrections.sort((a, b) => b.pos - a.pos);
        
        for (const correction of corrections) {
            if (correction.s && correction.s.length > 0) {
                const start = correction.pos;
                const end = correction.pos + correction.len;
                const replacement = correction.s[0]; // Берем первый вариант исправления
                correctedText = correctedText.substring(0, start) + replacement + correctedText.substring(end);
            }
        }
        
        return correctedText;
    }

    // Обработчик клика на кнопку проверки
    checkSpellingButton.addEventListener('click', async () => {
        const text = textArea.value;
        
        if (!text.trim()) {
            alert('Введите текст для проверки орфографии');
            return;
        }
        
        checkSpellingButton.disabled = true;
        checkSpellingButton.textContent = 'Проверка...';
        
        try {
            const corrections = await checkSpelling(text);
            correctedText = applyCorrections(text, corrections);
            
            // Показываем результаты
            spellingResults.style.display = 'block';
            errorsList.innerHTML = '';
            
            if (corrections.length === 0) {
                errorsList.innerHTML = '<p style="color: #00ff00;">Ошибок не найдено!</p>';
                copyCorrectedButton.disabled = true;
            } else {
                corrections.forEach(correction => {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-item';
                    errorElement.innerHTML = `
                        <strong>Ошибка:</strong> "${correction.word}" 
                        <strong>Возможные исправления:</strong> ${correction.s ? correction.s.join(', ') : 'нет'}
                    `;
                    errorsList.appendChild(errorElement);
                });
                copyCorrectedButton.disabled = false;
            }
            
        } catch (error) {
            alert(error.message);
        } finally {
            checkSpellingButton.disabled = false;
            checkSpellingButton.textContent = 'Проверить орфографию';
        }
    });

    // Обработчик кнопки копирования исправленного текста
    copyCorrectedButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(correctedText);
            alert('Исправленный текст скопирован в буфер обмена!');
        } catch (err) {
            alert('Не удалось скопировать текст');
        }
    });

    // Обновляем статистику при вводе текста
    textArea.addEventListener('input', updateStats);

    // Сохраняем текст при вводе
    textArea.addEventListener('input', function() {
        localStorage.setItem('spellingText', textArea.value);
    });

    // Инициализация статистики
    updateStats();
});
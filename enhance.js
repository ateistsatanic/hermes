// Логика для страницы дополнений текста
document.addEventListener('DOMContentLoaded', function() {
    // Получаем все элементы
    const sourceTextArea = document.getElementById('source-text-area');
    const enhancedTextArea = document.getElementById('enhanced-text-area');
    const triggersList = document.getElementById('triggers-list');
    const enhancementsList = document.getElementById('enhancements-list');
    const enhanceButton = document.getElementById('enhance-button');
    const copyEnhancedButton = document.getElementById('copy-enhanced-button');
    const saveFileButton = document.getElementById('save-file-button');
    const loadFilesInput = document.getElementById('load-files-input');
    const selectedFilesList = document.getElementById('selected-files-list');
    const processingProgress = document.getElementById('processing-progress');
    const progressText = document.getElementById('progress-text');
    const currentFile = document.getElementById('current-file');
    const singleFileEditor = document.getElementById('single-file-editor');

    let selectedFiles = [];
    let currentProcessingIndex = 0;

    // Проверяем, что все элементы найдены
    if (!sourceTextArea || !enhancedTextArea || !triggersList || !enhancementsList || 
        !enhanceButton || !copyEnhancedButton || !saveFileButton || !loadFilesInput) {
        console.error('Не все элементы найдены на странице');
        return;
    }

    // Загрузка последнего текста
    const savedSourceText = localStorage.getItem('enhanceSourceText');
    if (savedSourceText) {
        sourceTextArea.value = savedSourceText;
    }

    // Функция для обновления статистики
    function updateStats(textArea, statsContainer) {
        const text = textArea.value;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        const charCount = text.length;

        const wordCountElement = statsContainer.querySelector('.word-count');
        const charCountElement = statsContainer.querySelector('.char-count');

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

    // Функция для расширения текста с одним набором
    // Функция для расширения текста с одним набором
// Функция для расширения текста с одним набором
function enhanceTextWithPreset(sourceText, triggers, enhancements) {
    if (!sourceText.trim() || triggers.length === 0 || enhancements.length === 0) {
        return sourceText;
    }

    // Сортируем триггеры по длине (от самых длинных к самым коротким)
    // чтобы сначала обрабатывались фразы из нескольких слов
    const sortedTriggers = [...triggers].sort((a, b) => b.length - a.length);
    
    // Создаем копию массива дополнений для работы
    let availableEnhancements = [...enhancements];
    let resultText = sourceText;
    
    // Обрабатываем каждый триггер
    sortedTriggers.forEach(trigger => {
        if (trigger.trim() === '') return;
        
        // Создаем регулярное выражение для поиска ТОЧНОГО совпадения
        // Работает и с одиночными словами, и с фразами из нескольких слов
        const escapedTrigger = escapeRegExp(trigger);
        const regex = new RegExp(`(^|\\s)${escapedTrigger}(?=\\s|$|\\p{P})`, 'giu');
        
        // Заменяем все вхождения триггера
        resultText = resultText.replace(regex, (match, space) => {
            // Если дополнений больше нет, просто возвращаем исходный триггер
            if (availableEnhancements.length === 0) {
                return match;
            }

            // Определяем сколько дополнений добавить (от 1 до 3, но не более доступных)
            const numEnhancements = Math.min(
                Math.floor(Math.random() * 3) + 1,
                availableEnhancements.length
            );

            // Выбираем случайные дополнения
            const selectedEnhancements = [];
            const tempEnhancements = [...availableEnhancements];
            
            for (let i = 0; i < numEnhancements; i++) {
                if (tempEnhancements.length === 0) break;
                
                const randomIndex = Math.floor(Math.random() * tempEnhancements.length);
                selectedEnhancements.push(tempEnhancements[randomIndex]);
                // Удаляем использованное дополнение, чтобы избежать повторов
                tempEnhancements.splice(randomIndex, 1);
            }

            // Удаляем использованные дополнения из доступных
            selectedEnhancements.forEach(enhancement => {
                const index = availableEnhancements.indexOf(enhancement);
                if (index > -1) {
                    availableEnhancements.splice(index, 1);
                }
            });

            // Добавляем дополнения (каждое как целую фразу)
            return space + trigger + ' ' + selectedEnhancements.join(' ');
        });
    });

    return resultText;
}

    // Функция для экранирования специальных символов в регулярных выражениях
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Последовательная обработка файлов
    async function processFilesSequentially() {
        if (selectedFiles.length === 0) {
            alert('Сначала выберите файлы для обработки');
            return;
        }

        if (!sourceTextArea.value.trim()) {
            alert('Введите исходный текст');
            return;
        }

        // Блокируем кнопки на время обработки
        enhanceButton.disabled = true;
        copyEnhancedButton.disabled = true;

        // Показываем прогресс
        processingProgress.style.display = 'block';
        currentProcessingIndex = 0;

        let currentText = sourceTextArea.value;

        // Обрабатываем файлы по очереди
        for (let i = 0; i < selectedFiles.length; i++) {
            currentProcessingIndex = i;
            const file = selectedFiles[i];
            
            // Обновляем прогресс
            progressText.textContent = `Обработка файлов: ${i + 1}/${selectedFiles.length}`;
            currentFile.textContent = `Текущий файл: ${file.name}`;

            try {
                const presetData = await readFileAsJSON(file);
                
                if (!presetData.triggers || !presetData.enhancements) {
                    throw new Error('Неверный формат файла: ' + file.name);
                }

                // Обрабатываем текст с текущим набором
                currentText = enhanceTextWithPreset(currentText, presetData.triggers, presetData.enhancements);
                
                console.log(`Файл ${file.name} обработан`);

            } catch (error) {
                console.error(`Ошибка при обработке файла ${file.name}:`, error);
                alert(`Ошибка в файле ${file.name}: ${error.message}`);
                break;
            }
        }

        // Показываем результат
        enhancedTextArea.value = currentText;
        
        // Обновляем статистику для результата
        updateStats(enhancedTextArea, enhancedTextArea.parentElement.parentElement.querySelector('.text-stats'));
        
        // Разблокируем кнопки
        enhanceButton.disabled = false;
        copyEnhancedButton.disabled = false;

        // Скрываем прогресс
        processingProgress.style.display = 'none';
        
        alert(`Обработка завершена! Обработано файлов: ${currentProcessingIndex + 1}/${selectedFiles.length}`);
    }

    // Обработка с текущим редактором (для 1 файла)
    function processWithCurrentEditor() {
        const triggers = triggersList.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        const enhancements = enhancementsList.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (!sourceTextArea.value.trim()) {
            alert('Введите исходный текст');
            return;
        }

        if (triggers.length === 0) {
            alert('Добавьте слова-триггеры');
            return;
        }

        if (enhancements.length === 0) {
            alert('Добавьте слова для дополнения');
            return;
        }

        const enhancedText = enhanceTextWithPreset(sourceTextArea.value, triggers, enhancements);
        enhancedTextArea.value = enhancedText;
        
        // Обновляем статистику для результата
        updateStats(enhancedTextArea, enhancedTextArea.parentElement.parentElement.querySelector('.text-stats'));
        
        copyEnhancedButton.disabled = false;
    }

    // Чтение файла как JSON
    function readFileAsJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const presetData = JSON.parse(e.target.result);
                    resolve(presetData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    // Обработчик выбора файлов
    function handleFileSelection(event) {
        const files = Array.from(event.target.files);
        selectedFiles = files;
        
        // Показываем список выбранных файлов
        if (files.length > 0) {
            selectedFilesList.innerHTML = `<strong>Выбрано файлов: ${files.length}</strong><br>` +
                files.map((file, index) => `${index + 1}. ${file.name}`).join('<br>');
        } else {
            selectedFilesList.innerHTML = '';
        }

        // Управляем видимостью редактора
        if (files.length === 1) {
            // Загружаем содержимое файла в редактор
            loadSingleFileToEditor(files[0]);
            singleFileEditor.style.display = 'block';
        } else {
            // Скрываем редактор для множественных файлов
            singleFileEditor.style.display = 'none';
        }
    }

    // Загрузка одного файла в редактор
    async function loadSingleFileToEditor(file) {
        try {
            const presetData = await readFileAsJSON(file);
            
            if (!presetData.triggers || !presetData.enhancements) {
                throw new Error('Неверный формат файла');
            }
            
            triggersList.value = presetData.triggers.join('\n');
            enhancementsList.value = presetData.enhancements.join('\n');
            
        } catch (error) {
            alert('Ошибка при загрузке файла: ' + error.message);
        }
    }

    // Сохранение в файл
    function saveToFile() {
        const triggers = triggersList.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        const enhancements = enhancementsList.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (triggers.length === 0 || enhancements.length === 0) {
            alert('Добавьте триггеры и дополнения перед сохранением');
            return;
        }

        const presetData = {
            name: prompt('Введите название набора:', 'Мой набор'),
            triggers: triggers,
            enhancements: enhancements,
            created: new Date().toISOString()
        };

        if (!presetData.name) {
            alert('Нужно ввести название набора');
            return;
        }

        const dataStr = JSON.stringify(presetData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = presetData.name.replace(/[^a-z0-9]/gi, '_') + '.json';
        link.click();
        
        alert(`Набор "${presetData.name}" сохранен в файл!`);
    }

    // Обработчик кнопки расширения
    enhanceButton.addEventListener('click', function() {
        if (selectedFiles.length === 1 && singleFileEditor.style.display !== 'none') {
            // Обработка с текущим редактором
            processWithCurrentEditor();
        } else {
            // Последовательная обработка множественных файлов
            processFilesSequentially();
        }
    });

    // Обработчик кнопки копирования
    copyEnhancedButton.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(enhancedTextArea.value);
            alert('Расширенный текст скопирован в буфер обмена!');
        } catch (err) {
            alert('Не удалось скопировать текст');
        }
    });

    // Обработчики для работы с файлами
    saveFileButton.addEventListener('click', saveToFile);
    loadFilesInput.addEventListener('change', handleFileSelection);

    // Сохранение исходного текста
    sourceTextArea.addEventListener('input', function() {
        localStorage.setItem('enhanceSourceText', sourceTextArea.value);
        updateStats(sourceTextArea, sourceTextArea.parentElement.parentElement.querySelector('.text-stats'));
    });

    // Инициализация
    updateStats(sourceTextArea, sourceTextArea.parentElement.parentElement.querySelector('.text-stats'));
    updateStats(enhancedTextArea, enhancedTextArea.parentElement.parentElement.querySelector('.text-stats'));
});
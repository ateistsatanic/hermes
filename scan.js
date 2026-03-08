class TextPatternScanner {
    constructor() {
        this.allMessages = new Map(); // Храним все сообщения
        this.wordSequences = new Map();
        this.messageCount = 0;
        this.MIN_BLOCK_SIZE = 3; // Уменьшаем для лучшего поиска
        this.MAX_BLOCK_SIZE = 50;
        this.isLoaded = false;
    }

    normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    addMessage(messageId, text) {
        // Сохраняем оригинальное сообщение
        this.allMessages.set(messageId, text);
        
        const normalizedText = this.normalizeText(text);
        if (!normalizedText) return;

        this.messageCount++;

        const words = normalizedText.split(' ').filter(word => word.length > 0);
        
        // Индексируем все возможные последовательности
        for (let blockSize = this.MIN_BLOCK_SIZE; blockSize <= Math.min(this.MAX_BLOCK_SIZE, words.length); blockSize++) {
            for (let i = 0; i <= words.length - blockSize; i++) {
                const block = words.slice(i, i + blockSize).join(' ');
                const key = block; // Используем сам блок как ключ
                
                if (!this.wordSequences.has(key)) {
                    this.wordSequences.set(key, new Set());
                }
                this.wordSequences.get(key).add(messageId);
            }
        }
    }

    // ПРОСТАЯ И ЭФФЕКТИВНАЯ ПРОВЕРКА
    findExactMatches(text) {
        const normalizedInput = this.normalizeText(text);
        if (!normalizedInput) return [];

        const inputWords = normalizedInput.split(' ').filter(word => word.length > 0);
        const matches = [];

        // Ищем точные совпадения блоков
        for (let blockSize = Math.min(this.MAX_BLOCK_SIZE, inputWords.length); blockSize >= this.MIN_BLOCK_SIZE; blockSize--) {
            for (let i = 0; i <= inputWords.length - blockSize; i++) {
                const searchBlock = inputWords.slice(i, i + blockSize).join(' ');
                
                if (this.wordSequences.has(searchBlock)) {
                    const messageIds = Array.from(this.wordSequences.get(searchBlock));
                    const originalMessages = messageIds.map(id => this.allMessages.get(id));
                    
                    // Восстанавливаем оригинальный текст блока
                    const originalBlock = this.reconstructOriginalBlock(text, inputWords, i, blockSize);
                    
                    matches.push({
                        block: originalBlock,
                        count: messageIds.length,
                        size: blockSize,
                        position: i,
                        messages: originalMessages.slice(0, 3) // Показываем первые 3 сообщения где встречается
                    });
                }
            }
        }

        // Убираем дубликаты и перекрывающиеся блоки
        return this.filterOverlappingMatches(matches);
    }

    reconstructOriginalBlock(originalText, normalizedWords, startIdx, blockSize) {
        const originalWords = originalText.split(' ');
        const result = [];
        
        let normIndex = 0;
        for (let i = 0; i < originalWords.length && normIndex < normalizedWords.length; i++) {
            const originalWord = originalWords[i];
            const normalizedWord = this.normalizeText(originalWord);
            
            if (normalizedWord === normalizedWords[normIndex]) {
                if (normIndex >= startIdx && normIndex < startIdx + blockSize) {
                    result.push(originalWord);
                }
                normIndex++;
            }
        }
        
        return result.join(' ');
    }

    filterOverlappingMatches(matches) {
        const filtered = [];
        const coveredPositions = new Set();
        
        // Сортируем по длине блока (сначала самые длинные)
        matches.sort((a, b) => b.size - a.size);
        
        for (const match of matches) {
            let isOverlapping = false;
            
            // Проверяем, не перекрывается ли с уже добавленными
            for (let i = match.position; i < match.position + match.size; i++) {
                if (coveredPositions.has(i)) {
                    isOverlapping = true;
                    break;
                }
            }
            
            if (!isOverlapping) {
                filtered.push(match);
                // Помечаем позиции как покрытые
                for (let i = match.position; i < match.position + match.size; i++) {
                    coveredPositions.add(i);
                }
            }
        }
        
        return filtered;
    }

    // ПРОСТОЙ ПОИСК - проверяем есть ли вообще такой текст в базе
    simpleSearch(text) {
        const normalizedInput = this.normalizeText(text);
        const results = [];
        
        // Проходим по всем сообщениям и ищем точные вхождения
        for (const [messageId, messageText] of this.allMessages) {
            const normalizedMessage = this.normalizeText(messageText);
            
            if (normalizedMessage.includes(normalizedInput) && normalizedInput.length > 10) {
                results.push({
                    type: 'EXACT_MATCH',
                    block: text,
                    count: 1,
                    foundIn: messageText,
                    messageId: messageId
                });
            }
        }
        
        return results;
    }

    getStats() {
        return {
            messageCount: this.messageCount,
            sequenceCount: this.wordSequences.size,
            isLoaded: this.isLoaded
        };
    }

    clear() {
        this.allMessages.clear();
        this.wordSequences.clear();
        this.messageCount = 0;
        this.isLoaded = false;
    }
}

class TelegramChannelParser {
    constructor() {
        this.channelUsername = 'hranilische_shablonov';
        this.scanner = new TextPatternScanner();
    }

    async loadTemplates(progressCallback = null) {
        try {
            this.updateStatus('🚀 Начинаем загрузку ВСЕХ сообщений...', 'loading');
            
            const messages = await this.parseAllMessages(progressCallback);
            
            let processed = 0;
            for (const message of messages) {
                this.scanner.addMessage(message.id, message.text);
                processed++;
                
                if (progressCallback && processed % 50 === 0) {
                    progressCallback(processed, messages.length);
                    await this.delay(10); // Не блокируем UI
                }
            }
            
            this.scanner.isLoaded = true;
            this.updateStatus(`✅ Готово! Загружено ${messages.length} сообщений`, 'success');
            return true;
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.updateStatus(`❌ Ошибка: ${error.message}`, 'error');
            return false;
        }
    }

    async parseAllMessages(progressCallback = null) {
        const allMessages = [];
        let offsetId = 0;
        let emptyCount = 0;
        let batchCount = 0;

        // ПАРСИМ ДО ТЕХ ПОР, ПОКА ЕСТЬ СООБЩЕНИЯ
        while (emptyCount < 3) { // 3 пустых пачки подряд = конец
            batchCount++;
            
            try {
                const batch = await this.loadBatchWithTimeout(offsetId, 100);
                
                if (batch.messages.length === 0) {
                    emptyCount++;
                    this.updateStatus(`⏳ Пустая пачка ${batchCount}, ждем... (всего: ${allMessages.length})`, 'loading');
                } else {
                    emptyCount = 0;
                    allMessages.push(...batch.messages);
                    offsetId = batch.lastId;
                    this.updateStatus(`📥 Пачка ${batchCount}: +${batch.messages.length} (всего: ${allMessages.length})`, 'loading');
                }
                
                if (progressCallback) {
                    progressCallback(allMessages.length, allMessages.length + 100);
                }
                
                await this.delay(1000); // 1 секунда между запросами
                
            } catch (error) {
                console.error(`Ошибка в пачке ${batchCount}:`, error);
                this.updateStatus(`⚠️ Ошибка, пробуем продолжить...`, 'loading');
                await this.delay(2000);
            }
            
            // Защита от бесконечного цикла
            if (batchCount > 500) {
                this.updateStatus('⚠️ Достигнут предел в 50000 сообщений', 'loading');
                break;
            }
        }

        this.updateStatus(`✅ Загружено ${allMessages.length} сообщений`, 'success');
        return allMessages;
    }

    async loadBatchWithTimeout(offsetId, limit = 100) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
        
        try {
            const apiUrl = `https://tg.i-c-a.su/api/chat?name=${this.channelUsername}&after=${offsetId}&limit=${limit}`;
            console.log(`Загружаем: ${apiUrl}`);
            
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return this.parseApiResponse(data, offsetId);
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    parseApiResponse(data, offsetId) {
        const messages = [];
        
        if (data.messages && Array.isArray(data.messages)) {
            let messageId = offsetId + 1;
            for (const msg of data.messages) {
                if (msg.message && typeof msg.message === 'string') {
                    const text = msg.message.trim();
                    if (text) { // БЕРЕМ ВСЕ СООБЩЕНИЯ БЕЗ ФИЛЬТРОВ
                        messages.push({
                            id: messageId++,
                            text: text,
                            date: msg.date || Date.now()
                        });
                    }
                }
            }
        }

        const lastId = messages.length > 0 ? messages[messages.length - 1].id : offsetId;
        
        return {
            messages: messages,
            lastId: lastId,
            hasMore: messages.length === 100
        };
    }

    // ПРОСТОЙ И ЭФФЕКТИВНЫЙ ПОИСК
    scanText(text) {
        if (!this.scanner.isLoaded) {
            this.updateStatus('Сначала загрузите шаблоны', 'error');
            return [];
        }

        if (!text || text.trim().length < 10) {
            this.updateStatus('Введите текст для поиска (минимум 10 символов)', 'error');
            return [];
        }

        // 1. Сначала простой поиск точных вхождений
        const simpleResults = this.scanner.simpleSearch(text);
        if (simpleResults.length > 0) {
            this.updateStatus(`🎯 Найдено точное совпадение!`, 'success');
            return simpleResults;
        }

        // 2. Затем поиск по блокам
        const blockResults = this.scanner.findExactMatches(text);
        this.updateStatus(`🔍 Найдено ${blockResults.length} совпадений по блокам`, 
                         blockResults.length > 0 ? 'success' : 'info');
        
        return blockResults;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-info');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-info ${type}`;
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const parser = new TelegramChannelParser();
    const scanTextArea = document.getElementById('scan-text-area');
    const resultsContainer = document.getElementById('results-container');
    const loadTemplatesBtn = document.getElementById('load-templates-btn');
    const scanTextBtn = document.getElementById('scan-text-btn');
    const clearResultsBtn = document.getElementById('clear-results-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');

    function updateProgress(current, total) {
        const percent = Math.min(100, (current / (total || 10000)) * 100);
        progressFill.style.width = `${percent}%`;
        
        const statusElement = document.getElementById('status-info');
        if (statusElement) {
            statusElement.textContent = `Загружено ${current} сообщений...`;
        }
    }

    loadTemplatesBtn.addEventListener('click', async function() {
        progressBar.style.display = 'block';
        loadTemplatesBtn.disabled = true;
        loadTemplatesBtn.textContent = 'Загрузка...';
        
        await parser.loadTemplates(updateProgress);
        
        progressBar.style.display = 'none';
        loadTemplatesBtn.disabled = false;
        loadTemplatesBtn.textContent = 'Загрузить шаблоны из канала';
    });

    scanTextBtn.addEventListener('click', function() {
        const text = scanTextArea.value.trim();
        const matches = parser.scanText(text);
        displayResults(matches, parser.scanner.getStats());
    });

    clearResultsBtn.addEventListener('click', function() {
        scanTextArea.value = '';
        resultsContainer.innerHTML = '';
        parser.updateStatus('Готов к работе', 'info');
    });

    function displayResults(matches, stats) {
        resultsContainer.innerHTML = '';
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = `
                <div class="result-item">
                    <div class="match-header">🔍 Совпадений не найдено</div>
                    <p>Попробуйте:</p>
                    <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                        <li>Ввести более длинный текст</li>
                        <li>Проверить орфографию</li>
                        <li>Убедиться что шаблоны загружены</li>
                    </ul>
                    <div class="match-stats">
                        📊 В базе: ${stats.messageCount} сообщений
                    </div>
                </div>
            `;
            return;
        }

        matches.forEach((match, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item match';
            
            let content = `
                <div class="match-header">
                    🎯 Совпадение #${index + 1} 
                    <span style="margin-left: auto; font-size: 12px; opacity: 0.7;">
                        ${match.size || '?'} слов
                    </span>
                </div>
                <div class="match-text">${match.block}</div>
                <div class="match-stats">
                    📊 Найдено в ${match.count} сообщении(ях)
            `;
            
            if (match.messages) {
                content += `<br>📝 Примеры:<br>`;
                match.messages.forEach((msg, i) => {
                    content += `<div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">${msg.substring(0, 100)}...</div>`;
                });
            }
            
            content += `</div>`;
            resultElement.innerHTML = content;
            resultsContainer.appendChild(resultElement);
        });

        // Статистика
        const statsElement = document.createElement('div');
        statsElement.className = 'result-item';
        statsElement.innerHTML = `
            <div class="match-header">📈 Статистика</div>
            <div class="match-stats">
                • Найдено совпадений: ${matches.length}<br>
                • Сообщений в базе: ${stats.messageCount}<br>
                • Проиндексировано блоков: ${stats.sequenceCount}
            </div>
        `;
        resultsContainer.appendChild(statsElement);
    }

    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
});
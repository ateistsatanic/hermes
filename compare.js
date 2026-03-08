// Логика для страницы сравнения текстов
document.addEventListener('DOMContentLoaded', function() {
    const textArea1 = document.getElementById('text-area-1');
    const textArea2 = document.getElementById('text-area-2');
    
    // Элементы статистики сравнения
    const wordDiffElement = document.getElementById('word-diff');
    const charDiffElement = document.getElementById('char-diff');
    const ratioElement = document.getElementById('ratio');
    
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
    
    function updateComparisonStats() {
        const text1 = textArea1.value;
        const text2 = textArea2.value;
        
        const words1 = text1.trim().split(/\s+/).filter(word => word.length > 0);
        const words2 = text2.trim().split(/\s+/).filter(word => word.length > 0);
        
        const wordCount1 = words1.length;
        const wordCount2 = words2.length;
        const charCount1 = text1.length;
        const charCount2 = text2.length;
        
        // Разница в словах
        const wordDiff = wordCount1 - wordCount2;
        if (wordDiff > 0) {
            wordDiffElement.textContent = `+${wordDiff} (1-й больше)`;
            wordDiffElement.style.color = '#00ff00'; // Зеленый
        } else if (wordDiff < 0) {
            wordDiffElement.textContent = `${wordDiff} (2-й больше)`;
            wordDiffElement.style.color = '#ff4444'; // Красный
        } else {
            wordDiffElement.textContent = '0 (равны)';
            wordDiffElement.style.color = '#ffffff'; // Белый
        }
        
        // Разница в символах
        const charDiff = charCount1 - charCount2;
        if (charDiff > 0) {
            charDiffElement.textContent = `+${charDiff} (1-й больше)`;
            charDiffElement.style.color = '#00ff00';
        } else if (charDiff < 0) {
            charDiffElement.textContent = `${charDiff} (2-й больше)`;
            charDiffElement.style.color = '#ff4444';
        } else {
            charDiffElement.textContent = '0 (равны)';
            charDiffElement.style.color = '#ffffff';
        }
        
        // Соотношение
        const wordRatio = wordCount2 > 0 ? (wordCount1 / wordCount2).toFixed(2) : wordCount1 > 0 ? '∞' : '0';
        const charRatio = charCount2 > 0 ? (charCount1 / charCount2).toFixed(2) : charCount1 > 0 ? '∞' : '0';
        ratioElement.textContent = `${wordRatio}:1 (слова) / ${charRatio}:1 (символы)`;
    }
    
    // Инициализация статистики
    const stats1 = textArea1.parentElement.parentElement.querySelector('.text-stats');
    const stats2 = textArea2.parentElement.parentElement.querySelector('.text-stats');
    
    updateStats(textArea1, stats1);
    updateStats(textArea2, stats2);
    updateComparisonStats();
    
    // Обработчики событий
    function handleInput() {
        const stats1 = textArea1.parentElement.parentElement.querySelector('.text-stats');
        const stats2 = textArea2.parentElement.parentElement.querySelector('.text-stats');
        
        updateStats(textArea1, stats1);
        updateStats(textArea2, stats2);
        updateComparisonStats();
    }
    
    textArea1.addEventListener('input', handleInput);
    textArea2.addEventListener('input', handleInput);
    
    // Загрузка сохраненных текстов
    const savedText1 = localStorage.getItem('compareText1');
    const savedText2 = localStorage.getItem('compareText2');
    
    if (savedText1) {
        textArea1.value = savedText1;
        updateStats(textArea1, stats1);
    }
    
    if (savedText2) {
        textArea2.value = savedText2;
        updateStats(textArea2, stats2);
    }
    
    // Сохранение текстов
    textArea1.addEventListener('input', function() {
        localStorage.setItem('compareText1', textArea1.value);
    });
    
    textArea2.addEventListener('input', function() {
        localStorage.setItem('compareText2', textArea2.value);
    });
    
    // Обновляем сравнение при загрузке
    updateComparisonStats();
});
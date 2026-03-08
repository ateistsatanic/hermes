document.addEventListener('DOMContentLoaded', function() {
    const typingBtn = document.getElementById('typing-btn');
    const compareBtn = document.getElementById('compare-btn');
    const spellingBtn = document.getElementById('spelling-btn');
    const enhanceBtn = document.getElementById('enhance-btn');
    const scanBtn = document.getElementById('scan-btn');
    
    if (typingBtn) {
        typingBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    if (compareBtn) {
        compareBtn.addEventListener('click', function() {
            window.location.href = 'compare.html';
        });
    }

    if (spellingBtn) {
        spellingBtn.addEventListener('click', function() {
            window.location.href = 'spelling.html';
        });
    }
    
    if (enhanceBtn) {
        enhanceBtn.addEventListener('click', function() {
            window.location.href = 'enhance.html';
        });
    }

    if (scanBtn) {
        scanBtn.addEventListener('click', function() {
            window.location.href = 'scan.html';
        });
    }

    // Функция для обновления активной кнопки на текущей странице
    function updateActiveButton() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const buttons = document.querySelectorAll('.nav-btn');
        
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        switch(currentPage) {
            case 'index.html':
                if (typingBtn) typingBtn.classList.add('active');
                break;
            case 'compare.html':
                if (compareBtn) compareBtn.classList.add('active');
                break;
            case 'spelling.html':
                if (spellingBtn) spellingBtn.classList.add('active');
                break;
            case 'enhance.html':
                if (enhanceBtn) enhanceBtn.classList.add('active');
                break;
            case 'scan.html':
                if (scanBtn) scanBtn.classList.add('active');
                break;
        }
    }

    // Вызываем при загрузке страницы
    updateActiveButton();
});
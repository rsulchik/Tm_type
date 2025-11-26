// --- JS: DOM Elements ---
const typingText = document.querySelector("#paragraph");
const inpField = document.querySelector(".input-field");
const timerTag = document.querySelector(".timer");
const wpmTag = document.querySelector(".wpm-score .score-value");
const accuracyTag = document.querySelector(".accuracy");
const mistakesTag = document.querySelector(".mistakes-count");
const resultBox = document.querySelector(".result-box");
const typingBox = document.querySelector(".typing-text");
const cursor = document.querySelector(".cursor");
const timeOptions = document.querySelectorAll(".time-options .setting-option");
const difficultyOptions = document.querySelectorAll(".difficulty-options .setting-option");
const themeOptions = document.querySelectorAll(".theme-options .setting-option");
const body = document.body;

// --- Game State ---
let timer;
let maxTime = 30;
let timeLeft = maxTime;
let charIndex = 0;
let mistakes = 0;
let isTyping = false;
let startTime = 0;
let endTime = 0;
let gameSettings = {
    time: 30,
    difficulty: 'short',
    theme: 'dark'
};

// --- Word Bases (Turkmen) ---
const wordLists = {
    short: [
        "kod", "wagt", "ömür", "adam", "iş", "söz", "ýer", "ýüz", 
        "dost", "göz", "öý", "dünýä", "gezek", "el", "gün", "mesele", "fakt", 
        "mysal", "topar", "san", "ýol", "bölek", "sorag", "ýyl", 
        "iş", "görnüş", "waka", "güýç", "suw", "ata", "aýal", "ýurt", 
        "şäher", "ýer", "ulag", "kanun", "ses", "kitap", "tema", "ýagty", "gara", "ak"
    ],
    long: [
        "minimalizm", "tiz ýazmak", "klawiatura", "monitor", "programma", 
        "häsiýetnama", "internet", "işjeňlik", "synaglar", "çözgüt",
        "düşünmek", "başlangyç", "döwrebap", "tehnologiýa", "kommunikasiýa",
        "geljekde", "ünsli", "gymmatly", "tizligi", "netijelilik", 
        "aýratynlyk", "seresaply", "ýazmaly", "kompýuter", "Türkmenistan",
        "düzgünnama", "amatlylyk", "doly"
    ]
};

// --- Settings Management ---

function loadSettings() {
    const savedTheme = localStorage.getItem('typingTheme');
    if (savedTheme) {
        gameSettings.theme = savedTheme;
        body.className = savedTheme + '-theme';
        document.querySelector(`.theme-options .setting-option[data-theme="${savedTheme}"]`).classList.add('active');
        document.querySelector(`.theme-options .setting-option[data-theme="${savedTheme === 'dark' ? 'light' : 'dark'}"]`).classList.remove('active');
    }
    
    document.querySelector(`.time-options .setting-option[data-time="${gameSettings.time}"]`).classList.add('active');
    document.querySelector(`.difficulty-options .setting-option[data-difficulty="${gameSettings.difficulty}"]`).classList.add('active');
}

function handleSettingChange(event, type) {
    const selected = event.target;
    if (!selected.classList.contains('setting-option')) return;

    selected.parentElement.querySelectorAll('.setting-option').forEach(opt => opt.classList.remove('active'));
    selected.classList.add('active');
    
    if (type === 'time') {
        gameSettings.time = parseInt(selected.dataset.time);
        maxTime = gameSettings.time;
        timerTag.innerText = maxTime;
        resetGame();
    } else if (type === 'difficulty') {
        gameSettings.difficulty = selected.dataset.difficulty;
        resetGame();
    } else if (type === 'theme') {
        gameSettings.theme = selected.dataset.theme;
        body.className = gameSettings.theme + '-theme';
        localStorage.setItem('typingTheme', gameSettings.theme);
        inpField.focus();
    }
}

// --- Mobile Keyboard Handling ---
function setupMobileKeyboard() {
    // Prevent zoom on input focus (iOS specific)
    inpField.addEventListener('touchstart', function() {
        this.style.fontSize = '16px';
    });
    
    // Auto-focus when touching the typing area
    typingBox.addEventListener('touchstart', function(e) {
        e.preventDefault();
        inpField.focus();
        // Show virtual keyboard
        inpField.click();
    });
    
    // Handle virtual keyboard
    window.addEventListener('resize', function() {
        if (document.activeElement !== inpField && isTyping) {
            setTimeout(() => inpField.focus(), 100);
        }
    });
    
    // Better touch handling
    document.addEventListener('touchmove', function(e) {
        if (e.target === typingBox) {
            e.preventDefault();
        }
    }, { passive: false });
}

// --- Game Logic ---

function loadParagraph() {
    typingText.innerHTML = "";
    
    const currentWords = wordLists[gameSettings.difficulty];
    
    let paragraphHTML = "";
    for (let i = 0; i < 50; i++) {
        let word = currentWords[Math.floor(Math.random() * currentWords.length)];
        
        word.split("").forEach(char => {
            paragraphHTML += `<span>${char}</span>`;
        });
        
        paragraphHTML += `<span class="space-char"> </span>`;
    }
    
    typingText.innerHTML = paragraphHTML;
    
    const firstChar = typingText.querySelectorAll("span")[0];
    if (firstChar) {
        firstChar.classList.add("active");
        updateCursorPosition(firstChar);
    }
    
    document.addEventListener("keydown", () => inpField.focus());
    typingBox.addEventListener("click", () => inpField.focus());
}

function updateCursorPosition(element) {
    if (!element || !cursor) return;
    
    const rect = element.getBoundingClientRect();
    const textRect = typingText.getBoundingClientRect();
    
    cursor.style.transform = `translate(${rect.left - textRect.left}px, ${rect.top - textRect.top}px)`;
    cursor.style.height = `${rect.height}px`;
}

function initTyping(event) {
    const characters = typingText.querySelectorAll("span");
    const typedValue = inpField.value;

    // Play keypress feedback
    playKeypressSound();

    if (charIndex >= characters.length - 1 || timeLeft <= 0) {
        return;
    }

    if (!isTyping) {
        startTime = new Date().getTime();
        timer = setInterval(initTimer, 1000);
        isTyping = true;
    }

    let typedChar = typedValue.slice(-1);

    // 1. Handle Backspace
    if (typedValue.length < charIndex) { 
        if (charIndex > 0) {
            charIndex--;
            
            if (characters[charIndex].classList.contains("incorrect")) {
                mistakes--;
            }
            
            characters[charIndex].classList.remove("correct", "incorrect");
            characters[charIndex].classList.remove("active");
            characters[charIndex].classList.add("active");
            updateCursorPosition(characters[charIndex]);
        }
        return;
    }
    
    // 2. Handle Normal Input
    if (charIndex < characters.length) {
        characters[charIndex].classList.remove("active");
        
        const expectedChar = characters[charIndex].innerText;

        if (expectedChar === typedChar) {
            characters[charIndex].classList.add("correct");
        } else {
            mistakes++;
            characters[charIndex].classList.add("incorrect");
        }
        
        charIndex++;
        
        if (charIndex < characters.length) {
            characters[charIndex].classList.add("active");
            updateCursorPosition(characters[charIndex]);
            scrollText();
        } else {
            finishGame();
        }
    }
}

function initTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        timerTag.innerText = timeLeft;
    } else {
        finishGame();
    }
}

function scrollText() {
    const activeChar = typingText.querySelector(".active");
    if (!activeChar) return;

    const textContainer = typingBox;
    const charBottom = activeChar.offsetTop + activeChar.offsetHeight;
    
    if (charBottom > textContainer.scrollTop + textContainer.offsetHeight - 50) {
        textContainer.scrollTop += 50;
    }
}

function finishGame() {
    clearInterval(timer);
    isTyping = false;
    inpField.value = "";
    inpField.blur();

    typingBox.style.display = "none";
    resultBox.style.display = "flex";
    
    const totalTypedChars = charIndex;
    const correctTypedChars = totalTypedChars - mistakes;
    
    const timeInMinutes = maxTime / 60; 
    
    let wpm = Math.round((correctTypedChars / 5) / timeInMinutes);
    wpm = wpm < 0 || !wpm || wpm === Infinity ? 0 : wpm;
    
    let accuracy = Math.floor((correctTypedChars / totalTypedChars) * 100);
    accuracy = accuracy ? accuracy : 0;
    
    wpmTag.innerText = `${wpm}`;
    accuracyTag.innerText = `${accuracy}`;
    mistakesTag.innerText = `${mistakes}`;
    
    // Update best WPM
    updateBestWPM(wpm);
}

function updateBestWPM(currentWPM) {
    const bestWPMElement = document.getElementById('best-wpm');
    let bestWPM = parseInt(localStorage.getItem('bestWPM')) || 0;
    
    if (currentWPM > bestWPM) {
        bestWPM = currentWPM;
        localStorage.setItem('bestWPM', bestWPM.toString());
    }
    
    bestWPMElement.textContent = bestWPM;
}

function resetGame() {
    clearInterval(timer);
    timeLeft = maxTime;
    charIndex = mistakes = 0;
    isTyping = false;
    
    inpField.value = "";
    timerTag.innerText = maxTime;
    
    typingBox.style.display = "block";
    resultBox.style.display = "none";
    typingBox.scrollTop = 0;

    loadParagraph();
    
    // Force focus on mobile
    setTimeout(() => {
        inpField.focus();
    }, 100);
}

function playKeypressSound() {
    const sound = document.getElementById("keypress-sound");
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Add haptic feedback on mobile
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// --- Event Listeners ---
inpField.addEventListener("input", initTyping);

// Double tap for mobile reset
let lastTap = 0;
document.addEventListener('touchend', function(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
        event.preventDefault();
        resetGame();
    }
    lastTap = currentTime;
});

// Desktop hotkeys
document.addEventListener('keydown', function(event) {
    if (event.key === 'Tab') {
        event.preventDefault(); 
        resetGame();
    }
});

// Settings event listeners
timeOptions.forEach(option => option.addEventListener('click', (e) => handleSettingChange(e, 'time')));
difficultyOptions.forEach(option => option.addEventListener('click', (e) => handleSettingChange(e, 'difficulty')));
themeOptions.forEach(option => option.addEventListener('click', (e) => handleSettingChange(e, 'theme')));

// --- Initial Setup ---
function initializeGame() {
    loadSettings();
    setupMobileKeyboard();
    loadParagraph();
    
    // Load best WPM
    const bestWPM = localStorage.getItem('bestWPM') || '0';
    document.getElementById('best-wpm').textContent = bestWPM;
    
    // Initial focus
    setTimeout(() => {
        inpField.focus();
    }, 500);
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);
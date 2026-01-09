// Socket.io connection
const socket = io();

// Game state
let gameState = {
  sessionId: null,
  playerId: null,
  nickname: null,
  isHost: false,
  board: null,
  players: [],
  currentTurn: null,
  calledNumbers: [],
  myCompletedLines: []
};

// DOM Elements
const screens = {
  home: document.getElementById('home-screen'),
  lobby: document.getElementById('lobby-screen'),
  game: document.getElementById('game-screen'),
  winner: document.getElementById('winner-screen')
};

const elements = {
  nicknameInput: document.getElementById('nickname-input'),
  sessionInput: document.getElementById('session-input'),
  createBtn: document.getElementById('create-btn'),
  joinBtn: document.getElementById('join-btn'),
  errorMessage: document.getElementById('error-message'),
  lobbySessionCode: document.getElementById('lobby-session-code'),
  playerCount: document.getElementById('player-count'),
  lobbyPlayers: document.getElementById('lobby-players'),
  startGameBtn: document.getElementById('start-game-btn'),
  gameSessionCode: document.getElementById('game-session-code'),
  bingoBoard: document.getElementById('bingo-board'),
  turnMessage: document.getElementById('turn-message'),
  calledNumbers: document.getElementById('called-numbers'),
  gamePlayers: document.getElementById('game-players'),
  winnerName: document.getElementById('winner-name'),
  newGameBtn: document.getElementById('new-game-btn'),
  confetti: document.getElementById('confetti')
};

// Screen management
function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// Error handling
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.add('show');
  setTimeout(() => {
    elements.errorMessage.classList.remove('show');
  }, 3000);
}

// Session persistence
function saveSession() {
  sessionStorage.setItem('bingoSession', JSON.stringify({
    sessionId: gameState.sessionId,
    nickname: gameState.nickname
  }));
}

function loadSession() {
  const saved = sessionStorage.getItem('bingoSession');
  if (saved) {
    const { sessionId, nickname } = JSON.parse(saved);
    if (sessionId && nickname) {
      socket.emit('reconnect-session', { sessionId, nickname });
    }
  }
}

// Create session
elements.createBtn.addEventListener('click', () => {
  const nickname = elements.nicknameInput.value.trim();
  if (!nickname) {
    showError('Please enter a nickname');
    return;
  }
  
  gameState.nickname = nickname;
  socket.emit('create-session', { nickname });
});

// Join session
elements.joinBtn.addEventListener('click', () => {
  const nickname = elements.nicknameInput.value.trim();
  const sessionId = elements.sessionInput.value.trim().toUpperCase();
  
  if (!nickname) {
    showError('Please enter a nickname');
    return;
  }
  
  if (!sessionId) {
    showError('Please enter a session code');
    return;
  }
  
  gameState.nickname = nickname;
  socket.emit('join-session', { sessionId, nickname });
});

// Start game
elements.startGameBtn.addEventListener('click', () => {
  socket.emit('start-game', { sessionId: gameState.sessionId });
});

// New game
elements.newGameBtn.addEventListener('click', () => {
  sessionStorage.removeItem('bingoSession');
  location.reload();
});

// Render lobby players
function renderLobbyPlayers() {
  elements.lobbyPlayers.innerHTML = '';
  gameState.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = player.nickname.charAt(0).toUpperCase();
    
    const name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = player.nickname;
    
    playerDiv.appendChild(avatar);
    playerDiv.appendChild(name);
    
    if (player.id === gameState.players[0].id) {
      const badge = document.createElement('div');
      badge.className = 'host-badge';
      badge.textContent = 'Host';
      playerDiv.appendChild(badge);
    }
    
    elements.lobbyPlayers.appendChild(playerDiv);
  });
  
  elements.playerCount.textContent = gameState.players.length;
}

// Render bingo board
function renderBoard() {
  elements.bingoBoard.innerHTML = '';
  
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${i}-${j}`;
      cell.textContent = gameState.board[i][j];
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.dataset.number = gameState.board[i][j];
      
      // Check if already marked
      if (gameState.calledNumbers.includes(gameState.board[i][j])) {
        cell.classList.add('marked');
      }
      
      cell.addEventListener('click', () => handleCellClick(cell));
      
      elements.bingoBoard.appendChild(cell);
    }
  }
  
  updateCellStates();
}

// Handle cell click
function handleCellClick(cell) {
  if (cell.classList.contains('marked') || cell.classList.contains('disabled')) {
    return;
  }
  
  if (gameState.currentTurn !== gameState.playerId) {
    showError("It's not your turn!");
    return;
  }
  
  const number = parseInt(cell.dataset.number);
  socket.emit('call-number', { 
    sessionId: gameState.sessionId, 
    number 
  });
}

// Update cell states
function updateCellStates() {
  const cells = document.querySelectorAll('.cell');
  const isMyTurn = gameState.currentTurn === gameState.playerId;
  
  cells.forEach(cell => {
    const number = parseInt(cell.dataset.number);
    const isMarked = gameState.calledNumbers.includes(number);
    
    if (isMarked) {
      cell.classList.add('marked');
      cell.classList.remove('disabled');
    } else if (!isMyTurn) {
      cell.classList.add('disabled');
    } else {
      cell.classList.remove('disabled');
    }
  });
}

// Update turn indicator
function updateTurnIndicator() {
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
  if (!currentPlayer) return;
  
  if (gameState.currentTurn === gameState.playerId) {
    elements.turnMessage.textContent = "🎯 Your Turn! Click a number to call it";
    elements.turnMessage.classList.add('your-turn');
  } else {
    elements.turnMessage.textContent = `⏳ ${currentPlayer.nickname}'s Turn`;
    elements.turnMessage.classList.remove('your-turn');
  }
}

// Update called numbers
function updateCalledNumbers(latestNumber = null) {
  elements.calledNumbers.innerHTML = '';
  
  gameState.calledNumbers.slice().reverse().forEach((num, index) => {
    const numDiv = document.createElement('div');
    numDiv.className = 'called-number';
    if (index === 0 && latestNumber) {
      numDiv.classList.add('latest');
    }
    numDiv.textContent = num;
    elements.calledNumbers.appendChild(numDiv);
  });
}

// Update game players list
function updateGamePlayers() {
  elements.gamePlayers.innerHTML = '';
  
  gameState.players.forEach(player => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'game-player';
    
    if (player.id === gameState.currentTurn) {
      playerDiv.classList.add('current-turn');
    }
    
    const name = document.createElement('span');
    name.textContent = player.nickname;
    
    const progress = document.createElement('div');
    progress.className = 'player-progress';
    
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      if (i < player.completedLines.length) {
        dot.classList.add('filled');
      }
      progress.appendChild(dot);
    }
    
    playerDiv.appendChild(name);
    playerDiv.appendChild(progress);
    elements.gamePlayers.appendChild(playerDiv);
  });
}

// Update BINGO letters
function updateBingoLetters() {
  const letters = ['B', 'I', 'N', 'G', 'O'];
  const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
  
  if (myPlayer) {
    letters.forEach((letter, index) => {
      const letterEl = document.querySelector(`.letter[data-letter="${letter}"]`);
      if (myPlayer.completedLines.length > index) {
        letterEl.classList.add('completed');
      }
    });
  }
}

// Create confetti
function createConfetti() {
  const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    elements.confetti.appendChild(confetti);
  }
}

// Socket event handlers
socket.on('session-created', (data) => {
  gameState.sessionId = data.sessionId;
  gameState.playerId = data.player.id;
  gameState.isHost = true;
  gameState.players = [data.player];
  
  saveSession();
  
  elements.lobbySessionCode.textContent = data.sessionId;
  renderLobbyPlayers();
  elements.startGameBtn.style.display = 'block';
  document.querySelector('.waiting-text').style.display = 'none';
  
  showScreen('lobby');
});

socket.on('session-joined', (data) => {
  gameState.sessionId = data.sessionId;
  gameState.playerId = data.player.id;
  
  saveSession();
  
  elements.lobbySessionCode.textContent = data.sessionId;
  showScreen('lobby');
});

socket.on('player-joined', (data) => {
  gameState.players = data.players;
  renderLobbyPlayers();
});

socket.on('player-left', (data) => {
  gameState.players = data.players;
  renderLobbyPlayers();
  
  // Update host status
  if (gameState.playerId === data.players[0].id) {
    gameState.isHost = true;
    elements.startGameBtn.style.display = 'block';
    document.querySelector('.waiting-text').style.display = 'none';
  }
});

socket.on('game-started', (data) => {
  gameState.board = data.board;
  gameState.players = data.players;
  gameState.currentTurn = data.currentTurn;
  gameState.calledNumbers = data.calledNumbers || [];
  
  elements.gameSessionCode.textContent = gameState.sessionId;
  
  renderBoard();
  updateTurnIndicator();
  updateCalledNumbers();
  updateGamePlayers();
  
  showScreen('game');
});

socket.on('number-called', (data) => {
  gameState.calledNumbers = data.calledNumbers;
  gameState.currentTurn = data.currentTurn;
  gameState.players = data.players;
  
  // Update board
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    const number = parseInt(cell.dataset.number);
    if (number === data.calledNumber && !cell.classList.contains('marked')) {
      cell.classList.add('marked');
    }
  });
  
  updateCellStates();
  updateTurnIndicator();
  updateCalledNumbers(data.calledNumber);
  updateGamePlayers();
  updateBingoLetters();
  
  // Check for winner
  if (data.winner) {
    elements.winnerName.textContent = data.winner.nickname;
    createConfetti();
    setTimeout(() => {
      showScreen('winner');
    }, 1000);
  }
});

socket.on('error', (data) => {
  showError(data.message);
});

socket.on('player-disconnected', (data) => {
  showError(`${data.nickname} disconnected`);
});

// Load session on page load
window.addEventListener('load', () => {
  loadSession();
});

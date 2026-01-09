const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// In-memory storage for game sessions
const sessions = new Map();

// Helper function to generate random 5x5 board with numbers 1-25
function generateBoard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  // Shuffle using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  // Convert to 5x5 grid
  const board = [];
  for (let i = 0; i < 5; i++) {
    board.push(numbers.slice(i * 5, (i + 1) * 5));
  }
  return board;
}

// Helper function to check win condition
function checkWinCondition(markedCells) {
  const lines = [];

  // Check rows
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      row.push(`${i}-${j}`);
    }
    if (row.every((cell) => markedCells.has(cell))) {
      lines.push({ type: "row", index: i });
    }
  }

  // Check columns
  for (let j = 0; j < 5; j++) {
    const col = [];
    for (let i = 0; i < 5; i++) {
      col.push(`${i}-${j}`);
    }
    if (col.every((cell) => markedCells.has(cell))) {
      lines.push({ type: "column", index: j });
    }
  }

  // Check diagonal (top-left to bottom-right)
  const diag1 = [];
  for (let i = 0; i < 5; i++) {
    diag1.push(`${i}-${i}`);
  }
  if (diag1.every((cell) => markedCells.has(cell))) {
    lines.push({ type: "diagonal", index: 0 });
  }

  // Check diagonal (top-right to bottom-left)
  const diag2 = [];
  for (let i = 0; i < 5; i++) {
    diag2.push(`${i}-${4 - i}`);
  }
  if (diag2.every((cell) => markedCells.has(cell))) {
    lines.push({ type: "diagonal", index: 1 });
  }

  return lines;
}

// Generate unique session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Create new session
  socket.on("create-session", (data) => {
    const sessionId = generateSessionId();
    const player = {
      id: socket.id,
      nickname: data.nickname,
      board: null,
      markedCells: new Set(),
      completedLines: [],
    };

    sessions.set(sessionId, {
      id: sessionId,
      host: socket.id,
      players: [player],
      gameStarted: false,
      currentTurnIndex: 0,
      calledNumbers: [],
      winner: null,
    });

    socket.join(sessionId);
    socket.emit("session-created", { sessionId, player });
    console.log(`Session ${sessionId} created by ${data.nickname}`);
  });

  // Join existing session
  socket.on("join-session", (data) => {
    const session = sessions.get(data.sessionId);

    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    if (session.players.length >= 5) {
      socket.emit("error", { message: "Session is full (max 5 players)" });
      return;
    }

    if (session.gameStarted) {
      socket.emit("error", { message: "Game already started" });
      return;
    }

    const player = {
      id: socket.id,
      nickname: data.nickname,
      board: null,
      markedCells: new Set(),
      completedLines: [],
    };

    session.players.push(player);
    socket.join(data.sessionId);

    // Notify all players in the session
    io.to(data.sessionId).emit("player-joined", {
      players: session.players.map((p) => ({ id: p.id, nickname: p.nickname })),
      sessionId: data.sessionId,
    });

    socket.emit("session-joined", { sessionId: data.sessionId, player });
    console.log(`${data.nickname} joined session ${data.sessionId}`);
  });

  // Start game
  socket.on("start-game", (data) => {
    const session = sessions.get(data.sessionId);

    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    if (socket.id !== session.host) {
      socket.emit("error", { message: "Only host can start the game" });
      return;
    }

    if (session.players.length < 2) {
      socket.emit("error", { message: "Need at least 2 players to start" });
      return;
    }

    // Generate unique boards for each player
    session.players.forEach((player) => {
      player.board = generateBoard();
      player.markedCells = new Set();
      player.completedLines = [];
    });

    // Randomize turn order
    const turnOrder = [...session.players];
    for (let i = turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
    }
    session.players = turnOrder;
    session.currentTurnIndex = 0;
    session.gameStarted = true;
    session.calledNumbers = [];

    // Send game state to each player
    session.players.forEach((player) => {
      io.to(player.id).emit("game-started", {
        board: player.board,
        players: session.players.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          completedLines: p.completedLines,
        })),
        currentTurn: session.players[session.currentTurnIndex].id,
        calledNumbers: [],
      });
    });

    console.log(`Game started in session ${data.sessionId}`);
  });

  // Call a number
  socket.on("call-number", (data) => {
    const session = sessions.get(data.sessionId);

    if (!session || !session.gameStarted) {
      socket.emit("error", { message: "Game not started" });
      return;
    }

    const currentPlayer = session.players[session.currentTurnIndex];
    if (socket.id !== currentPlayer.id) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    if (session.calledNumbers.includes(data.number)) {
      socket.emit("error", { message: "Number already called" });
      return;
    }

    // Add number to called numbers
    session.calledNumbers.push(data.number);

    // Mark the number on all players' boards
    session.players.forEach((player) => {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (player.board[i][j] === data.number) {
            player.markedCells.add(`${i}-${j}`);
          }
        }
      }

      // Check for new completed lines
      const lines = checkWinCondition(player.markedCells);
      const newLines = lines.filter(
        (line) =>
          !player.completedLines.some(
            (cl) => cl.type === line.type && cl.index === line.index
          )
      );

      if (newLines.length > 0) {
        player.completedLines.push(...newLines);
      }

      // Check for winner (5 lines = B-I-N-G-O)
      if (player.completedLines.length >= 5 && !session.winner) {
        session.winner = player.id;
      }
    });

    // Move to next turn
    session.currentTurnIndex =
      (session.currentTurnIndex + 1) % session.players.length;

    // Broadcast update to all players
    const gameState = {
      calledNumber: data.number,
      calledNumbers: session.calledNumbers,
      currentTurn: session.players[session.currentTurnIndex].id,
      players: session.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        completedLines: p.completedLines,
      })),
      winner: session.winner
        ? {
            id: session.winner,
            nickname: session.players.find((p) => p.id === session.winner)
              .nickname,
          }
        : null,
    };

    io.to(data.sessionId).emit("number-called", gameState);

    if (session.winner) {
      console.log(
        `Player ${
          session.players.find((p) => p.id === session.winner).nickname
        } won in session ${data.sessionId}`
      );
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Find and update sessions
    sessions.forEach((session, sessionId) => {
      const playerIndex = session.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = session.players[playerIndex];

        if (!session.gameStarted) {
          // Remove player from lobby
          session.players.splice(playerIndex, 1);

          if (session.players.length === 0) {
            sessions.delete(sessionId);
            console.log(`Session ${sessionId} deleted (no players)`);
          } else {
            // Assign new host if needed
            if (session.host === socket.id) {
              session.host = session.players[0].id;
            }

            io.to(sessionId).emit("player-left", {
              players: session.players.map((p) => ({
                id: p.id,
                nickname: p.nickname,
              })),
              playerId: socket.id,
              nickname: player.nickname,
            });
          }
        } else {
          // Notify players that someone left during game
          io.to(sessionId).emit("player-disconnected", {
            playerId: socket.id,
            nickname: player.nickname,
          });
        }
      }
    });
  });

  // Reconnect to session
  socket.on("reconnect-session", (data) => {
    const session = sessions.get(data.sessionId);

    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    const player = session.players.find((p) => p.nickname === data.nickname);

    if (player) {
      // Update socket ID
      const oldId = player.id;
      player.id = socket.id;

      // Update host if needed
      if (session.host === oldId) {
        session.host = socket.id;
      }

      // Update current turn if needed
      const currentPlayer = session.players[session.currentTurnIndex];

      socket.join(data.sessionId);

      if (session.gameStarted) {
        socket.emit("game-started", {
          board: player.board,
          players: session.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            completedLines: p.completedLines,
          })),
          currentTurn: currentPlayer.id,
          calledNumbers: session.calledNumbers,
          reconnected: true,
        });
      } else {
        socket.emit("session-joined", {
          sessionId: data.sessionId,
          player: { id: player.id, nickname: player.nickname },
        });

        io.to(data.sessionId).emit("player-joined", {
          players: session.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
          })),
          sessionId: data.sessionId,
        });
      }

      console.log(`${data.nickname} reconnected to session ${data.sessionId}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Bingo server running on http://localhost:${PORT}`);
});

# 🎯 Bingo Game - Multiplayer Web App

A stunning real-time multiplayer Bingo game with mobile-first design, built with Node.js and Socket.io.

![Bingo Game](https://img.shields.io/badge/Game-Bingo-purple?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-blue?style=for-the-badge)

## ✨ Features

- 🎮 **Real-time Multiplayer** - 2-5 players per session
- 🎨 **Beautiful UI** - Mobile-first design with glassmorphism effects
- 🔄 **Turn-based Gameplay** - Automatic turn rotation
- 🏆 **B-I-N-G-O Win Detection** - Complete 5 lines to win
- 💾 **Session Persistence** - Survives page refresh
- 🎊 **Smooth Animations** - Confetti celebrations and transitions
- 🌐 **WebSocket Communication** - Instant updates for all players

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd bingo-game

# Install dependencies
npm install

# Start the server
npm start
```

Open `http://localhost:3000` in your browser to play!

## 🎮 How to Play

1. **Create a Game**: Enter your nickname and click "Create New Game"
2. **Share Session Code**: Give the code to your friends
3. **Start Playing**: Host starts the game when 2-5 players join
4. **Take Turns**: Click numbers on your turn to call them
5. **Win**: First to complete 5 lines (B-I-N-G-O) wins! 🏆

## 🏗️ Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Frontend**: Vanilla JavaScript
- **Styling**: CSS3 with custom design system

## 📦 Project Structure

```
bingo-game/
├── server.js          # Express + Socket.io server
├── package.json       # Dependencies
├── render.yaml        # Render deployment config
└── public/
    ├── index.html     # Game interface
    ├── styles.css     # Design system
    └── app.js         # Client-side logic
```

## 🌐 Deployment

This app is configured for easy deployment on [Render](https://render.com):

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Deploy automatically!

See `render.yaml` for configuration details.

## 📝 License

MIT

## 🎉 Enjoy the Game!

Have fun playing Bingo with your friends! 🎯

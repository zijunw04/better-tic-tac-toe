const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });
  

  const lobbies = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
  
    socket.on('joinLobby', (lobbyId, username) => {
      console.log(`User ${username} (${socket.id}) joining lobby ${lobbyId}`);
      if (!lobbies.has(lobbyId)) {
        console.log(`Creating new lobby ${lobbyId}`);
        lobbies.set(lobbyId, {
          users: [],
          activePlayers: [],
          spectators: [],
          gameState: null,
          gameInProgress: false,
          owner: null,
        });
      }
    
      const lobby = lobbies.get(lobbyId);
      const user = { id: socket.id, username };
      
      lobby.users.push(user);
      if (!lobby.owner) {
        console.log(`Setting ${username} (${socket.id}) as lobby owner`);
        lobby.owner = socket.id;
      }
      
      socket.join(lobbyId);
    
      console.log(`Emitting lobbyUpdate for ${lobbyId}:`, lobby);
      io.to(lobbyId).emit('lobbyUpdate', lobby);
    });
    
    socket.on('toggleReady', (lobbyId) => {
      console.log(`Toggle ready in lobby ${lobbyId}`);
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        console.error('Invalid lobby');
        return;
      }
      const user = lobby.users.find(u => u.id === socket.id);
      if (user) {
        user.isReady = !user.isReady;
        io.to(lobbyId).emit('lobbyUpdate', lobby);
      }
    });

    socket.on('startGame', (lobbyId, selectedPlayers) => {
      console.log(`Start game requested for lobby ${lobbyId} by ${socket.id}`);
      const lobby = lobbies.get(lobbyId);
      if (!lobby || socket.id !== lobby.owner) {
        console.error('Invalid lobby or not the owner');
        return;
      }
      
      lobby.gameInProgress = true;
      lobby.activePlayers = selectedPlayers.map(id => lobby.users.find(u => u.id === id));
      lobby.spectators = lobby.users.filter(u => !selectedPlayers.includes(u.id));
      lobby.gameState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        moveHistory: [],
      };
    
      console.log(`Starting game in lobby ${lobbyId}`);
      io.to(lobbyId).emit('gameStart', lobby);
    });
    
    
  
    socket.on('makeMove', ({ lobbyId, index }) => {
      console.log(`Received makeMove: lobbyId=${lobbyId}, index=${index}`);
      const lobby = lobbies.get(lobbyId);
      if (!lobby || !lobby.gameState) {
        console.error(`Invalid lobby or game state: ${lobbyId}`);
        return;
      }
      const game = lobby.gameState;
    
      // Check if it's the correct player's turn
      const playerIndex = lobby.activePlayers.findIndex(p => p.id === socket.id);
      const playerSymbol = playerIndex === 0 ? 'X' : 'O';
    
      if (game.board[index] === null && !game.winner && game.currentPlayer === playerSymbol) {
        game.board[index] = game.currentPlayer;
        game.moveHistory.push({ player: game.currentPlayer, index });
        
        const playerMoves = game.moveHistory.filter(move => move.player === game.currentPlayer);
        if (playerMoves.length > 3) {
          const oldestMove = playerMoves[0];
          game.board[oldestMove.index] = null;
          game.moveHistory = game.moveHistory.filter(move => move !== oldestMove);
        }
        
        game.winner = calculateWinner(game.board);
        game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
        io.to(lobbyId).emit('gameUpdate', lobby);
      } else {
        console.log('Invalid move:', { index, currentPlayer: game.currentPlayer, board: game.board, winner: game.winner });
      }
    });
    

    socket.on('rematch', (lobbyId) => {
      console.log(`Rematch requested in lobby ${lobbyId}`);
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        console.error('Invalid lobby');
        return;
      }
      
      lobby.gameState = null;
      lobby.gameInProgress = false;
      
      lobby.users = [...lobby.activePlayers, ...lobby.spectators, ...lobby.users];
      lobby.activePlayers = [];
      lobby.spectators = [];
      
      lobby.users = Array.from(new Set(lobby.users.map(u => u.id)))
        .map(id => lobby.users.find(u => u.id === id));

      lobby.users.forEach(user => user.isReady = false);

      io.to(lobbyId).emit('returnToLobby');
      io.to(lobbyId).emit('lobbyUpdate', lobby);
    });

    socket.on('disconnecting', () => {
      console.log(`Client disconnecting: ${socket.id}`);
      for (const room of socket.rooms) {
        if (lobbies.has(room)) {
          const lobby = lobbies.get(room);
          lobby.users = lobby.users.filter(user => user.id !== socket.id);
          lobby.activePlayers = lobby.activePlayers.filter(player => player.id !== socket.id);
          lobby.spectators = lobby.spectators.filter(spectator => spectator.id !== socket.id);
          
          if (lobby.owner === socket.id && lobby.users.length > 0) {
            lobby.owner = lobby.users[0].id;
          }
          
          if (lobby.users.length === 0 && lobby.spectators.length === 0) {
            lobbies.delete(room);
          } else {
            io.to(room).emit('lobbyUpdate', lobby);
          }
        }
      }
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});

function calculateWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

let lobbies = new Map();

export async function POST(req) {
  const { action, lobbyId, username, playerId, index } = await req.json();

  switch (action) {
    case 'joinLobby':
      return joinLobby(lobbyId, username);
    case 'togglePlayerSelection':
      return togglePlayerSelection(lobbyId, playerId);
    case 'startGame':
      return startGame(lobbyId);
    case 'makeMove':
      return makeMove(lobbyId, playerId, index);
    case 'rematch':
      return rematch(lobbyId);
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lobbyId = searchParams.get('lobbyId');
  const lobby = lobbies.get(lobbyId);
  
  if (lobby) {
    return NextResponse.json(lobby);
  } else {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }
}

function joinLobby(lobbyId, username) {
  if (!lobbies.has(lobbyId)) {
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
  const playerId = nanoid();
  const user = { id: playerId, username };
  
  lobby.users.push(user);
  if (!lobby.owner) {
    lobby.owner = playerId;
  }
  
  return NextResponse.json({ lobby, playerId });
}

function togglePlayerSelection(lobbyId, playerId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const selectedPlayerIndex = lobby.activePlayers.findIndex(p => p.id === playerId);
  if (selectedPlayerIndex !== -1) {
    lobby.activePlayers.splice(selectedPlayerIndex, 1);
  } else if (lobby.activePlayers.length < 2) {
    const player = lobby.users.find(u => u.id === playerId);
    if (player) {
      lobby.activePlayers.push(player);
    }
  }

  return NextResponse.json(lobby);
}

function startGame(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  lobby.gameInProgress = true;
  lobby.gameState = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    moveHistory: [],
  };

  return NextResponse.json(lobby);
}

function makeMove(lobbyId, playerId, index) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || !lobby.gameState) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const game = lobby.gameState;
  const playerIndex = lobby.activePlayers.findIndex(p => p.id === playerId);
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
  }

  return NextResponse.json(lobby);
}

function rematch(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }
  
  lobby.gameState = null;
  lobby.gameInProgress = false;
  
  lobby.users = [...lobby.activePlayers, ...lobby.spectators, ...lobby.users];
  lobby.activePlayers = [];
  lobby.spectators = [];
  
  lobby.users = Array.from(new Set(lobby.users.map(u => u.id)))
    .map(id => lobby.users.find(u => u.id === id));

  lobby.users.forEach(user => user.isReady = false);

  return NextResponse.json(lobby);
}

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

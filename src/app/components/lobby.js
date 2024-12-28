'use client'
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import TicTacToe from './tictactoe';

const Lobby = ({ lobbyId }) => {
  const [socket, setSocket] = useState(null);
  const [lobby, setLobby] = useState({
    users: [],
    activePlayers: [],
    spectators: [],
    gameInProgress: false,
    owner: null,
  });
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('lobbyUpdate', (updatedLobby) => {
      console.log('Lobby updated:', updatedLobby);
      setLobby(updatedLobby);
      setGameStarted(updatedLobby.gameInProgress);
      if (!updatedLobby.gameInProgress) {
        setSelectedPlayers([]);
      }
    });

    newSocket.on('gameStart', (updatedLobby) => {
      console.log('Game started:', updatedLobby);
      setLobby(updatedLobby);
      setGameStarted(true);
    });

    newSocket.on('returnToLobby', () => {
      setGameStarted(false);
      setSelectedPlayers([]);
    });

    return () => {
      newSocket.off('lobbyUpdate');
      newSocket.off('gameStart');
      newSocket.off('returnToLobby');
      newSocket.close();
    };
  }, [lobbyId]);

  const joinLobby = () => {
    if (username && socket) {
      socket.emit('joinLobby', lobbyId, username);
      setJoined(true);
    }
  };

  const togglePlayerSelection = (userId) => {
    if (socket.id !== lobby.owner) return;
    setSelectedPlayers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else if (prev.length < 2) {
        return [...prev, userId];
      }
      return prev;
    });
  };

  const startGame = () => {
    if (socket && selectedPlayers.length === 2 && socket.id === lobby.owner) {
      socket.emit('startGame', lobbyId, selectedPlayers);
    }
  };

  const handleReturnToLobby = () => {
    setGameStarted(false);
  };

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="mb-4 p-2 border rounded"
        />
        <button onClick={joinLobby} className="bg-blue-500 text-white px-4 py-2 rounded">
          Join Lobby
        </button>
      </div>
    );
  }

  if (gameStarted) {
    return <TicTacToe lobbyId={lobbyId} socket={socket} lobby={lobby} onReturnToLobby={handleReturnToLobby} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Lobby: {lobbyId}</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-2">Users in Lobby:</h3>
        <ul className="mb-4">
          {lobby.users.map(user => (
            <li key={user.id} className="flex items-center justify-between mb-2">
              <span>{user.username} {user.isReady ? '(Ready)' : ''}</span>
              {socket.id === lobby.owner && (
                <button
                  onClick={() => togglePlayerSelection(user.id)}
                  className={`px-2 py-1 rounded ${
                    selectedPlayers.includes(user.id) ? 'bg-green-500 text-white' : 'bg-gray-200'
                  }`}
                  disabled={lobby.gameInProgress}
                >
                  {selectedPlayers.includes(user.id) ? 'Selected' : 'Select'}
                </button>
              )}
            </li>
          ))}
        </ul>
        {socket.id === lobby.owner && (
          <button
            onClick={startGame}
            disabled={selectedPlayers.length !== 2 || lobby.gameInProgress}
            className={`px-4 py-2 rounded ${
              selectedPlayers.length === 2 && !lobby.gameInProgress ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}
          >
            Start Game
          </button>
        )}
        {socket.id !== lobby.owner && (
          <p className="text-gray-600">Waiting for lobby owner to start the game...</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
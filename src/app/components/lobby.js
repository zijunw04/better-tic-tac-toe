'use client'
import { useEffect, useState } from 'react';
import TicTacToe from './tictactoe';

const Lobby = ({ lobbyId }) => {
  const [lobby, setLobby] = useState({
    users: [],
    activePlayers: [],
    spectators: [],
    gameInProgress: false,
    owner: null,
  });
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    const pollLobby = async () => {
      const response = await fetch(`/api/lobby?lobbyId=${lobbyId}`);
      if (response.ok) {
        const updatedLobby = await response.json();
        setLobby(updatedLobby);
      }
    };

    if (joined) {
      const intervalId = setInterval(pollLobby, 1000);
      return () => clearInterval(intervalId);
    }
  }, [lobbyId, joined]);

  const joinLobby = async () => {
    if (username) {
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'joinLobby', lobbyId, username }),
      });
      if (response.ok) {
        const { lobby: updatedLobby, playerId: newPlayerId } = await response.json();
        setLobby(updatedLobby);
        setPlayerId(newPlayerId);
        setJoined(true);
      }
    }
  };

  const togglePlayerSelection = async (userId) => {
    if (playerId !== lobby.owner) return;
    const response = await fetch('/api/lobby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'togglePlayerSelection', lobbyId, playerId: userId }),
    });
    if (response.ok) {
      const updatedLobby = await response.json();
      setLobby(updatedLobby);
    }
  };

  const startGame = async () => {
    if (playerId === lobby.owner && lobby.activePlayers.length === 2) {
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startGame', lobbyId }),
      });
      if (response.ok) {
        const updatedLobby = await response.json();
        setLobby(updatedLobby);
      }
    }
  };

  const handleReturnToLobby = async () => {
    const response = await fetch('/api/lobby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rematch', lobbyId }),
    });
    if (response.ok) {
      const updatedLobby = await response.json();
      setLobby(updatedLobby);
    }
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

  if (lobby.gameInProgress) {
    return <TicTacToe lobbyId={lobbyId} playerId={playerId} lobby={lobby} onReturnToLobby={handleReturnToLobby} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Lobby: {lobbyId}</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-2">Users in Lobby:</h3>
        <ul className="mb-4">
          {lobby.users.map(user => (
            <li key={user.id} className="flex items-center justify-between mb-2">
              <span>{user.username}</span>
              {playerId === lobby.owner && (
                <button
                  onClick={() => togglePlayerSelection(user.id)}
                  className={`px-2 py-1 rounded ${
                    lobby.activePlayers.some(p => p.id === user.id) ? 'bg-green-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {lobby.activePlayers.some(p => p.id === user.id) ? 'Selected' : 'Select'}
                </button>
              )}
            </li>
          ))}
        </ul>
        {playerId === lobby.owner ? (
          <button
            onClick={startGame}
            disabled={lobby.activePlayers.length !== 2}
            className={`w-full px-4 py-2 rounded ${
              lobby.activePlayers.length === 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}
          >
            Start Game
          </button>
        ) : (
          <p className="text-center text-gray-600">Waiting for lobby owner to start the game...</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;

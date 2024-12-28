'use client'
import { useEffect, useState } from 'react';

const TicTacToe = ({ lobbyId, playerId, lobby, onReturnToLobby }) => {
  const [gameState, setGameState] = useState(lobby.gameState);
  const [playerSymbol, setPlayerSymbol] = useState(null);

  useEffect(() => {
    const player = lobby.activePlayers.find(p => p.id === playerId);
    setPlayerSymbol(player ? (lobby.activePlayers.indexOf(player) === 0 ? 'X' : 'O') : null);

    const pollGameState = async () => {
      const response = await fetch(`/api/lobby?lobbyId=${lobbyId}`);
      if (response.ok) {
        const updatedLobby = await response.json();
        setGameState(updatedLobby.gameState);
      }
    };

    const intervalId = setInterval(pollGameState, 1000);
    return () => clearInterval(intervalId);
  }, [lobbyId, playerId, lobby.activePlayers]);

  const makeMove = async (index) => {
    if (gameState && gameState.board[index] === null && !gameState.winner && gameState.currentPlayer === playerSymbol) {
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'makeMove', lobbyId, playerId, index }),
      });
      if (response.ok) {
        const updatedLobby = await response.json();
        setGameState(updatedLobby.gameState);
      }
    }
  };

  const rematch = async () => {
    await onReturnToLobby();
  };

  const getCellStyle = (value) => {
    let baseStyle = "w-20 h-20 text-4xl font-bold rounded-lg transition-all duration-300 ";
    if (value === 'X') {
      return baseStyle + "bg-blue-500 text-white hover:bg-blue-600";
    } else if (value === 'O') {
      return baseStyle + "bg-red-500 text-white hover:bg-red-600";
    }
    return baseStyle + "bg-gray-200 hover:bg-gray-300";
  };

  const isSpectator = !playerSymbol;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Sliding Tic Tac Toe</h2>
        <div className="mb-4 text-center">
          {isSpectator ? (
            <p className="text-lg text-gray-600">You are spectating</p>
          ) : (
            <p className="text-lg">You are player <span className={`font-bold ${playerSymbol === 'X' ? 'text-blue-500' : 'text-red-500'}`}>{playerSymbol}</span></p>
          )}
        </div>
        {gameState && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {gameState.board.map((cell, index) => (
                <button
                  key={index}
                  className={getCellStyle(cell)}
                  onClick={() => makeMove(index)}
                  disabled={isSpectator || gameState.winner || cell !== null || gameState.currentPlayer !== playerSymbol}
                >
                  {cell}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-gray-600">Current turn: <span className={`font-bold ${gameState.currentPlayer === 'X' ? 'text-blue-500' : 'text-red-500'}`}>{gameState.currentPlayer}</span></p>
            </div>
            {gameState.winner && (
              <div className="mt-4 text-center">
                <p className="text-2xl font-bold">Winner: {gameState.winner}</p>
                <button
                  onClick={rematch}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Rematch
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TicTacToe;

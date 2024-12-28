'use client'

import { useState } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';

export default function Home() {
  const [inviteCode, setInviteCode] = useState('');

  const generateInviteCode = () => {
    const newCode = nanoid(6);
    setInviteCode(newCode);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">Tic Tac Toe Battle</h1>
      <button
        onClick={generateInviteCode}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Generate Invite Code
      </button>
      {inviteCode && (
        <div className="mb-4">
          <p>Invite Code: {inviteCode}</p>
          <Link href={`/game/${inviteCode}`}>
            <span className="text-blue-500 underline cursor-pointer">Join Game</span>
          </Link>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold mb-2">Join Existing Game</h2>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Enter invite code"
          className="border p-2 mr-2"
        />
        <Link href={`/game/${inviteCode}`}>
          <span className="bg-green-500 text-white px-4 py-2 rounded cursor-pointer">Join</span>
        </Link>
      </div>
    </div>
  );
}

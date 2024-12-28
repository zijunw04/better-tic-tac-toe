'use client'

import { useParams } from 'next/navigation';
import Lobby from '../../components/lobby';

export default function GamePage() {
  const params = useParams();
  const lobbyId = params.inviteCode; // Change this from lobbyId to inviteCode

  console.log('GamePage rendered. LobbyId:', lobbyId);

  return <Lobby lobbyId={lobbyId} />;
}

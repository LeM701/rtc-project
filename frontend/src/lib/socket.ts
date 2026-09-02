import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

// Lazily created + reused across the app: components ask for "the" socket,
// they don't each create their own connection.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      withCredentials: true, // sends the httpOnly session cookie in the handshake
      autoConnect: false,
    });
  }
  return socket;
}

import { io } from 'socket.io-client';

export const socket = io('http://0.0.0.0:5000');
console.log(socket);
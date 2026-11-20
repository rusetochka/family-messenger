import type {Socket} from 'socket.io-client';
export function getSocket():Socket|null{return null;}
export function connectSocket(_token:string):Socket|null{return null;}
export function disconnectSocket(){}
export function useSocket(_onEvent:(socket:Socket)=>()=>void){}

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientMessage,
  ClientRole,
  FullGameState,
  PlayerGameState,
  ServerMessage,
  TvGameState,
  UserAccount,
} from '../shared/types';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting';

interface UseGameSocketOptions {
  role: ClientRole;
  accountId?: string;
  playerId?: string;
  onAccountRegistered?: (account: UserAccount) => void;
}

export function useGameSocket({
  role,
  accountId,
  playerId,
  onAccountRegistered,
}: UseGameSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [tvState, setTvState] = useState<TvGameState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerGameState | null>(null);
  const [dmState, setDmState] = useState<FullGameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<{ id: number; message: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<ClientMessage[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const roleRef = useRef(role);
  const accountIdRef = useRef(accountId);
  const playerIdRef = useRef(playerId);
  const onAccountRegisteredRef = useRef(onAccountRegistered);

  roleRef.current = role;
  accountIdRef.current = accountId;
  playerIdRef.current = playerId;
  onAccountRegisteredRef.current = onAccountRegistered;

  const clearError = useCallback(() => {
    setLastError(null);
    setErrorNotice(null);
  }, []);

  const sendRaw = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pendingQueueRef.current.push(msg);
    }
  }, []);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        retryCountRef.current = 0;
        setStatus('connected');
        setLastError(null);

        ws.send(
          JSON.stringify({
            type: 'join',
            role: roleRef.current,
            accountId: accountIdRef.current,
            playerId: playerIdRef.current,
          } satisfies ClientMessage)
        );

        if (pendingQueueRef.current.length > 0) {
          const queued = [...pendingQueueRef.current];
          pendingQueueRef.current = [];
          for (const item of queued) {
            ws.send(JSON.stringify(item));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          if (msg.type === 'tv:state') {
            setTvState(msg.payload);
          } else if (msg.type === 'player:state') {
            setPlayerState(msg.payload);
          } else if (msg.type === 'dm:state') {
            setDmState(msg.payload);
          } else if (msg.type === 'account:registered') {
            onAccountRegisteredRef.current?.(msg.account);
          } else if (msg.type === 'error') {
            setLastError(msg.message);
            setErrorNotice({ id: Date.now() + Math.random(), message: msg.message });
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setStatus('reconnecting');
        const delay = Math.min(5000, 800 * Math.pow(1.6, retryCountRef.current));
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setLastError('Потеряно соединение с сервером');
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Re-join immediately if role, accountId, or playerId changes while connected
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'join',
          role,
          accountId,
          playerId,
        } satisfies ClientMessage)
      );
    }
  }, [role, accountId, playerId]);

  return {
    status,
    tvState,
    playerState,
    dmState,
    lastError,
    errorNotice,
    clearError,
    send: sendRaw,
  };
}

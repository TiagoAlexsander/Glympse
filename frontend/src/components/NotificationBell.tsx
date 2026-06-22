import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useNotifications } from '@/contexts/NotificationContext';

// Ícones de tipo de notificação
const NOTIF_ICON: Record<string, string> = {
  ORDER_CONFIRMED:  '✅',
  ORDER_SHIPPED:    '🚚',
  ORDER_DELIVERED:  '📦',
  ORDER_CANCELLED:  '❌',
  PAYMENT_APPROVED: '💳',
  PAYMENT_FAILED:   '⚠️',
  BACK_IN_STOCK:    '🛍️',
  PROMOTIONAL:      '🏷️',
  SYSTEM:           '🔔',
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif, loadNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  // Atualiza a lista na hora ao abrir o sino (sem esperar o polling de 60s)
  function toggleOpen() {
    setOpen(v => {
      if (!v) loadNotifications();
      return !v;
    });
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleClick(notif: typeof notifications[0]) {
    if (!notif.is_read) markRead(notif.id);
    // Navega para o pedido se houver order_id nos dados
    if (notif.data?.order_id) {
      navigate(`/orders/${notif.data.order_id}`);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Botão sino */}
      <button
        onClick={toggleOpen}
        className="relative flex h-8 w-8 items-center justify-center text-foreground/70 hover:text-foreground transition"
        title="Notificações"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-display text-xs font-bold uppercase tracking-widest">
              Notificações {unreadCount > 0 && <span className="ml-1 text-destructive">({unreadCount})</span>}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllRead(); }}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Marcar lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Nenhuma notificação.</p>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-secondary transition ${
                    !notif.is_read ? 'bg-secondary/60' : ''
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">
                    {NOTIF_ICON[notif.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs text-foreground ${!notif.is_read ? 'font-bold' : 'font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(notif.id); }}
                    className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

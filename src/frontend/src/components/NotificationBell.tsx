import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, Check, CheckCheck, Clock } from "lucide-react";
import { useState } from "react";
import type { Notification } from "../backend";
import {
  useClearAllNotifications,
  useGetNotifications,
  useGetUnreadNotificationCount,
  useMarkNotificationRead,
} from "../hooks/useQueries";

function relativeTime(createdAt: bigint): string {
  const ms = Number(createdAt) / 1_000_000;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Precis nu";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days === 1 ? "" : "ar"} sedan`;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: bigint, postId: bigint) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  return (
    <button
      type="button"
      onClick={() => onRead(notification.id, notification.postId)}
      className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-accent/60 group ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
      data-ocid="notification.item"
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`shrink-0 mt-0.5 h-2 w-2 rounded-full ${
            !notification.isRead ? "bg-primary" : "bg-transparent"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${!notification.isRead ? "font-medium text-foreground" : "text-foreground/80"}`}
          >
            <span className="font-semibold">{notification.commenterAlias}</span>{" "}
            kommenterade ditt inlägg{" "}
            <span className="italic text-primary/80">
              "{notification.postTitle}"
            </span>
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {relativeTime(notification.createdAt)}
          </div>
        </div>
        <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>
    </button>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: notifications = [] } = useGetNotifications();
  const { data: unreadCount = BigInt(0) } = useGetUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();
  const clearAllMutation = useClearAllNotifications();

  const unreadNum = Number(unreadCount);

  const handleMarkRead = async (notificationId: bigint, postId: bigint) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
    } catch {
      // Best-effort
    }
    setOpen(false);
    navigate({ to: `/post/${postId.toString()}` });
  };

  const handleClearAll = async () => {
    try {
      await clearAllMutation.mutateAsync();
    } catch {
      // Best-effort
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          data-ocid="notification.bell.toggle"
          aria-label="Notiser"
        >
          {unreadNum > 0 ? (
            <BellRing className="h-5 w-5 text-foreground animate-[bell-ring_0.5s_ease]" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadNum > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4.5 min-w-[1.125rem] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none"
              data-ocid="notification.bell.badge"
            >
              {unreadNum > 99 ? "99+" : unreadNum}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-xl"
        data-ocid="notification.popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h3 className="text-sm font-semibold text-foreground">Notiser</h3>
          {notifications.some((n) => !n.isRead) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              data-ocid="notification.clear_all_button"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Markera alla som lästa
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div
              className="py-10 text-center text-sm text-muted-foreground"
              data-ocid="notification.empty_state"
            >
              Inga notiser
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id.toString()}
                  notification={n}
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

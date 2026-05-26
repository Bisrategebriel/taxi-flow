import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { getUserNotifications } from "@/app/(admin)/admin/_actions/notifications";
import NotificationsView from "./_components/NotificationsView";

export default async function UserNotificationsPage() {
  const notifications = await getUserNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto w-full md:max-w-2xl md:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} className="text-muted-foreground" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Bell size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
      </div>

      <NotificationsView notifications={notifications} />
    </div>
  );
}

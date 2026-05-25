"use client";

import { useTransition } from "react";
import { suspendUser, unsuspendUser, setRole } from "@/app/(admin)/admin/_actions/users";

interface UserActionsProps {
  userId: string;
  isSuspended: boolean;
  userRole: string;
  viewerRole: string;
}

export default function UserActions({ userId, isSuspended, userRole, viewerRole }: UserActionsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isSuspended ? (
        <button
          disabled={pending}
          onClick={() => startTransition(() => unsuspendUser(userId))}
          className="px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 disabled:opacity-50 transition-colors"
        >
          Unsuspend
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => startTransition(() => suspendUser(userId))}
          className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-50 transition-colors"
        >
          Suspend
        </button>
      )}

      {viewerRole === "super_admin" && (
        <select
          disabled={pending}
          value={userRole}
          onChange={(e) =>
            startTransition(() =>
              setRole(userId, e.target.value as "user" | "admin" | "super_admin")
            )
          }
          className="px-2 py-1 rounded text-xs border border-border bg-background text-foreground disabled:opacity-50"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
      )}
    </div>
  );
}

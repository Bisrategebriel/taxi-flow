import { Bot } from "lucide-react";

export default function AdminAiChatPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot size={28} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">AI Chat Control</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Chat session management, prompt configuration, and AI audit logs — coming in a future phase.
        </p>
      </div>
    </div>
  );
}

"use client";

interface GreetingMessageProps {
  name: string | null;
}

export default function GreetingMessage({ name }: GreetingMessageProps) {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning"
    : hour >= 12 && hour < 17 ? "Good afternoon"
    : hour >= 17 && hour < 21 ? "Good evening"
    : "Good night";

  const addressee = name ? `, ${name.split(" ")[0]}` : "";

  return (
    <h3 className="text-lg font-semibold text-foreground">
      {greeting}{addressee} 👋
    </h3>
  );
}

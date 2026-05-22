// NFR-US-07 — confirm before destructive action
"use client";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/Card";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function EndTripModal({ open, onClose, onConfirm, isLoading }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative z-10 w-87.5">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>End this trip?</CardTitle>
            <CardDescription>
              You&apos;ll be taken to the payment screen to complete your journey.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex gap-3 border-t-0 bg-transparent">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isLoading}
              onClick={onClose}
            >
              Continue Trip
            </Button>

            <Button
              className="flex-1"
              disabled={isLoading}
              onClick={onConfirm}
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Ending…
                </>
              ) : (
                "End & Pay ›"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

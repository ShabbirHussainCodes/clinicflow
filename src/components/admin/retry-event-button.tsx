"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { retryEventAction } from "@/app/admin/(protected)/actions";
import { Button } from "@/components/ui/button";

export function RetryEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
        onClick={() =>
          startTransition(async () => {
            const result = await retryEventAction({ id });
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
      >
        Retry
      </Button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}

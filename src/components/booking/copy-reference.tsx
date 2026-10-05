"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CopyReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be blocked (insecure context, permissions); the reference is
      // visible on the page anyway, so failing quietly is acceptable.
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={copy}
        icon={
          copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )
        }
      >
        {copied ? "Copied" : "Copy reference"}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Booking reference copied to clipboard" : ""}
      </span>
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function CountingOrderButton() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // This function will be called when the button is clicked
  const handleOpenSettings = () => {
    // Use a custom event to communicate with the inventory page
    const event = new CustomEvent("openCountingOrderSettings");
    window.dispatchEvent(event);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleOpenSettings}
      className="flex items-center gap-1"
    >
      <Settings className="h-4 w-4" />
      <span>Counting Order</span>
    </Button>
  );
}

import React, { createContext, useContext, useState } from "react";

interface MaskingContextType {
  revealedId: string | null;
  setRevealedId: (id: string | null) => void;
}

const MaskingContext = createContext<MaskingContextType | undefined>(undefined);

export function MaskingProvider({ children }: { children: React.ReactNode }) {
  const [revealedId, setRevealedId] = useState<string | null>(null);

  return (
    <MaskingContext.Provider value={{ revealedId, setRevealedId }}>
      {children}
    </MaskingContext.Provider>
  );
}

export function useMasking() {
  const context = useContext(MaskingContext);
  if (context === undefined) {
    // Graceful fallback if provider is missing
    return { revealedId: null, setRevealedId: () => {} };
  }
  return context;
}

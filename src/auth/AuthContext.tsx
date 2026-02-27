import React from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  needsMfa: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);


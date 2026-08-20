import { createContext, useContext } from 'react';

// Pro entitlement. Default = unlocked (no auth configured = everything free).
export const EntitlementContext = createContext({ pro: true, plan: null, signedIn: false });
export const useEntitlement = () => useContext(EntitlementContext);

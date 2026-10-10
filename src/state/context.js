import { createContext, useContext } from "react";

export const GlobalContext = createContext(null);
export const ToastContext = createContext(null);

export function useGlobal() {
  const value = useContext(GlobalContext);
  if (!value) throw new Error("useGlobal must be used inside <GlobalProvider>");
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

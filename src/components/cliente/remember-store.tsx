"use client";
import { useEffect } from "react";

export const LAST_STORE_KEY = "laundromat:ultima-loja";

/** Guarda a última lavanderia visitada (tela inicial oferece "continuar"). */
export function RememberStore({ slug, name }: { slug: string; name: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(LAST_STORE_KEY, JSON.stringify({ slug, name, at: Date.now() }));
    } catch {
      // modo privado / armazenamento bloqueado: segue sem lembrar
    }
  }, [slug, name]);
  return null;
}

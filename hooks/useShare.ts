"use client";

import { useState } from "react";

export function useShare() {
  const [copied, setCopied] = useState(false);

  const share = async (url: string, title: string = "Únete a mi partida") => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    const shareData = {
      title,
      text: `¡Únete a mi partida de Impostando! Código: ${url.split("/").pop()?.toUpperCase()}`,
      url,
    };

    // Intentar usar Web Share API (móviles principalmente)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        // El usuario canceló o hubo un error
        if ((error as Error).name !== "AbortError") {
          console.error("Error al compartir:", error);
        }
        return false;
      }
    }

    // Fallback: copiar al portapapeles
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return true;
      }
    } catch (error) {
      console.error("Error al copiar:", error);
    }

    // Fallback adicional: usar el método antiguo
    if (typeof document !== "undefined") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return true;
        } catch (err) {
          console.error("Error al copiar (fallback):", err);
          return false;
        } finally {
          document.body.removeChild(textArea);
        }
      } catch (err) {
        console.error("Error al copiar (fallback):", err);
        return false;
      }
    }

    return false;
  };

  return { share, copied };
}


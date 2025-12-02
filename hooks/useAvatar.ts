"use client";

import { useState, useEffect } from "react";

const DEFAULT_AVATARS = ["😀", "😎", "🤓", "😊", "🥳", "🤖", "👾", "🎮", "⚽", "🏀", "🎯", "🔥"];

export function useAvatar(playerName: string) {
  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_AVATARS[0];
    const stored = localStorage.getItem(`avatar_${playerName}`);
    return stored || DEFAULT_AVATARS[0];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`avatar_${playerName}`, avatar);
    }
  }, [avatar, playerName]);

  const changeAvatar = (newAvatar: string) => {
    setAvatar(newAvatar);
  };

  return { avatar, changeAvatar, availableAvatars: DEFAULT_AVATARS };
}


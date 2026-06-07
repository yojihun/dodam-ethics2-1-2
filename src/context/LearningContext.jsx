import { useMemo, useState } from "react";
import {
  getCurrentLearnerName,
  loadProfile,
  renameProfile,
  saveProfile,
} from "../utils/learningStorage";
import { LearningContext } from "./learningContextInstance";

const persistProfile = (updater, setProfile) => {
  setProfile((current) => {
    const next = typeof updater === "function" ? updater(current) : updater;
    saveProfile(next);
    return next;
  });
};

export function LearningProvider({ children }) {
  const [profile, setProfile] = useState(() => loadProfile(getCurrentLearnerName()));

  const renameLearner = (nextLearnerName) => {
    const renamed = renameProfile(nextLearnerName);
    setProfile(renamed);
  };

  const updateChapterState = (chapterId, updater) => {
    persistProfile((current) => {
      const currentChapterState = current.chapterState[chapterId] ?? {};
      const nextChapterState =
        typeof updater === "function" ? updater(currentChapterState) : updater;

      return {
        ...current,
        chapterState: {
          ...current.chapterState,
          [chapterId]: nextChapterState,
        },
      };
    }, setProfile);
  };

  const addXp = (amount) => {
    let leveledUp = false;

    persistProfile((current) => {
      const previousLevel = Math.floor(current.xp / 100) + 1;
      const nextXp = current.xp + amount;
      const nextLevel = Math.floor(nextXp / 100) + 1;
      leveledUp = nextLevel > previousLevel;

      return {
        ...current,
        xp: nextXp,
      };
    }, setProfile);

    return { leveledUp };
  };

  const addGems = (amount) => {
    persistProfile(
      (current) => ({
        ...current,
        gems: current.gems + amount,
      }),
      setProfile
    );
  };

  const markReward = (kind, id) => {
    let awarded = false;

    persistProfile((current) => {
      if (current.rewards[kind]?.[id]) {
        return current;
      }

      awarded = true;
      return {
        ...current,
        rewards: {
          ...current.rewards,
          [kind]: {
            ...current.rewards[kind],
            [id]: true,
          },
        },
      };
    }, setProfile);

    return awarded;
  };

  const value = useMemo(
    () => ({
      learnerName: profile.learnerName,
      xp: profile.xp,
      level: Math.floor(profile.xp / 100) + 1,
      gems: profile.gems,
      chapterState: profile.chapterState,
      rewards: profile.rewards,
      renameLearner,
      updateChapterState,
      addXp,
      addGems,
      markReward,
    }),
    [profile]
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

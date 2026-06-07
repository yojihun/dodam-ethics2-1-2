const CURRENT_LEARNER_KEY = "ethics-current-learner";
const DEFAULT_LEARNER_NAME = "도담";

const createEmptyProfile = (learnerName) => ({
  learnerName,
  xp: 0,
  gems: 0,
  chapterState: {},
  rewards: {
    objectives: {},
    quizzes: {},
    subjectives: {},
  },
});

const getProfileKey = (learnerName) => `ethics-profile:${learnerName}`;

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const getCurrentLearnerName = () => {
  if (!canUseStorage()) {
    return DEFAULT_LEARNER_NAME;
  }

  return window.localStorage.getItem(CURRENT_LEARNER_KEY) || DEFAULT_LEARNER_NAME;
};

export const loadProfile = (learnerName = getCurrentLearnerName()) => {
  if (!canUseStorage()) {
    return createEmptyProfile(learnerName);
  }

  const raw = window.localStorage.getItem(getProfileKey(learnerName));

  if (!raw) {
    return createEmptyProfile(learnerName);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyProfile(learnerName),
      ...parsed,
      learnerName,
      chapterState: parsed.chapterState ?? {},
      rewards: {
        objectives: parsed.rewards?.objectives ?? {},
        quizzes: parsed.rewards?.quizzes ?? {},
        subjectives: parsed.rewards?.subjectives ?? {},
      },
    };
  } catch (error) {
    console.error("Failed to load learner profile.", error);
    return createEmptyProfile(learnerName);
  }
};

export const saveProfile = (profile) => {
  if (!canUseStorage()) {
    return profile;
  }

  window.localStorage.setItem(CURRENT_LEARNER_KEY, profile.learnerName);
  window.localStorage.setItem(getProfileKey(profile.learnerName), JSON.stringify(profile));
  return profile;
};

export const renameProfile = (nextLearnerName) => {
  const learnerName = nextLearnerName.trim() || DEFAULT_LEARNER_NAME;
  const profile = loadProfile(learnerName);
  saveProfile({ ...profile, learnerName });
  return profile;
};

export const getDefaultLearnerName = () => DEFAULT_LEARNER_NAME;

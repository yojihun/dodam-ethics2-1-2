const CURRENT_LEARNER_KEY = "ethics-current-learner";
const DEFAULT_LEARNER_NAME = "도담";
const PROFILE_SCHEMA_VERSION = "2026-06-07-content-v2";

const createEmptyProfile = (learnerName) => ({
  learnerName,
  schemaVersion: PROFILE_SCHEMA_VERSION,
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
    const schemaMatches = parsed.schemaVersion === PROFILE_SCHEMA_VERSION;

    return {
      ...createEmptyProfile(learnerName),
      ...parsed,
      learnerName,
      schemaVersion: PROFILE_SCHEMA_VERSION,
      chapterState: schemaMatches ? parsed.chapterState ?? {} : {},
      rewards: {
        objectives: schemaMatches ? parsed.rewards?.objectives ?? {} : {},
        quizzes: schemaMatches ? parsed.rewards?.quizzes ?? {} : {},
        subjectives: schemaMatches ? parsed.rewards?.subjectives ?? {} : {},
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

  const nextProfile = {
    ...profile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
  };

  window.localStorage.setItem(CURRENT_LEARNER_KEY, nextProfile.learnerName);
  window.localStorage.setItem(getProfileKey(nextProfile.learnerName), JSON.stringify(nextProfile));
  return nextProfile;
};

export const renameProfile = (nextLearnerName) => {
  const learnerName = nextLearnerName.trim() || DEFAULT_LEARNER_NAME;
  const profile = loadProfile(learnerName);
  saveProfile({ ...profile, learnerName });
  return profile;
};

export const getDefaultLearnerName = () => DEFAULT_LEARNER_NAME;

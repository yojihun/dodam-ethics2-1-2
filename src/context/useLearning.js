import { useContext } from "react";
import { LearningContext } from "./learningContextInstance";

export const useLearning = () => {
  const context = useContext(LearningContext);

  if (!context) {
    throw new Error("useLearning must be used inside LearningProvider.");
  }

  return context;
};

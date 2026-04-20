import PocketBase, { type RecordModel } from "pocketbase";
import { hydrateSurveyDefinition, isSupportedSurveyDefinition, serializeSurveyDefinition } from "./survey-model";
import type { PersistedSurveyDefinition, SurveyDefinition, SurveySettings, SurveySummary } from "./types";

const resolvePocketBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_POCKETBASE_URL;
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8090`;
  }

  return "http://127.0.0.1:8090";
};

export const pb = new PocketBase(resolvePocketBaseUrl());
pb.autoCancellation(false);

const COLLECTION_NAME = "surveys";

export interface SaveSurveyResponse {
  recordId: string;
}

interface SurveyRecord extends RecordModel {
  created?: string;
  title: string;
  description: string;
  published?: boolean;
  settings?: SurveySettings;
  data: PersistedSurveyDefinition;
  updated?: string;
}

const getPersistedTitle = (survey: SurveyDefinition) => {
  const title = survey.title.trim();
  return title.length > 0 ? title : "Untitled survey";
};

const buildSurveyPayload = (survey: SurveyDefinition, ownerId: string) => ({
  owner: ownerId,
  title: getPersistedTitle(survey),
  description: survey.description,
  published: survey.published,
  settings: survey.settings,
  data: serializeSurveyDefinition(survey),
});

export const getCurrentUser = () => pb.authStore.model;

export const registerUser = async (payload: {
  email: string;
  password: string;
  name: string;
}) => {
  await pb.collection("users").create({
    email: payload.email,
    password: payload.password,
    passwordConfirm: payload.password,
    name: payload.name,
  });

  await loginUser({
    email: payload.email,
    password: payload.password,
  });
};

export const loginUser = async (payload: { email: string; password: string }) => {
  await pb.collection("users").authWithPassword(payload.email, payload.password);
};

export const logoutUser = () => {
  pb.authStore.clear();
};

export const listSurveys = async (): Promise<SurveySummary[]> => {
  const records = await pb.collection(COLLECTION_NAME).getFullList<SurveyRecord>();

  return records
    .map((record) => ({
      recordId: record.id,
      title: record.title || "Untitled survey",
      updated: record.updated || record.created || "",
    }))
    .sort((left, right) => {
      const leftTime = Number.isNaN(Date.parse(left.updated)) ? 0 : Date.parse(left.updated);
      const rightTime = Number.isNaN(Date.parse(right.updated)) ? 0 : Date.parse(right.updated);
      return rightTime - leftTime;
    });
};

export const getSurvey = async (recordId: string): Promise<SurveyDefinition> => {
  const record = await pb.collection(COLLECTION_NAME).getOne<SurveyRecord>(recordId);

  if (!isSupportedSurveyDefinition(record.data)) {
    throw new Error("This survey uses an older data shape and is no longer supported by the editor.");
  }

  return hydrateSurveyDefinition(record.data, {
    title: record.title,
    description: record.description,
    published: Boolean(record.published),
    settings: record.settings,
  });
};

export const createBlankSurveyRecord = async (survey: SurveyDefinition): Promise<SaveSurveyResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before creating a survey.");
  }

  const created = await pb.collection(COLLECTION_NAME).create<SurveyRecord>(buildSurveyPayload(survey, user.id));

  return { recordId: created.id };
};

export const deleteSurvey = async (recordId: string) => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before deleting a survey.");
  }

  await pb.collection(COLLECTION_NAME).delete(recordId);
};

export const saveSurvey = async (
  survey: SurveyDefinition,
  recordId: string | null,
): Promise<SaveSurveyResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before saving to PocketBase.");
  }

  const payload = buildSurveyPayload(survey, user.id);

  if (recordId) {
    const updated = await pb.collection(COLLECTION_NAME).update<SurveyRecord>(recordId, payload);
    return { recordId: updated.id };
  }

  const created = await pb.collection(COLLECTION_NAME).create<SurveyRecord>(payload);
  return { recordId: created.id };
};

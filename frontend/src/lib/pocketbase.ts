import PocketBase, { type RecordModel } from "pocketbase";
import type { FormDefinition, FormSummary } from "./types";

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

const COLLECTION_NAME = "forms";

export interface SaveFormResponse {
  recordId: string;
}

interface FormRecord extends RecordModel {
  created?: string;
  title: string;
  description: string;
  data: FormDefinition;
  updated?: string;
}

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

export const listForms = async (): Promise<FormSummary[]> => {
  const records = await pb.collection(COLLECTION_NAME).getFullList<FormRecord>();

  return records
    .map((record) => ({
      recordId: record.id,
      title: record.title || "Untitled form",
      updated: record.updated || record.created || "",
    }))
    .sort((left, right) => {
      const leftTime = Number.isNaN(Date.parse(left.updated)) ? 0 : Date.parse(left.updated);
      const rightTime = Number.isNaN(Date.parse(right.updated)) ? 0 : Date.parse(right.updated);
      return rightTime - leftTime;
    });
};

export const getForm = async (recordId: string): Promise<FormDefinition> => {
  const record = await pb.collection(COLLECTION_NAME).getOne<FormRecord>(recordId);
  return record.data;
};

export const createBlankFormRecord = async (form: FormDefinition): Promise<SaveFormResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before creating a form.");
  }

  const created = await pb.collection(COLLECTION_NAME).create<FormRecord>({
    owner: user.id,
    title: form.title,
    description: form.description,
    data: form,
  });

  return { recordId: created.id };
};

export const saveForm = async (
  form: FormDefinition,
  recordId: string | null,
): Promise<SaveFormResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before saving to PocketBase.");
  }

  const payload = {
    owner: user.id,
    title: form.title,
    description: form.description,
    data: form,
  };

  if (recordId) {
    const updated = await pb.collection(COLLECTION_NAME).update<FormRecord>(recordId, payload);
    return { recordId: updated.id };
  }

  const created = await pb.collection(COLLECTION_NAME).create<FormRecord>(payload);
  return { recordId: created.id };
};

import PocketBase, { type RecordModel } from "pocketbase";
import { hydrateFormDefinition, isSupportedFormDefinition, serializeFormDefinition } from "./form-model";
import type { FormDefinition, FormSummary, PersistedFormDefinition } from "./types";

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
  published?: boolean;
  data: PersistedFormDefinition;
  updated?: string;
}

const getPersistedTitle = (form: FormDefinition) => {
  const title = form.title.trim();
  return title.length > 0 ? title : "Untitled form";
};

const buildFormPayload = (form: FormDefinition, ownerId: string) => ({
  owner: ownerId,
  title: getPersistedTitle(form),
  description: form.description,
  published: form.published,
  data: serializeFormDefinition(form),
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

  if (!isSupportedFormDefinition(record.data)) {
    throw new Error("This form uses an older data shape and is no longer supported by the editor.");
  }

  return {
    ...hydrateFormDefinition(record.data),
    published: Boolean(record.published),
  };
};

export const createBlankFormRecord = async (form: FormDefinition): Promise<SaveFormResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before creating a form.");
  }

  const created = await pb.collection(COLLECTION_NAME).create<FormRecord>(buildFormPayload(form, user.id));

  return { recordId: created.id };
};

export const deleteForm = async (recordId: string) => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before deleting a form.");
  }

  await pb.collection(COLLECTION_NAME).delete(recordId);
};

export const saveForm = async (
  form: FormDefinition,
  recordId: string | null,
): Promise<SaveFormResponse> => {
  const user = getCurrentUser();

  if (!user?.id) {
    throw new Error("You need to be logged in before saving to PocketBase.");
  }

  const payload = buildFormPayload(form, user.id);

  if (recordId) {
    const updated = await pb.collection(COLLECTION_NAME).update<FormRecord>(recordId, payload);
    return { recordId: updated.id };
  }

  const created = await pb.collection(COLLECTION_NAME).create<FormRecord>(payload);
  return { recordId: created.id };
};

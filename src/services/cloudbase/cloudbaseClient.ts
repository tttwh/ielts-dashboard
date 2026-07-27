import cloudbase from "@cloudbase/js-sdk";
import { registerMySQL } from "@cloudbase/js-sdk/mysql";
import type { CloudBaseClient, CloudBaseConfig } from "./cloudbaseTypes";

let mysqlRegistered = false;

const requiredValue = (name: string, value: string | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    throw new Error(`${name} is required`);
  }
  return trimmedValue;
};

const getRegistrationErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  return "";
};

const isDuplicateMySQLRegistrationError = (error: unknown) => {
  const normalizedMessage = getRegistrationErrorMessage(error).toLowerCase();

  return (
    normalizedMessage.includes("mysql") &&
    (normalizedMessage.includes("duplicate") ||
      normalizedMessage.includes("already registered") ||
      normalizedMessage.includes("already been registered") ||
      normalizedMessage.includes("registered"))
  );
};

const ensureMySQLRegistered = () => {
  if (mysqlRegistered) {
    return;
  }

  try {
    registerMySQL(cloudbase);
    mysqlRegistered = true;
  } catch (error) {
    if (isDuplicateMySQLRegistrationError(error)) {
      mysqlRegistered = true;
      return;
    }

    throw error;
  }
};

export function readCloudBaseConfig(env: ImportMetaEnv = import.meta.env): CloudBaseConfig {
  return {
    envId: requiredValue("VITE_CLOUDBASE_ENV_ID", env.VITE_CLOUDBASE_ENV_ID),
    region: env.VITE_CLOUDBASE_REGION?.trim() || "ap-shanghai",
    accessKey: requiredValue("VITE_CLOUDBASE_ACCESS_KEY", env.VITE_CLOUDBASE_ACCESS_KEY)
  };
}

export function createCloudBaseClient(config: CloudBaseConfig = readCloudBaseConfig()): CloudBaseClient {
  ensureMySQLRegistered();

  const sdkClient = cloudbase.init({
    env: config.envId,
    region: config.region,
    accessKey: config.accessKey
  }) as unknown as CloudBaseClient & { auth: CloudBaseClient["auth"] | (() => CloudBaseClient["auth"]) };

  if (typeof sdkClient.rdb !== "function") {
    throw new Error("CloudBase RDB client is unavailable. Check @cloudbase/js-sdk/mysql registration.");
  }

  return {
    auth: typeof sdkClient.auth === "function" ? sdkClient.auth() : sdkClient.auth,
    rdb: sdkClient.rdb.bind(sdkClient)
  };
}

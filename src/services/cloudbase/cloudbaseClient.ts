import cloudbase from "@cloudbase/js-sdk";
import type { CloudBaseClient, CloudBaseConfig } from "./cloudbaseTypes";

const requiredValue = (name: string, value: string | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    throw new Error(`${name} is required`);
  }
  return trimmedValue;
};

export function readCloudBaseConfig(env: ImportMetaEnv = import.meta.env): CloudBaseConfig {
  return {
    envId: requiredValue("VITE_CLOUDBASE_ENV_ID", env.VITE_CLOUDBASE_ENV_ID),
    region: env.VITE_CLOUDBASE_REGION?.trim() || "ap-shanghai",
    accessKey: requiredValue("VITE_CLOUDBASE_ACCESS_KEY", env.VITE_CLOUDBASE_ACCESS_KEY)
  };
}

export function createCloudBaseClient(config: CloudBaseConfig = readCloudBaseConfig()): CloudBaseClient {
  return cloudbase.init({
    env: config.envId,
    region: config.region,
    accessKey: config.accessKey
  }) as unknown as CloudBaseClient;
}

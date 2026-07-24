import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudbaseInit = vi.hoisted(() => vi.fn());

vi.mock("@cloudbase/js-sdk", () => ({
  default: {
    init: cloudbaseInit
  }
}));

import { createCloudBaseClient, readCloudBaseConfig } from "./cloudbaseClient";

const env = (overrides: Partial<ImportMetaEnv> = {}) =>
  ({
    VITE_CLOUDBASE_ENV_ID: "test-env",
    VITE_CLOUDBASE_REGION: "ap-shanghai",
    VITE_CLOUDBASE_ACCESS_KEY: "publishable-test-key",
    ...overrides
  }) as ImportMetaEnv;

describe("readCloudBaseConfig", () => {
  it("reads CloudBase public config from Vite env", () => {
    expect(readCloudBaseConfig(env())).toEqual({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });
  });

  it("defaults region to ap-shanghai", () => {
    expect(readCloudBaseConfig(env({ VITE_CLOUDBASE_REGION: "" }))).toMatchObject({
      region: "ap-shanghai"
    });
  });

  it("rejects missing environment id", () => {
    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ENV_ID: "" }))).toThrow(
      "VITE_CLOUDBASE_ENV_ID is required"
    );
  });

  it("rejects missing publishable access key", () => {
    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ACCESS_KEY: "" }))).toThrow(
      "VITE_CLOUDBASE_ACCESS_KEY is required"
    );
  });
});

describe("createCloudBaseClient", () => {
  beforeEach(() => {
    cloudbaseInit.mockReset();
  });

  it("initializes the CloudBase SDK with public client config", () => {
    const sdkClient = {
      auth: {},
      rdb: vi.fn()
    };
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });

    expect(cloudbaseInit).toHaveBeenCalledWith({
      env: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key",
      auth: {
        detectSessionInUrl: true
      }
    });
    expect(client).toBe(sdkClient);
  });
});

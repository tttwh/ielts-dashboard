import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudbaseInit = vi.hoisted(() => vi.fn());
const registerMySQL = vi.hoisted(() => vi.fn());

vi.mock("@cloudbase/js-sdk", () => ({
  default: {
    init: cloudbaseInit
  }
}));

vi.mock("@cloudbase/js-sdk/mysql", () => ({
  registerMySQL
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
    registerMySQL.mockReset();
  });

  it("registers the CloudBase PG/RDB component before initializing the SDK", () => {
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
      accessKey: "publishable-test-key"
    });
    expect(registerMySQL).toHaveBeenCalledWith(expect.objectContaining({ init: cloudbaseInit }));
    expect(registerMySQL).toHaveBeenCalledBefore(cloudbaseInit);
    expect(client.auth).toBe(sdkClient.auth);
    expect(client.rdb()).toBe(sdkClient.rdb());
  });

  it("adapts SDK clients that expose auth as a function", () => {
    const authClient = {
      getSession: vi.fn()
    };
    const sdkClient = {
      auth: vi.fn(() => authClient),
      rdb: vi.fn()
    };
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });

    expect(client.auth).toBe(authClient);
    expect(sdkClient.auth).toHaveBeenCalledOnce();
  });

  it("keeps SDK rdb methods defined on the client prototype", () => {
    const rdbClient = {};
    const sdkClient = Object.assign(Object.create({ rdb: vi.fn(() => rdbClient) }), {
      auth: {}
    });
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });

    expect(client.rdb()).toBe(rdbClient);
  });
});

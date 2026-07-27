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

const env = (overrides: Partial<ImportMetaEnv> = {}) =>
  ({
    VITE_CLOUDBASE_ENV_ID: "test-env",
    VITE_CLOUDBASE_REGION: "ap-shanghai",
    VITE_CLOUDBASE_ACCESS_KEY: "publishable-test-key",
    ...overrides
  }) as ImportMetaEnv;

const cloudBaseConfig = {
  envId: "test-env",
  region: "ap-shanghai",
  accessKey: "publishable-test-key"
};

const loadCloudBaseClient = async () => import("./cloudbaseClient");

beforeEach(() => {
  vi.resetModules();
  cloudbaseInit.mockReset();
  registerMySQL.mockReset();
});

describe("readCloudBaseConfig", () => {
  it("reads CloudBase public config from Vite env", async () => {
    const { readCloudBaseConfig } = await loadCloudBaseClient();

    expect(readCloudBaseConfig(env())).toEqual({
      envId: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });
  });

  it("defaults region to ap-shanghai", async () => {
    const { readCloudBaseConfig } = await loadCloudBaseClient();

    expect(readCloudBaseConfig(env({ VITE_CLOUDBASE_REGION: "" }))).toMatchObject({
      region: "ap-shanghai"
    });
  });

  it("rejects missing environment id", async () => {
    const { readCloudBaseConfig } = await loadCloudBaseClient();

    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ENV_ID: "" }))).toThrow(
      "VITE_CLOUDBASE_ENV_ID is required"
    );
  });

  it("rejects missing publishable access key", async () => {
    const { readCloudBaseConfig } = await loadCloudBaseClient();

    expect(() => readCloudBaseConfig(env({ VITE_CLOUDBASE_ACCESS_KEY: "" }))).toThrow(
      "VITE_CLOUDBASE_ACCESS_KEY is required"
    );
  });
});

describe("createCloudBaseClient", () => {
  it("registers the CloudBase PG/RDB component before initializing the SDK", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const rdbClient = {};
    const sdkClient = {
      auth: {},
      rdb: vi.fn(() => rdbClient)
    };
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient(cloudBaseConfig);

    expect(cloudbaseInit).toHaveBeenCalledWith({
      env: "test-env",
      region: "ap-shanghai",
      accessKey: "publishable-test-key"
    });
    expect(registerMySQL).toHaveBeenCalledWith(expect.objectContaining({ init: cloudbaseInit }));
    expect(registerMySQL).toHaveBeenCalledBefore(cloudbaseInit);
    expect(client.auth).toBe(sdkClient.auth);
    expect(client.rdb()).toBe(rdbClient);
  });

  it("does not register the CloudBase mysql component more than once", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const sdkClient = {
      auth: {},
      rdb: vi.fn()
    };
    cloudbaseInit.mockReturnValue(sdkClient);

    createCloudBaseClient(cloudBaseConfig);
    createCloudBaseClient(cloudBaseConfig);

    expect(registerMySQL).toHaveBeenCalledOnce();
    expect(cloudbaseInit).toHaveBeenCalledTimes(2);
  });

  it("treats duplicate mysql registration errors as already registered", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const sdkClient = {
      auth: {},
      rdb: vi.fn()
    };
    registerMySQL.mockImplementationOnce(() => {
      throw new Error("Duplicate component mysql");
    });
    cloudbaseInit.mockReturnValue(sdkClient);

    expect(() => createCloudBaseClient(cloudBaseConfig)).not.toThrow();
    createCloudBaseClient(cloudBaseConfig);

    expect(registerMySQL).toHaveBeenCalledOnce();
    expect(cloudbaseInit).toHaveBeenCalledTimes(2);
  });

  it("treats already-registered mysql errors as duplicate registration", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const sdkClient = {
      auth: {},
      rdb: vi.fn()
    };
    registerMySQL.mockImplementationOnce(() => {
      throw new Error("mysql component has already been registered");
    });
    cloudbaseInit.mockReturnValue(sdkClient);

    expect(() => createCloudBaseClient(cloudBaseConfig)).not.toThrow();

    expect(registerMySQL).toHaveBeenCalledOnce();
    expect(cloudbaseInit).toHaveBeenCalledOnce();
  });

  it("rethrows unrelated mysql registration errors", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    registerMySQL.mockImplementationOnce(() => {
      throw new Error("CloudBase registration failed");
    });

    expect(() => createCloudBaseClient(cloudBaseConfig)).toThrow("CloudBase registration failed");
    expect(cloudbaseInit).not.toHaveBeenCalled();
  });

  it("adapts SDK clients that expose auth as a function", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const authClient = {
      getSession: vi.fn()
    };
    const sdkClient = {
      auth: vi.fn(() => authClient),
      rdb: vi.fn()
    };
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient(cloudBaseConfig);

    expect(client.auth).toBe(authClient);
    expect(sdkClient.auth).toHaveBeenCalledOnce();
  });

  it("keeps SDK rdb methods defined on the client prototype", async () => {
    const { createCloudBaseClient } = await loadCloudBaseClient();
    const rdbClient = {};
    const sdkClient = Object.assign(Object.create({ rdb: vi.fn(() => rdbClient) }), {
      auth: {}
    });
    cloudbaseInit.mockReturnValue(sdkClient);

    const client = createCloudBaseClient(cloudBaseConfig);

    expect(client.rdb()).toBe(rdbClient);
  });
});

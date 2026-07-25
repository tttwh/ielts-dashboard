export interface CloudBaseConfig {
  envId: string;
  region: string;
  accessKey: string;
}

export interface CloudBaseAuthUser {
  uid: string;
  email: string | null;
  username: string | null;
  accountName: string | null;
}

export interface CloudBaseRawAuthUser {
  uid?: string;
  id?: string;
  email?: string | null;
  username?: string | null;
  accountName?: string | null;
}

export interface CloudBaseAuthError {
  message?: string;
  code?: string;
}

export interface CloudBaseAuthResponseData {
  user?: CloudBaseRawAuthUser | null;
  session?: unknown;
  messageId?: string;
  verifyOtp?: (params: { token: string; messageId?: string }) => Promise<CloudBaseAuthResponse>;
}

export interface CloudBaseAuthResponse {
  data: CloudBaseAuthResponseData | null;
  error: CloudBaseAuthError | null;
}

export interface CloudBaseAuthClient {
  signUp(input: { email: string; password: string; username?: string }): Promise<CloudBaseAuthResponse>;
  signInWithPassword(input: { email?: string; username?: string; password: string }): Promise<CloudBaseAuthResponse>;
  signOut(input?: { options?: { clearStorage?: boolean } }): Promise<CloudBaseAuthResponse | void>;
  getSession(): Promise<CloudBaseAuthResponse>;
  onAuthStateChange(
    listener: (event: string, session: { user?: CloudBaseRawAuthUser | null } | null) => void
  ): { data?: { subscription?: { unsubscribe(): void } } } | (() => void);
}

export interface CloudBaseRdbResult<T> {
  data: T[] | T | null;
  error: { message?: string; code?: string } | null;
}

export interface CloudBaseRdbQuery<T> {
  select(columns?: string, options?: Record<string, unknown>): Promise<CloudBaseRdbResult<T>>;
  eq(column: string, value: unknown): CloudBaseRdbQuery<T>;
  upsert(values: T | T[], options?: { onConflict?: string }): Promise<CloudBaseRdbResult<T>>;
}

export interface CloudBaseRdbClient {
  from<T>(tableName: string): CloudBaseRdbQuery<T>;
}

export interface CloudBaseClient {
  auth: CloudBaseAuthClient;
  rdb(): CloudBaseRdbClient;
}

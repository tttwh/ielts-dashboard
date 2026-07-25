const listeners = new Set<(event: string, session: { user: unknown | null }) => void>();
let currentUser: Record<string, string | null> | null = null;
const tables = new Map<string, Array<Record<string, unknown>>>();

const ok = <T>(data: T) => ({ data, error: null });

function emitAuthState(event: string) {
  for (const listener of listeners) {
    listener(event, { user: currentUser });
  }
}

function createSdkUser(input: { email?: string; username?: string }) {
  return {
    id: "e2e-cloudbase-user-1",
    email: input.email ?? "e2e@example.invalid",
    username: input.username ?? "weihao_e2e",
    accountName: input.username ?? input.email ?? "weihao_e2e"
  };
}

function tableRows(tableName: string) {
  const existingRows = tables.get(tableName);
  if (existingRows) return existingRows;

  const nextRows: Array<Record<string, unknown>> = [];
  tables.set(tableName, nextRows);
  return nextRows;
}

function keyColumnsFor(options?: { onConflict?: string }) {
  return options?.onConflict?.split(",").map((key) => key.trim()).filter(Boolean) ?? ["id"];
}

function createQuery(tableName: string) {
  const filters: Array<{ column: string; value: unknown }> = [];

  return {
    eq(column: string, value: unknown) {
      filters.push({ column, value });
      return this;
    },

    async select() {
      const rows = tableRows(tableName).filter((row) =>
        filters.every((filter) => row[filter.column] === filter.value)
      );

      return ok(rows);
    },

    async upsert(values: Record<string, unknown> | Array<Record<string, unknown>>, options?: { onConflict?: string }) {
      const incomingRows = Array.isArray(values) ? values : [values];
      const existingRows = tableRows(tableName);
      const keyColumns = keyColumnsFor(options);

      for (const row of incomingRows) {
        const existingIndex = existingRows.findIndex((existingRow) =>
          keyColumns.every((key) => existingRow[key] === row[key])
        );

        if (existingIndex >= 0) {
          existingRows[existingIndex] = row;
        } else {
          existingRows.push(row);
        }
      }

      return ok(incomingRows);
    }
  };
}

const cloudbase = {
  init() {
    return {
      auth: {
        async getSession() {
          return ok({ user: currentUser, session: currentUser ? {} : null });
        },

        onAuthStateChange(listener: (event: string, session: { user: unknown | null }) => void) {
          listeners.add(listener);
          queueMicrotask(() => listener("INITIAL_SESSION", { user: currentUser }));

          return () => {
            listeners.delete(listener);
          };
        },

        async signUp(input: { email: string; password: string; username?: string }) {
          return ok({
            messageId: "e2e-message-1",
            verifyOtp: async () => {
              currentUser = createSdkUser(input);
              emitAuthState("SIGNED_IN");
              return ok({ user: currentUser, session: {} });
            }
          });
        },

        async signInWithPassword(input: { email?: string; username?: string; password: string }) {
          currentUser = createSdkUser(input);
          emitAuthState("SIGNED_IN");
          return ok({ user: currentUser, session: {} });
        },

        async signOut() {
          currentUser = null;
          emitAuthState("SIGNED_OUT");
          return ok({});
        }
      },

      rdb() {
        return {
          from: createQuery
        };
      }
    };
  }
};

export default cloudbase;

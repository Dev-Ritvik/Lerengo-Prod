export function createMockSupabaseClient() {
  function createChain(tableName: string, _options?: any) {
    const queryResult = {
      data: [] as any[],
      error: null as any,
      count: 154,
    };

    // Provide realistic counts for metrics
    if (tableName === "users") {
      queryResult.count = 1240;
    } else if (tableName === "notes") {
      queryResult.count = 85;
    }

    const chain: any = {
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      is: () => chain,
      in: () => chain,
      contains: () => chain,
      containedBy: () => chain,
      rangeGt: () => chain,
      rangeGte: () => chain,
      rangeLt: () => chain,
      rangeLte: () => chain,
      rangeAdjacent: () => chain,
      overlaps: () => chain,
      textSearch: () => chain,
      match: () => chain,
      not: () => chain,
      or: () => chain,
      filter: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      abortSignal: () => chain,
      single: async () => {
        if (tableName === "universities") {
          return { data: { name: "Lovely Professional University" }, error: null };
        }
        return { data: null, error: null };
      },
      maybeSingle: async () => {
        if (tableName === "universities") {
          return { data: { name: "Lovely Professional University" }, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: any) => resolve(queryResult),
    };

    return chain;
  }

  const mock = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "mock-user-id",
            email: "demo@lerengo.dev",
            user_metadata: {
              full_name: "Siddharth S.",
            },
            identities: [],
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: {
            user: {
              id: "mock-user-id",
              email: "demo@lerengo.dev",
            },
          },
        },
        error: null,
      }),
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              id: "mock-user-id",
              email: "demo@lerengo.dev",
              user_metadata: {
                full_name: "Siddharth S.",
              },
            },
          },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      return {
        select: (columns?: any, options?: any) => createChain(table, options),
      };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: "mock-path" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "mock-url" } }),
      }),
    },
  };

  return mock;
}

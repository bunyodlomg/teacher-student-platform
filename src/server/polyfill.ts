// Next.js normally polyfills globalThis.AsyncLocalStorage inside its internal
// require-hook before any app code runs. Under a custom server loaded via tsx
// (ESM), Next's async-local-storage module can evaluate before that hook runs,
// throwing "Invariant: AsyncLocalStorage accessed in runtime where it is not
// available". Setting the global up front — and importing this module before
// `next` — sidesteps the ordering problem.
import { AsyncLocalStorage } from "node:async_hooks";

const g = globalThis as unknown as { AsyncLocalStorage?: unknown };
if (!g.AsyncLocalStorage) g.AsyncLocalStorage = AsyncLocalStorage;

export {};

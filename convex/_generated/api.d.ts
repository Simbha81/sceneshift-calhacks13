/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apifyApi from "../apifyApi.js";
import type * as apifyModel from "../apifyModel.js";
import type * as apifyRead from "../apifyRead.js";
import type * as apifyStore from "../apifyStore.js";
import type * as apifySync from "../apifySync.js";
import type * as bootstrap from "../bootstrap.js";
import type * as events from "../events.js";
import type * as lib_server from "../lib/server.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apifyApi: typeof apifyApi;
  apifyModel: typeof apifyModel;
  apifyRead: typeof apifyRead;
  apifyStore: typeof apifyStore;
  apifySync: typeof apifySync;
  bootstrap: typeof bootstrap;
  events: typeof events;
  "lib/server": typeof lib_server;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

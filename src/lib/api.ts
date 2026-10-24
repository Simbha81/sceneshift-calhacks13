import { makeFunctionReference } from "convex/server";
import type { LocalEvent } from "./event";
export const listApproved = makeFunctionReference<"query", { now: number }, LocalEvent[]>("events:listApproved");

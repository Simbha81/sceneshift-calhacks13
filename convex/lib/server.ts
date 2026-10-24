// Typed SDK builders keep the starter buildable before the first Convex deployment.
import { queryGeneric, mutationGeneric, type QueryBuilder, type MutationBuilder } from "convex/server";
import type { DataModel } from "../schema";
export const query: QueryBuilder<DataModel, "public"> = queryGeneric;
export const mutation: MutationBuilder<DataModel, "public"> = mutationGeneric;

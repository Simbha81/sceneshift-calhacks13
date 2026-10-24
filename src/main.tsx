import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { App } from "./App";
import "./style.css";
const url = import.meta.env.VITE_CONVEX_URL?.trim();
const root = createRoot(document.getElementById("root")!);
root.render(<React.StrictMode>{url
  ? <ConvexProvider client={new ConvexReactClient(url)}><App connected /></ConvexProvider>
  : <App connected={false} />}</React.StrictMode>);

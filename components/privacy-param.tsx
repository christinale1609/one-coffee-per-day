"use client";

import { useEffect } from "react";
import { applyPrivacyParam } from "@/lib/privacy";

/** Picks up ?privacy=on / ?privacy=off on whichever page the visitor lands on. */
export function PrivacyParam() {
  useEffect(() => applyPrivacyParam(), []);
  return null;
}

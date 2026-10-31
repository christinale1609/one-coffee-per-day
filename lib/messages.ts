import { CONNECT_NOTE_LIMIT, FOLLOW_UP_LIMIT, THANK_YOU_LIMIT } from "./constants";
import type { MessageKind } from "./types";

export function messageLimit(kind: MessageKind, premium: boolean) {
  if (kind === "connect") return premium ? CONNECT_NOTE_LIMIT.premium : CONNECT_NOTE_LIMIT.free;
  return kind === "follow_up" ? FOLLOW_UP_LIMIT : THANK_YOU_LIMIT;
}

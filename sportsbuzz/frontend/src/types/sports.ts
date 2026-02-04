export type MatchStatus = "scheduled" | "live" | "finished";

export interface Match {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  startTime: string; // ISO string from backend
  endTime: string | null;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  commentary?: CommentaryEvent[];
}

export interface CommentaryEvent {
  id: number;
  matchId: number;
  minute: number;
  sequence: number;
  period: string;
  eventType: string;
  actor: string | null;
  team: string | null;
  message: string;
  metadata: Record<string, any> | null;
  tags: string[] | null;
  createdAt: string;
}

// WebSocket Message Types
export type ServerMessageType =
  | "welcome"
  | "subscribed"
  | "unsubscribed"
  | "match_created"
  | "match_updated"
  | "commentary"
  | "error";

export interface WelcomeMessage {
  type: "welcome";
  message: string;
}

export interface SubscribedMessage {
  type: "subscribed";
  matchId: number;
}

export interface UnsubscribedMessage {
  type: "unsubscribed";
  matchId: number;
}

export interface MatchCreatedMessage {
  type: "match_created";
  data: Match;
}

export interface CommentaryMessage {
  type: "commentary";
  data: CommentaryEvent;
}

export interface MatchUpdatedMessage {
  type: "match_updated";
  data: Partial<Match> & { id: number };
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage =
  | WelcomeMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | MatchCreatedMessage
  | MatchUpdatedMessage
  | CommentaryMessage
  | ErrorMessage;

export type ClientMessage =
  | { type: "subscribe"; matchId: number }
  | { type: "unsubscribe"; matchId: number };

// REST API Response Wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
  details?: any;
}

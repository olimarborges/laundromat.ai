import type { CheckResult, CompensationKind } from "@/domain/compensation";
import type { Priority } from "@/domain/notifications";

/** Linhas das tabelas (substituir por `supabase gen types` quando o projeto estiver ligado). */

export interface StoreRow {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  timezone: string;
  open_time: string; // "06:00:00"
  close_time: string;
  owner_whatsapp: string | null;
  owner_email: string | null;
  pilot_phase: 1 | 2;
  notify_hours: number[];
  policy: {
    maxPerCaseCents: number;
    maxPerCustomerPerDayCents: number;
    maxPerStorePerDayCents: number;
  };
  internet_status: "online" | "offline";
  internet_changed_at: string;
}

import type { MachineKind, MachineStatus } from "@/domain/machines";
export type { MachineKind, MachineStatus };

export interface MachineRow {
  id: string;
  store_id: string;
  code: string;
  kind: MachineKind;
  label: string;
  brand: string | null;
  model: string | null;
  capacity_kg: number | null;
  price_cents: number;
  cycle_minutes: number;
  status: MachineStatus;
  released_at: string | null;
  cycle_started_at: string | null;
  cycle_ends_at: string | null;
  last_error: string | null;
  sort: number;
  updated_at: string;
}

export interface TerminalRow {
  id: string;
  store_id: string;
  provider: string;
  model: string;
  status: "ok" | "frozen" | "offline";
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  store_id: string;
  machine_id: string | null;
  amount_cents: number;
  method: "credito" | "debito" | "pix";
  status: "approved" | "declined" | "pending";
  card_last4: string | null;
  created_at: string;
}

export interface MachineEventRow {
  id: string;
  store_id: string;
  machine_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CameraSnapshotRow {
  id: string;
  machine_id: string | null;
  taken_at: string;
  observation: string;
  analysis: {
    door_closed?: boolean;
    drum_has_clothes?: boolean;
    panel_lit?: boolean;
    drum_dirty?: boolean;
    faces_blurred?: boolean;
  };
}

export type ConversationStatus = "open" | "escalated" | "resolved" | "abandoned";

export interface ConversationRow {
  id: string;
  store_id: string;
  customer_id: string | null;
  visitor_token: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  phone_verified: boolean;
  machine_id: string | null;
  problem_type: string | null;
  status: ConversationStatus;
  resolved_by: "assistant" | "owner" | null;
  mode: "ai" | "script";
  summary: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export type CaseStatus = "open" | "waiting_owner" | "resolved" | "dismissed";

export interface CaseRow {
  id: string;
  store_id: string;
  conversation_id: string | null;
  machine_id: string | null;
  problem_type: string;
  priority: Priority;
  status: CaseStatus;
  title: string;
  summary: string;
  evidence: Evidence;
  actions_taken: string[];
  needs_physical: boolean;
  notify_at: string;
  notified_at: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Evidence {
  payment?: { status: CheckResult; detail: string };
  machine_log?: { status: CheckResult; detail: string };
  camera?: { status: CheckResult; detail: string };
  customer_photo_url?: string;
}

export interface CompensationRow {
  id: string;
  store_id: string;
  case_id: string | null;
  conversation_id: string | null;
  kind: CompensationKind;
  amount_cents: number;
  status: "pending" | "approved" | "rejected" | "executed";
  decision: "auto_approve" | "needs_owner" | "deny";
  decision_reasons: string[];
  verification: Record<string, CheckResult>;
  otp_code: string | null;
  otp_verified: boolean;
  decided_at: string | null;
  owner_note: string | null;
  created_at: string;
}

export interface KbArticleRow {
  id: string;
  store_id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  needs_review: boolean;
  active: boolean;
  sort: number;
  updated_at: string;
}

export interface OwnerNotificationRow {
  id: string;
  store_id: string;
  case_id: string | null;
  priority: Priority;
  title: string;
  body: string;
  deliver_at: string;
  read_at: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  store_id: string | null;
  role: "owner" | "customer";
  full_name: string | null;
  phone: string | null;
  points: number;
  created_at: string;
}

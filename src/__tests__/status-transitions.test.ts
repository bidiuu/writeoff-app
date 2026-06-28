import { describe, it, expect } from "vitest";

type Status = "pending" | "approved" | "rejected";

interface Request {
  id: string;
  status: Status;
  author_id: string;
}

// Business rules for status transitions
function canApprove(request: Request, reviewerId: string): { ok: boolean; reason?: string } {
  if (request.status !== "pending")
    return { ok: false, reason: "Можно одобрить только заявку в статусе pending" };
  if (request.author_id === reviewerId)
    return { ok: false, reason: "Нельзя одобрить собственную заявку" };
  return { ok: true };
}

function canReject(request: Request, reviewerId: string): { ok: boolean; reason?: string } {
  if (request.status !== "pending")
    return { ok: false, reason: "Можно отклонить только заявку в статусе pending" };
  if (request.author_id === reviewerId)
    return { ok: false, reason: "Нельзя отклонить собственную заявку" };
  return { ok: true };
}

function applyTransition(request: Request, action: "approve" | "reject"): Request {
  return { ...request, status: action === "approve" ? "approved" : "rejected" };
}

describe("Status transitions — approve", () => {
  const pending: Request = { id: "r1", status: "pending", author_id: "user-a" };
  const reviewer = "user-b";

  it("allows approving a pending request", () => {
    expect(canApprove(pending, reviewer).ok).toBe(true);
  });

  it("blocks approving an already approved request", () => {
    const approved = { ...pending, status: "approved" as Status };
    expect(canApprove(approved, reviewer).ok).toBe(false);
  });

  it("blocks approving an already rejected request", () => {
    const rejected = { ...pending, status: "rejected" as Status };
    expect(canApprove(rejected, reviewer).ok).toBe(false);
  });

  it("blocks reviewer approving own request", () => {
    expect(canApprove(pending, pending.author_id).ok).toBe(false);
  });

  it("transitions status to approved", () => {
    const result = applyTransition(pending, "approve");
    expect(result.status).toBe("approved");
  });
});

describe("Status transitions — reject", () => {
  const pending: Request = { id: "r2", status: "pending", author_id: "user-a" };
  const reviewer = "user-b";

  it("allows rejecting a pending request", () => {
    expect(canReject(pending, reviewer).ok).toBe(true);
  });

  it("blocks rejecting a non-pending request", () => {
    const approved = { ...pending, status: "approved" as Status };
    expect(canReject(approved, reviewer).ok).toBe(false);
  });

  it("blocks reviewer rejecting own request", () => {
    expect(canReject(pending, pending.author_id).ok).toBe(false);
  });

  it("transitions status to rejected", () => {
    const result = applyTransition(pending, "reject");
    expect(result.status).toBe("rejected");
  });
});
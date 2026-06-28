# Typed Verdict Layer (TVL)

Status: design, v0.1. Extends the Verdict and Risk roles.

Provenance: this layer was derived from a production finding where a missing
classification path silently became a policy bypass (an "unknown" subject was
treated as allowed). The lesson generalizes directly to code review: a reviewer
that cannot determine whether a change is safe must never let that uncertainty
pass as approval.

## 1. Core principle

> Ambiguity is not a verdict. Ambiguity is a state.

A swarm review must never resolve "unknown" implicitly into "approved" or
"rejected". Unknown is a first-class state that requires resolution before any
commit, merge, or deploy.

## 2. Problem

A binary gate (pass / block) collapses several independent realities into one
outcome, which creates silent failure modes:

- Missing handoff metadata treated as a policy violation (false block), or worse,
  ignored (false pass).
- A change the reviewer cannot classify treated as implicitly safe.
- A tooling or configuration error treated as a content decision.
- An authorized commit assumed to be a durable, pushed result.

Each of these turns uncertainty into a decision without an owner, which is how an
"unknown" becomes a bypass and how a green dashboard hides a real gap.

## 3. Five separable state dimensions

The Verdict never collapses these prematurely. Each is evaluated on its own.

1. **Input** - the change set and its metadata (diff, commit, handoff, manifest).
2. **Classification** - can the swarm determine what the change is and its risk
   class.
3. **Policy** - are the rules available and readable (conventions, the AAHP gate,
   any allowlist).
4. **Decision** - the typed verdict.
5. **Execution** - did the authorized action actually land durably.

### State values

```text
Input:          INPUT_VALID | INPUT_MISSING_METADATA | INPUT_MALFORMED | INPUT_LEGACY | INPUT_UNREADABLE
Classification: CLASSIFIED_SAFE | CLASSIFIED_RISKY | CLASSIFICATION_UNKNOWN | CLASSIFICATION_INFERRED | CLASSIFICATION_CONFLICTING
Policy:         POLICY_ACTIVE | POLICY_UNREADABLE | POLICY_MISSING | POLICY_CONFLICT | POLICY_EXPIRED
Decision:       ALLOW | DENY_POLICY | HOLD_AMBIGUOUS | HOLD_METADATA_REQUIRED | ESCALATE_REVIEW | FAIL_CONFIGURATION
Execution:      EXECUTION_NOT_STARTED | EXECUTION_AUTHORIZED | EXECUTION_SUCCEEDED | EXECUTION_FAILED_DELIVERY | EXECUTION_PARTIAL | EXECUTION_NO_DURABLE_RESULT
```

Invariants:

```text
CLASSIFICATION_UNKNOWN  ->  never ALLOW, never DENY_POLICY  ->  HOLD_AMBIGUOUS
INPUT_MISSING_METADATA  ->  HOLD_METADATA_REQUIRED (not a content decision)
POLICY_UNREADABLE       ->  FAIL_CONFIGURATION (not "no restriction")
INPUT_LEGACY            ->  allowed only when explicit, owned, logged, time-bound
EXECUTION_AUTHORIZED    !=  EXECUTION_SUCCEEDED
```

## 4. Decision pipeline

```text
1. Intake (collect diff + handoff)
2. Metadata validation
3. Policy availability check
4. Classification (with confidence)
5. Policy evaluation
6. Ambiguity resolution
7. Authorization (typed verdict)
8. Execution
9. Outcome verification (durable result)
10. Telemetry + learning
```

## 5. Core decision logic

```text
IF classification_state == CLASSIFICATION_UNKNOWN AND policy_mode == ALLOWLIST_ACTIVE
THEN decision = HOLD_AMBIGUOUS

IF input_state == INPUT_MISSING_METADATA
THEN decision = HOLD_METADATA_REQUIRED

IF policy_state in (POLICY_UNREADABLE, POLICY_MISSING)
THEN decision = FAIL_CONFIGURATION

IF classification_state == CLASSIFICATION_CONFLICTING
THEN decision = ESCALATE_REVIEW
```

`safe_to_commit` is true only when `decision_state == ALLOW`. Any HOLD, ESCALATE,
or FAIL state sets `safe_to_commit = false` and `blocking = true`.

## 6. Role mapping

The layer extends the existing roles and adds two; it does not double the role
count.

| Role | TVL responsibility |
|------|--------------------|
| Scout | Collect the change and its metadata; set the Input state. |
| Tester | Run concrete checks; report verified vs assumed; feed Classification confidence. |
| Risk | Detect ambiguity and bypass risk, secrets, PII, drift, policy gaps; flag `CLASSIFICATION_UNKNOWN` so it cannot pass silently. |
| Verdict | Emit the typed Decision state; never collapse unknown into allow or deny. |
| Controller (new) | Orchestrate the pipeline, prevent loops, compress repeated findings. |
| Telemetry (new) | Track outcomes; verify the Execution state (authorization is not success). |

The original framework named separate Classifier, Policy, and Execution agents.
Those responsibilities fold into Scout, Tester, Risk, and the new Telemetry role,
to keep the swarm lean.

## 7. Governance rules

1. **No implicit permission.** Ambiguity must never resolve to approval.
2. **No false denial.** A tooling or configuration failure must not appear as a
   policy violation.
3. **Explicit legacy.** Legacy compatibility must be explicit, owned, logged, and
   time-bound.
4. **State ownership.** Every non-ALLOW state names an owner.
5. **Repetition compression.** A repeated failure attaches to the existing defect
   rather than spawning a duplicate.

### Ownership map

| State | Owner |
|-------|-------|
| Missing metadata | Upstream (the author of the change) |
| Unknown classification | Risk |
| Policy unreadable | Config owner |
| Policy denial | Maintainer |
| Delivery failure | Execution system |
| Repeated ambiguity | Controller |

## 8. Decision record

Every verdict emits an auditable record.

```json
{
  "input_id": "change-001",
  "input_state": "INPUT_VALID",
  "classification_state": "CLASSIFICATION_UNKNOWN",
  "policy_state": "POLICY_ACTIVE",
  "policy_mode": "ALLOWLIST_ACTIVE",
  "decision_state": "HOLD_AMBIGUOUS",
  "reason": "Change touches an unclassified surface; risk cannot be determined.",
  "owner": "Risk",
  "required_action": "Add classification metadata or escalate to a maintainer.",
  "expires_at": "2026-07-05T00:00:00Z",
  "execution_state": "EXECUTION_NOT_STARTED",
  "safe_to_commit": false
}
```

## 9. Minimal flow

```text
Change arrives
  -> Policy readable?       no -> FAIL_CONFIGURATION
  -> Metadata complete?     no -> HOLD_METADATA_REQUIRED
  -> Classifiable?          no -> HOLD_AMBIGUOUS
  -> Allowed by policy?     no -> DENY_POLICY
  -> Authorize -> Execute
  -> Durable result?        no -> EXECUTION_FAILED_DELIVERY
  -> SUCCESS
```

## 10. Design principles

1. Unknown is not allowed.
2. Unknown is not denied.
3. Unknown is a resolvable state.
4. Legacy is not exemption.
5. A parser or tooling failure is not a policy judgment.
6. Authorization is not execution success.
7. Ambiguity must be visible.
8. Every state has an owner.
9. Every fallback has an expiry.
10. Every decision is explainable.

## 11. Summary

A swarm becomes unsafe the moment ambiguity is silently converted into permission
or denial. The Typed Verdict Layer keeps the five state dimensions separable,
forces unknown into an owned and expiring HOLD, and verifies that an authorized
action actually landed, so trust and traceability survive contact with the
messy cases.

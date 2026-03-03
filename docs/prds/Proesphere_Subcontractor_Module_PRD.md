  
**PROESPHERE**

Product Requirements Document

**Subcontractor Management Module**

| Document Version | 1.0 | Status | Draft |
| :---- | :---- | :---- | :---- |
| **Author** | Product Team | **Date** | March 2026 |
| **Module** | Subcontractor Mgmt | **Priority** | P0 — Critical |
| **Target Release** | Q3 2026 | **Stakeholders** | PMs, Subs, Admins |

# **1\. Executive Summary**

The Subcontractor Management Module extends Proesphere’s unified project hub to include the subcontractors who execute the physical work on every construction project. Today, general contractors manage subcontractor coordination through a fragmented mix of text messages, spreadsheets, phone calls, and paper checklists—creating costly information gaps between the office and the field.

This module introduces a dedicated, passwordless portal where subcontractors can view their assigned scope and schedule, complete task checklists with supporting documentation, and receive real-time status updates. On the PM side, it adds structured task assignment, multi-step approval workflows, subcontractor performance scoring, and payment milestone tracking—all woven into Proesphere’s existing project, schedule, and financial infrastructure.

The result is a closed-loop system: work is assigned, executed, verified, scored, and paid—all within one platform, eliminating the back-and-forth that currently costs small and mid-sized GCs an estimated 15–20% of project management overhead.

# **2\. Problem Statement**

## **2.1 Current Pain Points**

* **Fragmented Communication:** PMs relay task details via text, email, and verbal instructions. Requirements get lost, misunderstood, or forgotten between office and job site.

* **No Completion Verification:** There is no structured way to confirm a task was completed to spec. PMs rely on site visits and phone calls, creating delays in approvals and payments.

* **Invisible Performance:** GCs have no quantitative data on subcontractor reliability, quality, or timeliness. Hiring decisions for future projects are based on gut instinct and anecdotal memory.

* **Payment Disputes:** Without a documented trail from task assignment to verified completion, pay applications become points of friction. Disputed line items slow down cash flow for both parties.

* **Schedule Blind Spots:** Subs have no visibility into where their work fits in the overall project timeline, leading to scheduling conflicts, idle crews, and cascading delays.

## **2.2 Target Users**

| Persona | Role Description | Key Needs |
| :---- | :---- | :---- |
| **Project Manager** | Creates projects, assigns work, approves completions, manages budget | Structured assignment, approval queues, performance data, payment tracking |
| **Subcontractor** | Executes assigned scope of work on one or more projects | Clear task lists, schedule context, simple check-off with photo upload, payment visibility |
| **Company Admin** | Oversees all projects, manages sub relationships at the company level | Cross-project sub analytics, vendor management, compliance tracking |
| **Site Lead** | On-site supervisor coordinating daily sub activities | Real-time task status, daily progress reports, issue flagging |

# **3\. Goals & Success Metrics**

## **3.1 Product Goals**

* **Close the Loop:** Create a documented, traceable path from task assignment through execution, verification, and payment for every line item of subcontracted work.

* **Reduce PM Overhead:** Eliminate manual follow-ups by giving subs self-service access to their assignments and providing PMs with automated status tracking.

* **Enable Data-Driven Sub Selection:** Build a quantitative performance history that GCs can use to make informed hiring decisions on future projects.

* **Accelerate Payment Cycles:** Tie verified task completion directly to payment milestones, reducing disputes and speeding up pay application processing.

## **3.2 Success Metrics**

| Metric | Baseline | Target (6mo) | Target (12mo) |
| :---- | :---- | :---- | :---- |
| Sub portal adoption rate | 0% (new feature) | 40% | 70% |
| Avg. task completion-to-approval time | 3–5 days (manual) | \< 24 hours | \< 12 hours |
| Payment dispute rate | \~15% of line items | \< 8% | \< 3% |
| PM hours spent on sub coordination/week | 8–12 hours | 4–6 hours | 2–3 hours |
| Tasks with photo documentation | \~20% (ad hoc photos) | 60% | 85% |

# **4\. Feature Specification**

## **4.1 Subcontractor Portal Access (Passwordless)**

Subcontractors access the platform through a dedicated portal using magic link authentication, consistent with Proesphere’s client portal pattern. This eliminates the password management friction that causes drop-off among construction professionals who access digital tools infrequently.

### **4.1.1 Authentication Flow**

1. PM invites subcontractor by entering their name, company, trade, email, and mobile number.

2. System sends a white-labeled invitation via email and SMS with a magic link to the sub portal.

3. Subcontractor taps the link, which authenticates them and lands on their project dashboard. No password creation required.

4. Subsequent access is via new magic links (valid for 15 minutes) or passkey enrollment for frequent users.

5. Sessions persist for 7 days on trusted devices. After expiry, a new magic link is required.

### **4.1.2 Portal Capabilities**

* View assigned tasks and checklists for all active projects

* See their scope’s schedule within the project timeline (read-only Gantt view filtered to their trade)

* Mark tasks/checklist items as complete with optional documentation uploads

* View approval status and PM feedback on completed work

* Access payment milestone status and history tied to their completed work

* Receive push notifications (if mobile) and SMS/email alerts for new assignments and status changes

## **4.2 Task & Checklist Assignment**

Project managers can create structured work packages that combine tasks (high-level deliverables) with checklists (granular verification items). This two-tier structure mirrors how construction work is actually scoped: a task like “Install kitchen rough-in plumbing” contains checklist items like “Water supply lines stubbed out,” “Drain lines sloped to spec,” and “Pressure test passed.”

### **4.2.1 Task Creation**

* Task name, description, and detailed instructions (rich text with inline images)

* Assignment to one or more subcontractors (primary \+ support subs)

* Scheduling: start/end dates synced with the project schedule, with dependency linking

* Priority level: Critical, High, Medium, Low

* Location tagging: associate tasks with specific project areas, floors, or zones

* Estimated vs. actual hours tracking

* Material requirements: link to Proesphere’s material tracking tables

### **4.2.2 Checklist Configuration**

* Each task contains one or more checklists with ordered items

* Checklist items can be marked as: required documentation (photo/file mandatory), inspection-required (triggers PM site visit), or standard completion (self-reported by sub)

* Checklist templates: PMs can save and reuse checklists across projects (e.g., “Rough Plumbing Inspection Checklist,” “Drywall Completion Checklist”)

* Bulk assignment: apply a checklist template to multiple tasks simultaneously

* Conditional items: certain checklist items only appear based on project type or local code requirements

### **4.2.3 Assignment Workflow**

1. PM creates task or selects from template library.

2. PM assigns to subcontractor(s) and sets schedule parameters.

3. System sends notification to sub(s) via their preferred channel (SMS/email/push).

4. Sub acknowledges receipt of assignment (or it auto-acknowledges after 48 hours).

5. Task appears in sub’s portal dashboard with full context.

## **4.3 Task Completion & Documentation**

Subcontractors complete tasks through a mobile-optimized interface designed for job-site conditions—gloved hands, bright sunlight, intermittent connectivity.

### **4.3.1 Completion Flow**

1. Sub opens assigned task from their dashboard or via direct link from notification.

2. Sub works through checklist items, checking them off sequentially or in any order.

3. For documentation-required items: sub uploads photos, PDFs, or files directly from camera or device storage. Multiple files per item supported.

4. Sub can add notes to any checklist item (e.g., “Used 3/4″ PEX instead of 1/2″ per PM direction”).

5. Once all required items are checked and documentation is uploaded, sub marks the overall task as “Complete — Pending Review.”

6. System timestamps every action and creates an immutable completion record.

### **4.3.2 Supported Documentation Types**

| Type | Formats | Use Case |
| :---- | :---- | :---- |
| Photos | JPEG, PNG, HEIC | Progress photos, completed work verification, before/after |
| Documents | PDF, DOCX | Inspection reports, test results, manufacturer certs |
| Videos | MP4, MOV (\< 100 MB) | Pressure tests, equipment operation demos |
| Drawings | PDF, DWG | As-built markups, shop drawing confirmations |

### **4.3.3 Offline Support**

Construction sites frequently have poor connectivity. The module supports offline task completion with automatic sync when connectivity is restored. Checklist progress, notes, and queued photo uploads are cached locally and pushed to the server in the background.

## **4.4 PM Approval Workflow**

Every task marked as complete by a subcontractor enters a structured approval pipeline before it is considered officially done. This creates the verification layer that protects both the GC (quality assurance) and the subcontractor (documented acceptance of their work).

### **4.4.1 Approval States**

| State | Description | Next Actions |
| :---- | :---- | :---- |
| Not Started | Task assigned but sub has not begun work | Sub begins work |
| In Progress | Sub has started checking off items | Sub continues or pauses |
| Pending Review | Sub marked complete; awaiting PM review | PM approves, rejects, or requests revision |
| Revision Requested | PM identified issues; sub must address and resubmit | Sub fixes and resubmits |
| Approved | PM verified and accepted the work | Triggers payment milestone (if linked) |
| Rejected | Work does not meet requirements; must be redone | Sub restarts task or escalates |

### **4.4.2 PM Review Interface**

* Centralized approval queue showing all tasks in “Pending Review” state across projects

* Side-by-side view: checklist requirements on the left, sub’s uploaded documentation on the right

* Inline annotation: PM can mark up uploaded photos with comments (draw, circle, add text)

* Batch approval: approve multiple tasks simultaneously when doing a site walkthrough

* Rejection requires a reason (selected from predefined categories \+ free text) to maintain documentation standards

* Approval triggers automated notification to sub and updates project schedule status

### **4.4.3 Escalation Rules**

* If a task sits in “Pending Review” for more than 48 hours, the system sends a reminder to the PM and escalates to the project’s admin contact.

* If a task is rejected twice, it is automatically flagged for a mandatory site meeting between PM and sub.

* Company admins can configure escalation timelines per project or globally.

## **4.5 Subcontractor Scope Schedule View**

Each subcontractor sees a filtered, read-only schedule view that shows their full scope of work within the project timeline. This gives subs the context they need to plan their crews and materials without exposing the entire project schedule or other subcontractors’ details.

### **4.5.1 Schedule Features**

* Filtered Gantt chart showing only tasks assigned to the logged-in sub

* Key project milestones visible as reference markers (e.g., “Framing Complete,” “Final Inspection”)

* Color-coded status indicators: Not Started (gray), In Progress (blue), Pending Review (amber), Approved (green), Overdue (red)

* Dependency indicators: if a sub’s task depends on another trade’s completion, show predecessor status without revealing sub details (e.g., “Blocked: waiting on predecessor task”)

* Week view and month view toggle

* Today’s Tasks section prominently displayed at the top for immediate field reference

## **4.6 Performance Tracking & Scoring**

Proesphere automatically builds a quantitative performance profile for every subcontractor across all projects. This transforms sub selection from guesswork into a data-driven decision, one of the most requested capabilities from GCs.

### **4.6.1 Scoring Dimensions**

| Dimension | Weight | Data Source | Calculation |
| :---- | :---- | :---- | :---- |
| **Timeliness** | 30% | Task due dates vs. completion dates | % of tasks completed on or before deadline |
| **Quality** | 30% | First-pass approval rate | % of tasks approved without revision request |
| **Documentation** | 15% | Photo/file uploads per task | % of doc-required items with complete uploads |
| **Responsiveness** | 15% | Time to acknowledge \+ revision turnaround | Average response time across interactions |
| **Safety** | 10% | Safety incidents, compliance flags | Inverse of incident count, normalized |

### **4.6.2 Reporting & Visibility**

* Composite score (0–100) displayed on the subcontractor’s profile card within Proesphere

* Trend graphs: per-project and all-time performance trends

* PM dashboard widget: “Top Performing Subs” and “Subs Requiring Attention” lists

* Company admin view: cross-project sub leaderboard, trade-level benchmarking

* Sub self-view: subs can see their own scores and trends (transparency builds trust and motivates improvement)

* Exportable reports for vendor review meetings and prequalification assessments

## **4.7 Payment Milestone Integration**

Payment milestones link verified task completion to financial obligations, creating an auditable trail from “work done” to “payment released.” This feature integrates with Proesphere’s existing payment processing tables.

### **4.7.1 Milestone Configuration**

* PMs define payment milestones per subcontract, each tied to one or more tasks

* Milestone types: fixed amount, percentage of contract, or unit-price based

* Retention rules: configurable retention percentage held until project completion or specific milestone

* Conditional release: milestone becomes payable only when all linked tasks reach “Approved” status

### **4.7.2 Payment Flow**

1. All tasks linked to a milestone reach “Approved” status.

2. System automatically marks the milestone as “Payable” and notifies the PM.

3. PM reviews and includes the milestone in the next pay application cycle.

4. Payment status is visible to the sub in their portal (Pending, Approved, Paid).

5. Payment history with amounts and dates is maintained for both parties.

### **4.7.3 Sub Portal Payment View**

* Contract summary: total contract value, amount earned, amount paid, retention held, remaining

* Milestone-by-milestone breakdown with status indicators

* Projected payment dates based on milestone progress and pay application schedule

* Read-only view: subs cannot modify payment data, only view their status

# **5\. Additional High-Impact Features**

The following features extend the core module with capabilities that significantly increase platform stickiness and differentiate Proesphere from competitors.

## **5.1 Daily Log & Progress Reports**

Auto-generated daily progress reports compiled from sub activity—tasks completed, photos uploaded, issues flagged—sent to the PM at end of day. Eliminates the need for PMs to manually write daily reports and ensures nothing falls through the cracks.

## **5.2 Issue Flagging & RFI Integration**

Subcontractors can flag issues directly from a task (e.g., “Discrepancy between plans and field conditions”). Flagged issues create a structured record with photo documentation and auto-route to the PM for resolution. Critical issues can be escalated to generate RFIs that integrate with Proesphere’s existing issue tracking.

## **5.3 Subcontractor Directory & Prequalification**

Company-level subcontractor directory with trade classifications, insurance/license expiration tracking, and historical performance scores. PMs can search for available subs by trade, location, and minimum performance score when staffing new projects. Automated alerts when certifications are approaching expiration.

## **5.4 Change Order Impact Tracking**

When a change order affects subcontracted work, the system identifies impacted tasks and subcontractors, generates updated scope notifications, and creates amendment records with revised payment milestones. This prevents the common scenario where a change order is approved but the subs doing the work are never formally notified.

## **5.5 AI-Powered Insights (Future — Agentic Integration)**

Leveraging Proesphere’s planned agentic AI capabilities, the subcontractor module will support natural language interactions for PMs such as: “Which subs are behind schedule this week?”, “Show me all unreviewed completions from yesterday,” and “Compare electrician performance across my last three projects.” Predictive capabilities will flag at-risk tasks before they become overdue based on historical sub performance patterns.

# **6\. Database Schema Extensions**

The following new tables extend Proesphere’s existing 45+ table architecture. All tables follow existing naming conventions and reference established foreign keys (projects, users, etc.).

| Table | Type | Description |
| :---- | :---- | :---- |
| **subcontractors** | Core entity | Sub company profile: name, trade, contact, insurance info, license data, overall performance score |
| **subcontractor\_assignments** | Junction | Links subs to projects with role (primary/support), contract value, dates, status |
| **sub\_tasks** | Core entity | Assigned task: name, description, instructions, priority, schedule, location tag, status, assigned sub(s) |
| **sub\_checklists** | Child of task | Checklist container: name, template reference, task FK |
| **sub\_checklist\_items** | Child of checklist | Individual item: description, type (standard/doc-required/inspection), order, completion status, completed\_by, completed\_at |
| **sub\_task\_documents** | Supporting | Uploaded files: checklist item FK, file URL, file type, upload timestamp, uploaded\_by |
| **sub\_task\_reviews** | Workflow | PM review record: task FK, reviewer, decision (approved/rejected/revision), feedback, timestamp |
| **sub\_performance\_scores** | Analytics | Computed scores per sub per project: timeliness, quality, documentation, responsiveness, safety, composite |
| **sub\_payment\_milestones** | Financial | Milestone definition: sub assignment FK, linked tasks, amount, retention %, status, paid date |
| **sub\_checklist\_templates** | Reference | Reusable templates: name, trade category, created\_by, item definitions (JSON) |
| **sub\_notifications** | Communication | Notification log: recipient, channel, type, content, sent\_at, read\_at |

# **7\. Technical Requirements**

## **7.1 Authentication & Security**

* Magic link tokens: cryptographically signed, single-use, 15-minute expiry

* Passkey (WebAuthn) enrollment available after first magic link login

* Row-level security (RLS) on all sub-facing tables: subs can only access their own assignments

* Audit trail: every state change, approval, and document upload logged with actor and timestamp

* White-labeled communications: all emails/SMS use the GC’s branding, not Proesphere’s

## **7.2 Performance & Scalability**

* Portal dashboard load time: \< 2 seconds on 3G connections

* Photo upload: compressed client-side before upload; background sync for queued uploads

* Offline-first architecture for task completion and checklist progress

* Database indexes on: sub\_tasks(assigned\_to, status), sub\_checklist\_items(task\_id, status), sub\_payment\_milestones(assignment\_id, status)

## **7.3 Integration Points**

* Project schedule: bidirectional sync between sub\_tasks and existing schedule tables

* Material tracking: sub\_tasks can reference material\_items for BOM visibility

* Issue tracking: flagged issues from subs create records in existing issues table

* Payment processing: milestone status changes feed into existing payment workflows

* Notifications: integrates with existing notification infrastructure (email via SendGrid, SMS via Twilio)

* AI agent layer: sub-related tools registered in the planned agent tool registry

# **8\. Phased Rollout Plan**

| Phase | Timeline | Scope | Success Gate |
| :---- | :---- | :---- | :---- |
| **Phase 1** | Weeks 1–4 | Core task assignment, checklist completion, document upload, sub portal with magic link auth | 3 pilot GCs onboarded, sub login rate \> 50% |
| **Phase 2** | Weeks 5–8 | PM approval workflow, scope schedule view, notification system, checklist templates | Approval cycle \< 24hr avg, PM satisfaction \> 4/5 |
| **Phase 3** | Weeks 9–12 | Performance scoring, payment milestone integration, sub directory, daily auto-reports | Payment disputes \< 8%, scores calibrated with PM feedback |
| **Phase 4** | Weeks 13–16 | Issue flagging, change order impact, offline mode, AI-powered insights (beta) | Feature adoption \> 30%, AI query accuracy \> 85% |

# **9\. Risks & Mitigations**

| Risk | Severity | Mitigation |
| :---- | :---- | :---- |
| **Low sub adoption** | High | Passwordless auth reduces barrier; SMS-first notifications meet subs where they are; incentivize with payment visibility |
| **Poor connectivity on sites** | High | Offline-first architecture; background sync; client-side photo compression; graceful degradation |
| **PM approval bottleneck** | Medium | Escalation rules with configurable timelines; batch approval for efficiency; delegation to site leads |
| **Performance score gaming** | Medium | Scores based on PM-verified data, not self-reported; photo documentation required for key items; anomaly detection |
| **Scope creep in Phase 1** | Medium | Strict phase gates with defined success criteria; features only advance when gate metrics are met |
| **Data migration complexity** | Low | New module with new tables; no migration needed. Existing project/user FKs ensure compatibility |

# **10\. Open Questions**

1. Should subs be able to communicate directly with PMs through an in-app messaging feature, or should communication remain external (SMS/email)?

2. What is the maximum file size and storage budget per project for sub-uploaded documentation?

3. Should performance scores be visible to other GCs (marketplace model), or strictly internal to each GC company?

4. Is there a need for sub-to-sub visibility in cases where trades need to coordinate directly (e.g., plumber and electrician in the same wall cavity)?

5. Should the payment milestone feature integrate with external accounting software (QuickBooks, Sage) in Phase 3 or be deferred to a later release?

6. What role should insurance and license verification play in the assignment workflow? Should expired docs block new assignments?

# **11\. Appendix: Key User Stories**

| ID | Persona | User Story |
| :---- | :---- | :---- |
| **US-001** | PM | As a PM, I want to assign a task with a checklist to a subcontractor so that they have clear, documented expectations for the work. |
| **US-002** | PM | As a PM, I want to review completed tasks with uploaded photos side-by-side against the checklist requirements so I can approve or reject efficiently. |
| **US-003** | PM | As a PM, I want to see a real-time dashboard of all sub task statuses across my projects so I know where things stand without making phone calls. |
| **US-004** | Sub | As a subcontractor, I want to access my tasks via a magic link so I don’t need to remember another password. |
| **US-005** | Sub | As a subcontractor, I want to see my full scope schedule so I can plan my crews and materials for the coming weeks. |
| **US-006** | Sub | As a subcontractor, I want to upload photos to prove task completion so I can get approved and paid faster. |
| **US-007** | Sub | As a subcontractor, I want to see my payment milestone status so I know when to expect payment without calling the GC office. |
| **US-008** | Sub | As a subcontractor, I want to flag issues I encounter so the PM can resolve them before they block my work. |
| **US-009** | Admin | As a company admin, I want to see performance scores for all subs across projects so I can make data-driven hiring decisions. |
| **US-010** | Admin | As a company admin, I want to be alerted when a sub’s insurance or license is expiring so we maintain compliance. |
| **US-011** | PM | As a PM, I want payment milestones to automatically become payable when linked tasks are approved so I don’t have to manually track completion-to-payment. |
| **US-012** | PM | As a PM, I want to save checklist templates so I can quickly assign standardized quality checks across projects. |

*End of Document*
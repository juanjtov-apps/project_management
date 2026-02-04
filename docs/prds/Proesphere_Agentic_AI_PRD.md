  
**PROESPHERE**

**Product Requirements Document**

Agentic AI Engine

| Document | PRD-AGENT-001 | Version | 1.0 |
| :---- | :---- | :---- | :---- |
| **Author** | Juan Tov | **Status** | Draft |
| **Date** | February 3, 2026 | **Classification** | Internal |

# **Table of Contents**

**1\.**  Executive Summary

**2\.**  Product Vision & Goals

**3\.**  User Personas & Roles

**4\.**  Agent Architecture Overview

**5\.**  Tool Definitions & Capabilities

**6\.**  Natural Language Intent Taxonomy

**7\.**  Agentic Workflow Specifications

**8\.**  Guardrails, Safety & Human-in-the-Loop

**9\.**  Data Model & Integration Points

**10\.**  API Design & Technical Specifications

**11\.**  Client Portal Agent Capabilities

**12\.**  Proactive & Autonomous Behaviors

**13\.**  Success Metrics & KPIs

**14\.**  Implementation Phases & Roadmap

**15\.**  Risks & Mitigations

**16\.**  Appendix: Example Conversations

# **1\. Executive Summary**

Proesphere is an intelligent, agent-driven project management hub for small and mid-sized general contractors. This PRD defines the complete specification for the Agentic AI Engine, the core intelligence layer that transforms Proesphere from traditional project management software into a natural language operations platform.

The Agentic AI Engine enables users to describe outcomes in plain language and receive structured, actionable results. Instead of navigating screens, filling forms, and managing data entry, users interact with an AI agent that understands construction project context, executes multi-step workflows, and returns professional outputs including Gantt charts, stage plans, daily logs, materials lists, approval requests, and executive dashboards.

**Core Thesis:** Project managers should focus on customer experience, risk and margin control, KPI-driven execution, team leadership, and cross-sell opportunities. The AI agent handles everything else.

**Key Differentiators**

* **Outcome-Oriented Interface:** Users request results, not navigate software. The agent translates intent into structured project operations.

* **Construction-Native Intelligence:** The agent understands scope changes, material dependencies, approval chains, weather impacts, trade sequencing, and client anxiety patterns.

* **Continuous Learning from Field Activity:** Daily logs, photos, and voice notes feed back into the agent, keeping schedules, materials lists, and risk assessments current.

* **Multi-Stakeholder Awareness:** The agent adapts its communication style and information depth for PMs, site leads, clients, and executives.

# **2\. Product Vision & Goals**

**Vision Statement**

Freedom from project management software. Proesphere continuously translates real-world job activity into plans, actions, and stakeholder-ready outputs through a single intelligent interface.

**Strategic Goals**

| Goal | Description |
| :---- | :---- |
| **G1: Eliminate PM Overhead** | Reduce time spent on administrative tasks (updates, reports, scheduling, filling documents) by 60% within the first 90 days of adoption. |
| **G2: Accelerate Decisions** | Cut time from field question to approved decision by 50% through agent-driven RFI and change order workflows. |
| **G3: Improve Client Trust** | Reduce inbound client status inquiries by 70% through proactive, plain-language client portal updates. |
| **G4: Protect Margins** | Surface margin risk signals (scope creep, stalled approvals, material cost changes) before they become losses. |
| **G5: Drive Daily Adoption** | Achieve daily active usage from PMs and site leads because the agent is faster than any alternative. |

# **3\. User Personas & Roles**

The Agentic AI Engine serves four distinct user personas, each with different interaction patterns, permission levels, and information needs. The agent must adapt its communication style, detail level, and available actions based on the active persona.

## **3.1 Project Manager (Primary User)**

**Role:** Orchestrates project execution across multiple active projects. Manages team, client relationships, budgets, and timelines.

**Daily Workflow:** Reviews overnight updates, processes RFIs, updates clients, manages material procurement, coordinates subcontractors, tracks KPIs.

**Agent Interaction Pattern:** High-frequency, outcome-driven commands. Expects the agent to handle complexity and return clean results.

*Example Requests:* 

* "Build my schedule for the Henderson kitchen renovation"

* "What is blocking framing on the Oak Street project?"

* "Show me margin risk across all active projects"

* "Update the Johnsons that demolition is complete and framing starts Monday"

* "Create a materials list for the next two weeks on Riverside"

## **3.2 Site Lead / Foreman**

**Role:** On-site execution leader. Manages daily crew activities, reports progress, flags issues.

**Daily Workflow:** Arrives at site, documents progress with photos and voice notes, identifies blockers, coordinates with trades.

**Agent Interaction Pattern:** Quick capture and status reporting. Often uses voice input. Needs mobile-optimized, hands-free interactions on the job site.

*Example Requests:* 

* "Log: Framing 80% complete, waiting on window delivery, two photos attached"

* "The plumber can't start until the electrician finishes rough-in. Flag this."

* "What tasks are on my plate today for this site?"

## **3.3 Client / HomeAdmin**

**Role:** Property Admin funding the construction project. Needs transparency, trust, and simple decision-making interfaces.

**Interaction Pattern:** Periodic check-ins through client portal. Asks plain-language questions. Needs to approve decisions, review progress, and understand payment schedules.

**Agent Behavior:** Responds with simplified, non-technical language. Never exposes internal project complexity. Provides reassurance and clear next steps.

*Example Requests:* 

* "When will the kitchen be usable again?"

* "Why did the cost increase?"

* "I approve the tile selection for the master bath"

## **3.4 Company Admin / Executive**

**Role:** Business Admin overseeing multiple project managers and the company's overall profitability.

**Interaction Pattern:** Dashboard-oriented. Wants aggregated KPIs, risk signals, and portfolio-level insights.

*Example Requests:* 

* "Show me all projects with margin below 15%"

* "Which projects have stalled approvals?"

* "What is our average cycle time from question to decision this quarter?"

# **4\. Agent Architecture Overview**

The Proesphere Agentic AI Engine operates as a multi-layer intelligence system with three core subsystems: the Conversation Layer, the Orchestration Layer, and the Execution Layer.

## **4.1 Architecture Layers**

| Layer | Responsibility | Implementation |
| :---- | :---- | :---- |
| **Conversation Layer** | Natural language understanding, intent classification, context management, multi-turn memory | Open Router API with system prompts tuned for construction domain. Maintains conversation history per user per project. |
| **Orchestration Layer** | Decomposes complex requests into tool call sequences, manages dependencies, handles retries | Agentic loop with step-by-step planning. The agent decides which tools to call, in what order, and how to compose results. |
| **Execution Layer** | Database queries, CRUD operations, PDF generation, notification dispatch, external API calls, documents completion | Tool functions mapped to Proesphere REST APIs and database operations. Each tool has defined inputs, outputs, and permissions. |
| **Guardrail Layer** | Permission enforcement, confirmation gates, audit logging, rate limiting, cost controls | Middleware that intercepts every tool call. Destructive operations require human confirmation. |
| **Context Layer** | Project state, user preferences, historical patterns, cross-project intelligence | Enrichment system that injects relevant context into every agent interaction. Learns from project history. |

## **4.2 Agentic Loop Flow**

The core agentic loop follows a plan-execute-reflect pattern. For every user request, the agent:

1. **Classifies Intent:** Determines what the user wants to accomplish and which domain it falls under (scheduling, materials, communication, reporting, etc.).

2. **Plans Execution:** Decomposes the request into an ordered sequence of tool calls. For complex requests, this may involve 5-15 sequential or parallel tool invocations.

3. **Executes Tools:** Calls each tool in sequence, passing results from previous calls as inputs to subsequent calls. Handles errors and retries gracefully.

4. **Synthesizes Response:** Assembles tool results into a coherent, persona-appropriate response. For PMs, this is detailed and actionable. For clients, this is simple and reassuring.

5. **Reflects & Learns:** Logs the interaction for analytics, updates project context, and identifies proactive follow-up opportunities.

 


## **4.3 Context Window Strategy**

Each agent interaction is enriched with contextual information to ensure accurate, relevant responses. The context window is composed dynamically based on the request type:

* **System Prompt:** Construction domain expertise, Proesphere-specific instructions, persona-aware communication guidelines, available tool definitions.

* **User Context:** User role, permissions, company, active projects, preferences, time zone, recent activity.

* **Project Context:** Active project state including current stage, recent logs, open issues, pending approvals, upcoming milestones, budget status.

* **Conversation History:** Last 30 messages in the current conversation thread for multi-turn coherence, but always save every conversation in the database

* **Cross-Project Intelligence:** Patterns from other projects (e.g., typical stage durations, common blockers) when relevant for planning or risk assessment.

# **5\. Tool Definitions & Capabilities**

Tools are the functions the AI agent can invoke to read, write, and transform data within Proesphere. Each tool is mapped to the underlying database schema and REST API layer. Tools are organized by domain and include permission requirements, input/output specifications, and confirmation requirements.

## **5.1 Project Management Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **get\_projects** | List all projects for the current user's company with status, stage, and summary metrics. | PM, Admin | Read-only |
| **get\_project\_detail** | Retrieve comprehensive project state: stages, tasks, materials, issues, payments, timeline, team, and KPIs. | PM, Admin | Read-only |
| **create\_project** | Initialize a new project from natural language description. Agent extracts: name, address, client, type, estimated dates, budget. | PM, Admin | Requires confirmation |
| **update\_project** | Modify project-level fields: status, dates, budget, description, team assignments. | PM, Admin | Audit logged |
| **archive\_project** | Mark a project as archived. Retains all data but removes from active views. | PM, Admin | Requires confirmation |
| **get\_project\_timeline** | Generate or retrieve the project timeline showing stages, milestones, dependencies, and critical path. | All roles | Read-only |
| **search\_projects** | Search across all projects by keyword, status, date range, client name, or address. | PM, Admin | Read-only |

## **5.2 Stages & Task Management Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **get\_stages** | Retrieve all stages for a project with task counts, completion percentages, and status pills (not started, in progress, complete, overdue). | All roles | Read-only |
| **create\_stage** | Create a new project stage with name, order index, start/end dates, and material requirements flag. | PM and admin | Audit logged |
| **update\_stage** | Modify stage details: dates, ordering, material notes. Automatically recalculates downstream dependencies. | PM and admin | Audit logged |
| **reorder\_stages** | Batch reorder stages within a project. Recalculates all dependent dates. | PM and admin | Audit logged |
| **get\_tasks** | Retrieve all tasks for a stage with completion status, assignees, and due dates. | All roles | Read-only |
| **create\_task** | Add a task to a stage. Agent extracts: name, assignee, due date, priority, dependencies. | PM, and admin | Audit logged |
| **complete\_task** | Mark a task as completed with timestamp and user attribution. | PM, admin | Audit logged |
| **bulk\_update\_tasks** | Update multiple tasks simultaneously (e.g., reassign all tasks from one worker to another). | admin | Requires confirmation |
| **generate\_schedule** | Auto-generate a complete stage plan and Gantt timeline from project scope description and historical data. | PM and admin | Requires review |

## **5.3 Daily Log & Field Reporting Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **create\_daily\_log** | Create a structured daily log from photo uploads and voice-to-text notes. Agent transforms raw input into: work completed, issues encountered, weather conditions, crew count, materials used. | admin, PM | Audit logged |
| **get\_daily\_logs** | Retrieve daily logs for a project filtered by date range, author, or content keyword. | All roles | Read-only |
| **process\_photo** | Analyze uploaded job site photos to extract progress indicators, identify safety concerns, and tag by project stage. | admin, PM | Read-only |
| **generate\_progress\_report** | Synthesize daily logs into a weekly or milestone progress report suitable for client distribution. | PM and admin | Requires review |
| **extract\_next\_steps** | Parse recent daily logs to identify implicit next steps, unresolved issues, and items needing follow-up. | PM and admin | Read-only |

## **5.4 Materials Intelligence Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **get\_materials** | Retrieve materials list for a project or stage, grouped by category (fixtures, finishes, structural, appliances). Includes status: pending selection, selected, ordered, delivered, installed. | All roles | Read-only |
| **create\_material** | Add a material item with category, specifications, quantity, unit cost, supplier, and stage assignment. | PM and admin | Audit logged |
| **update\_material\_status** | Progress a material through its lifecycle: pending \> selected \> ordered \> delivered \> installed. | PM, and admin | Audit logged |
| **generate\_materials\_list** | Auto-generate a materials list for upcoming stages based on project scope, historical data, and current selections. | PM and admin | Requires review |
| **check\_material\_risks** | Identify materials that are not yet ordered but are needed within the next 2 weeks based on the schedule. Flags supply chain risks. | PM and admin | Read-only |
| **export\_materials\_pdf** | Generate a formatted PDF materials report grouped by stage and category, suitable for procurement or client review. | PM and admin | Read-only |

## **5.5 RFI & Change Order Workflow Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **create\_rfi** | Create a Request for Information from a field question. Agent structures: question, context, photos, requested response date, impact assessment. | admin, PM | Audit logged |
| **respond\_to\_rfi** | Record a response to an RFI and route to the next stakeholder (office review or client approval). | PM and admin | Audit logged |
| **create\_change\_order** | Generate a change order with scope description, cost impact, timeline impact, and approval requirements. | PM and admin | Requires confirmation |
| **get\_pending\_approvals** | List all items awaiting approval across projects: RFIs, change orders, material selections, payment releases. | PM, admin | Read-only |
| **send\_approval\_request** | Send an approval request to the designated approver with a clear impact summary and decision deadline. | PM, admin | Audit logged |
| **process\_approval** | Record an approval or rejection with notes. Triggers downstream actions (schedule updates, material orders, notifications). | PM, Client. admin | Audit logged |
| **escalate\_stalled\_item** | When an approval or decision has exceeded its deadline, automatically follow up with the responsible party and escalate if necessary. | Agent (auto) | Audit logged |

## **5.6 Financial & Payment Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **get\_payment\_schedule** | Retrieve the payment schedule for a project showing installments, amounts, due dates, and status (pending, invoiced, paid, overdue). | Admin | Read-only |
| **create\_installment or create\_installments** | Add a payment installment tied to a project milestone or stage completion. Additionally, using a home improvement contract or an addendum create the installments list based on the read documents. | Admin | Requires confirmation |
| **generate\_invoice** | Create an invoice for a completed milestone with line items, totals, and payment instructions. | Admin, Office manager | Requires review |
| **track\_payment** | Record a payment received against an installment. Updates project financials. | Admin, Office manager | Audit logged |
| **get\_margin\_analysis** | Calculate current margin for a project based on actual costs vs. budget, with variance analysis and risk indicators. | Admin | Read-only |
| **get\_portfolio\_financials** | Aggregate financial metrics across all active projects: total revenue, costs, margins, AR aging. | Admin | Read-only |

## **5.7 Communication & Notification Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **send\_client\_update** | Compose and send a plain-language progress update to the client through the portal. Agent drafts content based on recent logs and milestones. | PM and admin | Requires review |
| **send\_team\_notification** | Send a targeted notification to team members about assignments, blockers, or schedule changes. | PM and admin | Audit logged |
| **generate\_client\_update\_draft** | Auto-generate a client update email or portal message based on recent project activity, ready for PM review and approval. | Agent (auto) | Requires review |
| **get\_communication\_history** | Retrieve all communications for a project filtered by type, recipient, or date. | PM and admin | Read-only |
| **create\_forum\_thread** | Create a discussion thread in the project forum for team collaboration on a topic. | PM, and admin | Audit logged |
| **post\_forum\_reply** | Post a reply to an existing forum thread. | All roles | Audit logged |

## **5.8 KPI Dashboard & Analytics Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **get\_project\_kpis** | Retrieve key performance indicators for a project: cycle time, approval speed, rework signals, stall aging, labor reliability, schedule adherence. | PM, Admin | Read-only |
| **get\_company\_kpis** | Aggregate KPIs across all active projects for executive dashboard. | Admin | Read-only |
| **identify\_risk\_signals** | Analyze project data to identify emerging risks: scope creep patterns, approval bottlenecks, material delays, budget overruns. | PM, Admin | Read-only |
| **generate\_kpi\_report** | Create a formatted KPI report for a specified time period, suitable for stakeholder presentation. | PM, Admin | Read-only |
| **compare\_projects** | Compare KPIs across multiple projects to identify best practices and outliers. | Admin | Read-only |

## **5.9 Document Management Tools**

| Tool Name | Description | Access | Safety Level |
| :---- | :---- | :---- | :---- |
| **fill\_template** | Auto-fill a document template (permit application, lien waiver, change order form) from project data. Returns a draft for human review. | PM, office manager and admin | Requires review |
| **generate\_pdf\_report** | Create a formatted PDF report from any data domain: progress, materials, financials, KPIs. | PM, Admin | Read-only |
| **upload\_document** | Attach a document to a project record with metadata tagging (type, stage, date, author). | All roles | Audit logged |
| **search\_documents** | Search across all project documents by keyword, type, date range, or stage. For PMs it does not include financial documents | PM, office manager and admin | Read-only |
| **generate\_executive\_summary** | Create a one-page executive summary for a project or portfolio, suitable for investor or board presentations. | Admin | Requires review |

# **6\. Natural Language Intent Taxonomy**

The agent must classify incoming natural language requests into structured intents. This taxonomy defines the complete space of user intents the agent must handle. Each intent maps to one or more tool calls and may trigger multi-step agentic workflows.

| Category | Intent | Example Utterance | Tool Chain |
| :---- | :---- | :---- | :---- |
| **Query** | project\_status | *"How is the Oak Street project going?"* | get\_project\_detail, get\_stages, get\_pending\_approvals |
| **Query** | blocker\_analysis | *"What is blocking framing?"* | get\_tasks, get\_materials, get\_pending\_approvals, identify\_risk\_signals |
| **Query** | margin\_risk | *"Show me margin risk across all projects"* | get\_portfolio\_financials, identify\_risk\_signals |
| **Query** | schedule\_check | *"When will electrical rough-in be done?"* | get\_project\_timeline, get\_stages, get\_tasks |
| **Create** | new\_project | *"Start a new project for the Henderson kitchen reno"* | create\_project, create\_stages, generate\_schedule, generate\_materials\_list |
| **Create** | daily\_log | *"Log: demo done, 3 loads to dump, starting framing tomorrow"* | create\_daily\_log, update\_stage, extract\_next\_steps |
| **Create** | rfi\_request | *"The beam pocket depth doesn't match plans. Need clarification."* | create\_rfi, send\_team\_notification |
| **Create** | change\_order | *"Client wants to upgrade to quartz counters. Add a change order."* | create\_change\_order, get\_margin\_analysis, send\_approval\_request |
| **Generate** | schedule | *"Build my schedule for the Riverside bathroom"* | generate\_schedule |
| **Generate** | materials\_list | *"Create a materials list for the next two weeks"* | generate\_materials\_list, check\_material\_risks |
| **Generate** | client\_update | *"Update the Johnsons on progress"* | generate\_client\_update\_draft, send\_client\_update |
| **Generate** | report | *"Weekly progress report for all active projects"* | generate\_progress\_report, get\_project\_kpis |
| **Update** | task\_completion | *"Mark insulation inspection as done"* | complete\_task, update\_stage |
| **Update** | material\_status | *"Tile arrived, mark as delivered"* | update\_material\_status |
| **Update** | project\_dates | *"Push framing back by one week"* | update\_stage, reorder\_stages, send\_team\_notification |
| **Analyze** | portfolio\_health | *"Show me all projects with margin below 15%"* | get\_portfolio\_financials, compare\_projects |
| **Analyze** | approval\_bottleneck | *"Which approvals have been stalled the longest?"* | get\_pending\_approvals, escalate\_stalled\_item |
| **Analyze** | trend\_analysis | *"What's our average cycle time this quarter?"* | get\_company\_kpis, generate\_kpi\_report |

# **7\. Agentic Workflow Specifications**

Agentic workflows are multi-step sequences where the agent chains tool calls together to accomplish complex objectives. Unlike simple query-response interactions, these workflows involve planning, conditional branching, and state management across multiple operations.

## **7.1 Daily Site Briefing Workflow**

**Trigger:** PM opens the app in the morning or says "Give me my morning briefing"

**Agent Actions:**

6. Retrieve all active projects for the PM (get\_projects)

7. For each project, fetch: overnight daily logs, new issues, pending approvals, tasks due today (get\_daily\_logs, get\_pending\_approvals, get\_tasks)

8. Check for materials at risk across all projects (check\_material\_risks)

9. Identify any stalled items exceeding their deadlines (get\_pending\_approvals, identify\_risk\_signals)

10. Synthesize into a prioritized briefing: urgent items first, then project-by-project status, then upcoming milestones

**Output:** A structured morning briefing with urgent alerts, project summaries, and a recommended priority list for the day.

## **7.2 Client Update Generation Workflow**

**Trigger:** PM says "Update the Johnsons on progress"

**Agent Actions:**

11. Identify the Johnson project (search\_projects)

12. Fetch recent daily logs since last client update (get\_daily\_logs)

13. Get current stage status and next milestones (get\_stages, get\_project\_timeline)

14. Check for any pending client approvals (get\_pending\_approvals)

15. Get payment schedule status (get\_payment\_schedule)

16. Draft a plain-language client update in the client portal format (generate\_client\_update\_draft)

17. Present draft to PM for review and approval

18. On approval, send through client portal (send\_client\_update)

**Output:** A client-ready update message delivered through the portal with progress photos, next milestones, and any decisions needed.

## **7.3 RFI-to-Decision Workflow**

**Trigger:** Site lead or PM reports a field question: "The beam pocket depth doesn't match the plans"

**Agent Actions:**

19. Create structured RFI from the field question (create\_rfi)

20. Attach relevant photos and mark affected stage/task

21. Assess schedule and cost impact (get\_project\_timeline, get\_margin\_analysis)

22. Route to office PM with impact summary (send\_team\_notification)

23. If PM determines client approval needed, generate approval request with one-line impact summary (send\_approval\_request)

24. Set decision deadline and monitor for response

25. If deadline passes, automatically follow up (escalate\_stalled\_item)

26. On resolution, update project records and notify field (process\_approval, send\_team\_notification)

**Output:** Complete audit trail from field question to approved decision, with automatic escalation if stalled.

## **7.4 Change Order Impact Assessment Workflow**

**Trigger:** PM says "Client wants to upgrade to quartz countertops"

**Agent Actions:**

27. Identify the current material selection and its cost (get\_materials)

28. Look up quartz countertop pricing from project data or historical projects

29. Calculate cost delta and impact on project margin (get\_margin\_analysis)

30. Assess timeline impact: does this affect the countertop stage date? Material lead times? (get\_project\_timeline, check\_material\_risks)

31. Generate a change order with cost impact, timeline impact, and approval requirements (create\_change\_order)

32. Draft client-facing approval request with clear impact summary (send\_approval\_request)

33. On approval, update materials, budget, and schedule automatically (update\_material\_status, update\_stage, update\_project)

Caveat: some companies don’t have this level of detail. Therefore, a simpler workflow can be generated by asking the user how does he want to calculate the change of order.

**Output:** Complete change order with cost/timeline analysis, routed for approval, with automatic downstream updates on approval.

## **7.5 Weekly KPI Report Workflow**

**Trigger:** Scheduled weekly or "Give me this week's KPI report"

**Agent Actions:**

34. Fetch KPIs for all active projects (get\_project\_kpis, get\_company\_kpis)

35. Compare against previous period to identify trends (compare\_projects)

36. Identify projects with declining metrics or emerging risks (identify\_risk\_signals)

37. Generate formatted report with charts, comparisons, and recommendations (generate\_kpi\_report)

38. Export as PDF for distribution (generate\_pdf\_report)

**Output:** Executive KPI dashboard report with trends, alerts, and actionable recommendations.

# **8\. Guardrails, Safety & Human-in-the-Loop**

The Agentic AI Engine operates within a strict safety framework that ensures human oversight for consequential actions, prevents data corruption, and maintains full auditability.

## **8.1 Action Classification**

| Safety Level | Behavior | Examples |
| :---- | :---- | :---- |
| **Read-Only** | No confirmation needed. Agent executes immediately. | All query/read operations, KPI calculations, report generation previews, search operations. |
| **Audit Logged** | Executes immediately but records who, what, when, and why. | Creating tasks, logging daily entries, posting forum messages, updating material status, sending notifications. |
| **Requires Review** | Agent generates output but PM must approve before committing. | Client communications, auto-generated schedules, template filling, progress reports, materials lists. |
| **Requires Confirmation** | Agent presents a summary and explicitly asks "Proceed?" before executing. | Creating projects, archiving projects, bulk task updates, creating change orders, creating payment installments. |
| **Prohibited** | Agent refuses and explains why. | Deleting projects, deleting financial records, modifying completed audit trails, accessing other companies' data. |

## **8.2 Permission Model**

Every tool call is validated against the user's role and project membership before execution. The permission model is enforced at the Guardrail Layer, not at the agent level, ensuring it cannot be bypassed through prompt manipulation. 

* **Role-Based Access Control (RBAC):** Each tool defines which roles can invoke it. The agent never presents options the user cannot execute.

* **Project Scoping:** Users can only access projects within their company. The agent never cross-references data between companies.

* **Data Isolation:** Multi-tenant architecture ensures complete data separation at the database level. Agent context is scoped to the active company.

Note: The agent can’t be accessed by the clients.

## **8.3 Audit Trail**

Every agent action is logged with the following metadata:

* Timestamp (UTC)

* User ID and role

* Project ID

* Tool name and parameters

* Result summary

* Original natural language request

* Agent reasoning chain (which tools were considered and why)

* Confirmation status (if applicable)

## **8.4 Cost Controls**

API usage is monitored and controlled at multiple levels:

* **Per-Request Token Limits:** Maximum context window and response size per interaction.

* **Per-User Rate Limits:** Maximum API calls per user per hour/day.

* **Per-Company Monthly Budget:** Configurable monthly API spend cap per company.

* **Tool Call Depth Limits:** Maximum number of tool calls per single user request (default: 15).

# **9\. Data Model & Integration Points**

The agent operates on Proesphere's existing database schema across two primary schemas: public (23 tables covering projects, tasks, users, and operations) and client\_portal (22 tables covering forums, payments, materials, and issues). The agent accesses data exclusively through the REST API layer, never directly querying the database. Moreover, it is important to notice that the tables below are just a guideline based on the platform’s architecture at a certain point. Double check with the current state of the database.

## **9.1 Core Data Entities**

## 

| Entity | Purpose | Key Fields |
| :---- | :---- | :---- |
| **projects** | Central hub entity | ID, name, address, client, status, budget, start/end dates, company\_id. Referenced by 30+ tables. |
| **stages** | Project phases | Linked to project. Contains name, order, start/end dates, material requirements flag. |
| **stage\_tasks** | Individual work items | Linked to stage. Name, assignee, completion status, due date, priority. |
| **materials** | Material items | Linked to stage. Category, specifications, quantity, cost, supplier, status lifecycle. |
| **issues** | Problems and blockers | Linked to project/stage. Type, severity, description, assignee, resolution status. |
| **installments** | Payment milestones | Linked to project. Amount, due date, status, associated stage/milestone. |
| **invoices** | Billing documents | Linked to installment. Line items, totals, payment status. |
| **daily\_logs** | Field reports | Linked to project. Date, author, content, photos, weather, crew count. |
| **communications** | Messages and updates | Linked to project. Type, sender, recipient, content, channel. |
| **users** | System users | Name, role, company, permissions, contact info. |
| **companies** | Contractor companies | Name, address, plan tier, settings. |
| **risk\_assessments** | Risk analysis records | Linked to project. Type, severity, likelihood, mitigation plan. |
| **forum\_threads** | Discussion topics | Linked to project. Title, author, status, category. |
| **forum\_messages** | Discussion replies | Linked to thread. Author, content, attachments. |
| **notifications** | System alerts | Linked to user. Type, content, read status, action URL. |
| **time\_entries** | Labor tracking | Linked to project/task. Worker, hours, date, activity type. |

## **9.2 External Integration Points**

The following external integrations are planned for future phases:

* **Calendar Sync:** Google Calendar and Outlook integration for milestone and deadline visibility.

* **Accounting:** QuickBooks and Xero integration for invoicing and payment reconciliation.

* **File Storage:** AWS S3 for photo and document storage with CDN delivery.

* **Weather API:** NOAA or OpenWeather integration for weather-aware scheduling.

* **SMS/Email:** Twilio and SendGrid for notification delivery outside the platform.

* **Mapping:** Google Maps API for job site proximity calculations and travel time estimates.


# **10\. API Design & Technical Specifications**

The sections below are just a guideline, make sure that it fits with the current structure of the application, make adjustments accordingly.

## **10.1 Agent API Endpoint**

The primary agent interaction flows through a single conversational endpoint:

**POST /api/v1/agent/chat**

Request body includes: conversation\_id, project\_id (optional), message text, and any file attachments. Response streams back as Server-Sent Events (SSE) for real-time display of the agent's thinking and tool execution.

## **10.2 Agent Backend Architecture**

The agent backend consists of the following components:

* **Conversation Manager:** Maintains conversation state, history, and context injection per user and project.

* **Tool Registry:** Centralized registry of all available tools with their schemas, permissions, and safety levels.

* **Orchestrator:** Manages the agentic loop: receives Open Router API responses, detects tool\_use stop reasons, executes tools, and loops until the agent produces a final text response.

* **Context Builder:** Dynamically assembles the system prompt and context window based on the user, project, and request type.

* **Guardrail Middleware:** Intercepts tool calls, validates permissions, enforces confirmation gates, and logs all actions.

* **Response Formatter:** Transforms agent output into appropriate frontend formats (markdown, structured data, chart data, file downloads).

## **10.3 Open Router API Integration**

**Model:** Gemini 1.5 flash for standard interactions. Gemini 1.5 pro- for complex analysis and report generation.

**Max Tokens:** 4096 for conversational responses. 8192 for report and document generation.

**Temperature:** 0.3 for factual operations (queries, calculations). 0.7 for creative outputs (client communications, report narratives).

**Streaming:** Enabled for all interactions. Frontend displays agent thinking in real-time.

## **10.4 Tool Schema Format**

Each tool is defined using the Anthropic tool use schema format. The following is a representative example:

**Tool: get\_project\_detail**

* **name:** get\_project\_detail

* **description:** Retrieve comprehensive project state including stages, tasks, materials, issues, payments, timeline, team members, and KPIs.

* **input\_schema.properties:** project\_id (string, required), include\_kpis (boolean, optional, default true), include\_financials (boolean, optional, default false)

* **permissions:** \[pm, Admin\]

* **safety\_level:** read\_only

# **11\. Client Portal Agent Capabilities: This section should not be implemented yet. Create the structure but not allow clients to use it yet.**

The client portal provides a separate, simplified agent experience for homeAdmins and property Admins. This agent has a restricted tool set and communicates exclusively in non-technical, reassuring language.

## **11.1 Client Agent Behavior Guidelines**

* **Language:** Always plain, non-technical language. Never expose internal project management terminology.

* **Tone:** Warm, professional, reassuring. Proactively address common anxiety triggers (timeline, cost, quality).

* **Scope:** Can only view their own project(s). Cannot see other clients' data or internal team communications.

* **Actions:** Can approve/reject pending decisions, ask questions, view progress photos, and review payment schedules.

* **Escalation:** If the client asks something the agent cannot answer, it should escalate to the PM with context rather than guessing.

## **11.2 Client-Available Tools**

| Tool | Description |
| :---- | :---- |
| **get\_my\_project\_status** | Show the client a simplified status overview: what just happened, what's happening now, and what's coming next. |
| **view\_progress\_photos** | Display recent job site photos organized by date and area. |
| **get\_my\_approvals** | List any pending decisions the client needs to make, with clear impact summaries. |
| **submit\_approval** | Record the client's approval or rejection with optional notes. |
| **ask\_question** | Submit a question that gets routed to the PM. Agent provides immediate acknowledgment and estimated response time. |
| **get\_my\_payment\_schedule** | Show the payment schedule with amounts, due dates, and what milestone triggers each payment. |
| **get\_my\_materials** | Show material selections and their status. Allow clients to view options requiring their selection. |

# **12\. Proactive & Autonomous Behaviors**

Beyond responding to user requests, the Agentic AI Engine should proactively surface insights, warnings, and recommendations. These behaviors run on scheduled triggers or event-driven conditions.

| Behavior | Trigger Condition | Action | Delivery |
| :---- | :---- | :---- | :---- |
| **Stall Detection** | Approval or task exceeds deadline by 24+ hours | Sends follow-up to the responsible party. Escalates after 48 hours. | PM notification, team notification |
| **Material Risk Alert** | Material needed within 14 days but not yet ordered | Alerts PM with the risk and suggests action. | PM notification |
| **Schedule Drift Warning** | Stage is falling behind based on task completion rate | Calculates projected completion date and flags variance. | PM dashboard alert |
| **Client Update Reminder** | No client communication in 7+ days | Suggests an update and offers to draft it. | PM notification |
| **Margin Erosion Alert** | Project margin drops below configurable threshold | Analyzes cost drivers and suggests corrective actions. | PM and Admin notification |
| **Daily Briefing Generation** | Every morning at configurable time | Automatically generates and queues the morning briefing. | PM push notification |
| **Approval Due Reminder** | Approval deadline approaching within 24 hours | Sends a reminder to the approver. | Approver notification |
| **Weather Impact Assessment** | Severe weather forecast for job site location | Assesses schedule impact and suggests rescheduling. | PM notification |

# **13\. Success Metrics & KPIs**

The following metrics will be tracked to measure the success of the Agentic AI Engine implementation:

## **13.1 Adoption Metrics**

| Metric | Target | Description |
| :---- | :---- | :---- |
| **Daily Active Users (DAU)** | 70% of licensed PMs | PMs and site leads using the agent daily. |
| **Outcome Requests per Project per Day** | 5+ | Number of natural language requests per active project. |
| **Percentage of Updates via Agent** | 80%+ | Daily logs, status updates, and communications created through the agent vs. manual entry. |
| **Time to First Value** | \< 5 minutes | Time from first login to first useful agent output. |
| **Feature Discovery Rate** | 60%+ | Percentage of available tools used within first 30 days. |

## **13.2 Impact Metrics**

| Metric | Target | Description |
| :---- | :---- | :---- |
| **Time to Produce Client Update** | 60% reduction | Baseline comparison: manual process vs. agent-generated. |
| **Time from Question to Decision** | 50% reduction | RFI and approval cycle time improvement. |
| **Stalled Item Aging** | 40% reduction | Average time items remain stalled before resolution. |
| **Client Status Pings** | 70% reduction | Number of inbound "what's the status?" inquiries from clients. |
| **Margin Protection** | Measurable | Projects using the agent maintain higher margins vs. baseline. |
| **Schedule Adherence** | 15% improvement | Percentage of stages completed within original date estimates. |

## 

## 

## **13.3 Quality Metrics**

| Metric | Target | Description |
| :---- | :---- | :---- |
| **Agent Accuracy Rate** | 90%+ | Percentage of agent responses that require no correction. |
| **Tool Call Success Rate** | 99%+ | Percentage of tool calls that execute without errors. |
| **User Satisfaction (CSAT)** | 4.5/5 | Post-interaction satisfaction ratings. |
| **Hallucination Rate** | \< 1% | Percentage of responses containing fabricated information. |
| **Latency (P95)** | \< 5 seconds | End-to-end response time for 95th percentile of requests. |

Note: all the metrics must be stored in the database and visualized only by the ROOT user

# **14\. Implementation Phases & Roadmap**

## **14.1 Phase 1: Foundation (Weeks 1-4)**

**Objective:** Establish the core agentic loop and prove the natural language interface works for construction project management.

**Deliverables:**

* Agent API endpoint with SSE streaming

* Open API integration with construction-tuned system prompt

* 5 core read-only tools: get\_projects, get\_project\_detail, get\_stages, get\_tasks, get\_materials

* Conversation history management (per user, per project)

* Basic context injection (user role, active project state)

* Frontend chat interface with streaming response display

* Permission validation middleware

## **14.2 Phase 2: Write Operations (Weeks 5-8)**

**Objective:** Enable the agent to create and modify project data with appropriate guardrails.

**Deliverables:**

* Write tools: create\_task, complete\_task, create\_daily\_log, update\_material\_status, create\_stage

* Confirmation gate system for destructive operations

* Audit trail logging for all write operations

* Daily log ingestion pipeline (photo \+ voice-to-text processing)

* Basic agentic workflows: daily log creation, task management

## **14.3 Phase 3: Multi-Step Workflows (Weeks 9-12)**

**Objective:** Implement complex agentic workflows that chain multiple tools together.

**Deliverables:**

* Morning briefing workflow

* Client update generation workflow

* RFI-to-decision workflow

* Schedule generation from natural language

* Materials list auto-generation

* Change order impact assessment

## **14.4 Phase 4: Proactive Intelligence (Weeks 13-16)**

**Objective:** Transform the agent from reactive to proactive, surfacing insights and preventing problems.

**Deliverables:**

* Stall detection and auto-escalation

* Material risk alerting

* Schedule drift warnings

* Client update reminders

* Margin erosion alerts

* KPI dashboard and reporting

* Background job scheduling system

## **14.5 Phase 5: Client Portal & Polish (Weeks 17-20)**

**Objective:** Launch the client-facing agent and refine the overall experience.

**Deliverables:**

* Client portal agent with restricted tool set

* Client approval workflow

* Document template filling

* PDF report generation

* Voice notification summaries

* Performance optimization and cost control tuning

* Comprehensive evaluation harness and regression testing

# **15\. Risks & Mitigations**

| Risk | Severity | Mitigation Strategy |
| :---- | :---- | :---- |
| **Agent Hallucination** | **High** | Construction projects require factual accuracy. Mitigate with: tool-grounded responses (agent must cite data source), cross-validation of generated outputs against database records, and human review gates for all client-facing content. |
| **Prompt Injection** | **Medium** | Users could manipulate the agent to bypass permissions. Mitigate with: server-side permission enforcement (not prompt-level), input sanitization, and guardrail middleware that validates every tool call independently of the agent's reasoning. |
| **API Cost Overrun** | **Medium** | Complex agentic workflows can consume significant tokens. Mitigate with: per-request token limits, tool call depth limits, caching of frequently requested data, and monitoring dashboards for cost tracking. |
| **Latency / User Experience** | **Medium** | Multi-step workflows may take 10-30 seconds. Mitigate with: streaming responses showing agent progress, parallel tool execution where possible, context caching, and pre-computation of common queries. |
| **Data Accuracy Drift** | **Medium** | The agent relies on data being current. If field updates are delayed, agent outputs will be stale. Mitigate with: timestamp display on all data, "last updated" indicators, and prompts encouraging daily log capture. |
| **User Trust / Adoption** | **High** | Construction professionals may be skeptical of AI. Mitigate with: always showing source data behind claims, allowing easy correction, building trust through consistent accuracy in pilot, and gradual capability rollout. |
| **Multi-Tenant Data Leakage** | **Critical** | Agent must never expose one company's data to another. Mitigate with: database-level row security, company-scoped API keys, agent context isolation, and regular security audits. |

# **16\. Appendix: Example Conversations**

The following conversations illustrate the expected agent behavior across different personas and complexity levels.

## **16.1 Simple Status Query (PM)**

**PM:** How's the Henderson kitchen going?

**Agent:** The Henderson kitchen is in the Framing stage, 60% complete. 4 of 7 tasks are done. Two items need attention: the window delivery is delayed by 3 days (expected Thursday), and the electrician needs to schedule rough-in before insulation can start. No pending approvals. Budget is tracking at 92% of estimate. Would you like me to notify the electrician about scheduling?

*Tools Used:* search\_projects, get\_project\_detail, get\_stages, get\_tasks, check\_material\_risks, get\_pending\_approvals, get\_margin\_analysis

*Tool Calls:* 7 (executed in \~3 seconds)

## **16.2 Complex Multi-Step Request (PM)**

**PM:** Client wants to upgrade to quartz counters on the Oak Street project. What does that look like?

**Agent:** I've analyzed the impact of upgrading to quartz countertops on Oak Street:

* **Cost Impact:** \+$3,200 (from $4,800 granite to $8,000 quartz). Current margin is 18.5%, this would reduce it to 15.2%.

* **Timeline Impact:** Quartz has a 3-week lead time vs. 2 weeks for the granite already ordered. This would push the countertop installation from March 15 to March 22, which cascades into a 5-day delay on the final stage.

* **Material Status:** The granite is currently in 'ordered' status. We'd need to cancel that order.

*I can draft a change order with these details for client approval. Should I proceed?*

*Tools Used:* search\_projects, get\_materials, get\_margin\_analysis, get\_project\_timeline, check\_material\_risks

*Tool Calls:* 5 (executed in \~4 seconds)

## **16.3 Client Portal Interaction**

**Client:** When will my kitchen be usable again?

**Agent:** Great news \- your kitchen renovation is progressing well\! Here's the current timeline:

* Cabinets are being installed this week (expected to finish by Friday)

* Countertops are scheduled for installation the week of March 15

* After countertops, the plumber will reconnect the sink (about 2 days)

* Final touches (backsplash and hardware) will take about a week

You should be able to start using your kitchen around the last week of March. I'll keep you updated if anything changes\!

*Tools Used:* get\_my\_project\_status, get\_project\_timeline

## **16.4 Morning Briefing (Proactive)**

**Agent (7:00 AM):** Good morning\! Here's your briefing for today:

**URGENT**

* Oak Street: Tile delivery was marked damaged yesterday. Supplier offering replacement shipment in 5 days. This will push tiling by one week unless we source locally.

* Riverside: Client approval for the bathroom vanity has been pending for 3 days. I've sent a follow-up.

**TODAY'S PRIORITIES**

* Henderson: Insulation inspection scheduled at 2 PM. Electrician rough-in must be verified before inspector arrives.

* Oak Street: Framing crew finishing north wall. Site lead reported 85% completion yesterday.

**UPCOMING**

* 3 client updates are due this week (Henderson, Oak Street, Riverside)

* 2 installment payments are due within 10 days

*Would you like me to draft the client updates or source local tile options for Oak Street?*

End of Document
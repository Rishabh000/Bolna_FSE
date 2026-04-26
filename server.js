const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const BOLNA_AGENT_URL = process.env.BOLNA_AGENT_URL || "";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY || "";
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID || "a707a917-3bae-4bd1-a710-70bd0e131af6";
const BOLNA_FROM_PHONE_NUMBER = process.env.BOLNA_FROM_PHONE_NUMBER || "";
const WEBHOOK_WHITELIST_IP = "13.203.39.153";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const routingMap = {
  "Password Reset": "Identity Support",
  VPN: "Network Support",
  Email: "Messaging Support",
  Hardware: "Desktop Support",
  Software: "Application Support",
  Network: "Network Support",
  "Access Request": "Identity Support",
  Other: "General IT Queue",
};

const state = {
  lastEvent: null,
  latestTicket: null,
  latestCall: null,
  ticketRegistry: new Map(),
};

function buildTicketId() {
  return `IT-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeSeverity(issueType, workBlocked, providedSeverity) {
  if (providedSeverity) return providedSeverity;

  const blocked = String(workBlocked || "").toLowerCase();
  if (blocked.includes("fully") || blocked.includes("complete") || blocked === "yes") {
    return issueType === "VPN" || issueType === "Network" ? "Critical" : "High";
  }

  if (blocked.includes("partial")) {
    return "Medium";
  }

  return "Low";
}

function getWebhookUrl(req) {
  if (PUBLIC_BASE_URL) {
    return `${PUBLIC_BASE_URL}/api/bolna/webhook`;
  }

  return `${req.protocol}://${req.get("host")}/api/bolna/webhook`;
}

async function startBolnaCall({
  recipientPhoneNumber,
  employeeName,
  department,
  contact,
}) {
  const payload = {
    agent_id: BOLNA_AGENT_ID,
    recipient_phone_number: recipientPhoneNumber,
    user_data: {
      employee_name: employeeName || "",
      department: department || "",
      contact: contact || recipientPhoneNumber,
    },
  };

  if (BOLNA_FROM_PHONE_NUMBER) {
    payload.from_phone_number = BOLNA_FROM_PHONE_NUMBER;
  }

  const response = await fetch("https://api.bolna.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOLNA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      data?.message || data?.error || "Bolna call request failed";
    throw new Error(errorMessage);
  }

  return data;
}

function getByPath(source, pathExpression) {
  return pathExpression.split(".").reduce((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return value[key];
    }

    return undefined;
  }, source);
}

function pickFirst(source, candidates) {
  for (const candidate of candidates) {
    const value = getByPath(source, candidate);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function collectTicketFields(payload) {
  return {
    employee_name: pickFirst(payload, [
      "employee_name",
      "employeeName",
      "data.employee_name",
      "data.employeeName",
      "payload.employee_name",
      "payload.employeeName",
      "execution_data.employee_name",
      "execution_data.employeeName",
      "variables.employee_name",
      "variables.employeeName",
      "collected_data.employee_name",
      "collected_data.employeeName",
      "extracted_variables.employee_name",
      "extracted_variables.employeeName",
      "ticket.employee_name",
      "ticket.employeeName",
    ]),
    department: pickFirst(payload, [
      "department",
      "data.department",
      "payload.department",
      "execution_data.department",
      "variables.department",
      "collected_data.department",
      "extracted_variables.department",
      "ticket.department",
    ]),
    contact: pickFirst(payload, [
      "contact",
      "contact_detail",
      "contactDetail",
      "data.contact",
      "data.contact_detail",
      "payload.contact",
      "execution_data.contact",
      "variables.contact",
      "collected_data.contact",
      "extracted_variables.contact",
      "ticket.contact",
      "ticket.contact_detail",
    ]),
    issue_summary: pickFirst(payload, [
      "issue_summary",
      "issueSummary",
      "summary",
      "data.issue_summary",
      "payload.issue_summary",
      "execution_data.issue_summary",
      "variables.issue_summary",
      "collected_data.issue_summary",
      "extracted_variables.issue_summary",
      "ticket.issue_summary",
      "ticket.issueSummary",
    ]),
    issue_type: pickFirst(payload, [
      "issue_type",
      "issueType",
      "category",
      "data.issue_type",
      "payload.issue_type",
      "execution_data.issue_type",
      "variables.issue_type",
      "collected_data.issue_type",
      "extracted_variables.issue_type",
      "ticket.issue_type",
      "ticket.issueType",
    ]) || "Other",
    affected_system: pickFirst(payload, [
      "affected_system",
      "affectedSystem",
      "device",
      "data.affected_system",
      "payload.affected_system",
      "execution_data.affected_system",
      "variables.affected_system",
      "collected_data.affected_system",
      "extracted_variables.affected_system",
      "ticket.affected_system",
      "ticket.affectedSystem",
    ]),
    issue_start_time: pickFirst(payload, [
      "issue_start_time",
      "issueStartTime",
      "started_at",
      "data.issue_start_time",
      "payload.issue_start_time",
      "execution_data.issue_start_time",
      "variables.issue_start_time",
      "collected_data.issue_start_time",
      "extracted_variables.issue_start_time",
      "ticket.issue_start_time",
      "ticket.issueStartTime",
    ]),
    work_blocked: pickFirst(payload, [
      "work_blocked",
      "workBlocked",
      "blocked",
      "data.work_blocked",
      "payload.work_blocked",
      "execution_data.work_blocked",
      "variables.work_blocked",
      "collected_data.work_blocked",
      "extracted_variables.work_blocked",
      "ticket.work_blocked",
      "ticket.workBlocked",
    ]),
    troubleshooting_done: pickFirst(payload, [
      "troubleshooting_done",
      "troubleshootingDone",
      "troubleshooting",
      "data.troubleshooting_done",
      "payload.troubleshooting_done",
      "execution_data.troubleshooting_done",
      "variables.troubleshooting_done",
      "collected_data.troubleshooting_done",
      "extracted_variables.troubleshooting_done",
      "ticket.troubleshooting_done",
      "ticket.troubleshootingDone",
    ]),
    severity: pickFirst(payload, [
      "severity",
      "priority",
      "data.severity",
      "payload.severity",
      "execution_data.severity",
      "variables.severity",
      "collected_data.severity",
      "extracted_variables.severity",
      "ticket.severity",
    ]),
  };
}

function getConversationKey(payload) {
  return pickFirst(payload, [
    "call_id",
    "callId",
    "conversation_id",
    "conversationId",
    "execution_id",
    "executionId",
    "data.call_id",
    "data.conversation_id",
    "payload.call_id",
    "payload.conversation_id",
  ]);
}

function buildTicketFromPayload(payload, existingTicket) {
  const ticket = collectTicketFields(payload);
  if (!ticket.issue_summary) {
    return null;
  }

  const normalizedSeverity = normalizeSeverity(
    ticket.issue_type,
    ticket.work_blocked,
    ticket.severity
  );

  return {
    ticket_id: existingTicket?.ticket_id || buildTicketId(),
    status: "Created",
    priority: normalizedSeverity,
    assigned_team: routingMap[ticket.issue_type] || routingMap.Other,
    created_at: existingTicket?.created_at || new Date().toISOString(),
    ticket: {
      ...ticket,
      severity: normalizedSeverity,
    },
  };
}

app.get("/api/agent/config", (req, res) => {
  res.json({
    launchUrl: BOLNA_AGENT_URL,
    launchConfigured: Boolean(BOLNA_AGENT_URL),
    apiCallConfigured: Boolean(BOLNA_API_KEY && BOLNA_AGENT_ID),
    bolnaAgentId: BOLNA_AGENT_ID,
    webhookUrl: getWebhookUrl(req),
    webhookWhitelistIp: WEBHOOK_WHITELIST_IP,
    latestEvent: state.lastEvent,
    latestTicket: state.latestTicket,
    latestCall: state.latestCall,
  });
});

app.post("/api/agent/session", (req, res) => {
  res.json({
    success: true,
    launchUrl: BOLNA_AGENT_URL,
    webhookUrl: getWebhookUrl(req),
    webhookWhitelistIp: WEBHOOK_WHITELIST_IP,
    message: BOLNA_AGENT_URL
      ? "Bolna agent launch URL is configured. Open the agent and use the webhook below in the Bolna dashboard."
      : "No direct launch URL is configured. Use your Bolna dashboard to start the agent, and keep the webhook URL below in the agent settings.",
  });
});

app.post("/api/bolna/call", async (req, res) => {
  const { recipient_phone_number, employee_name, department, contact } = req.body || {};

  if (!recipient_phone_number) {
    return res.status(400).json({
      success: false,
      error: "recipient_phone_number is required",
    });
  }

  if (!BOLNA_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "BOLNA_API_KEY is not configured on the server",
    });
  }

  try {
    const callResponse = await startBolnaCall({
      recipientPhoneNumber: recipient_phone_number,
      employeeName: employee_name,
      department,
      contact,
    });

    state.latestCall = {
      requested_at: new Date().toISOString(),
      recipient_phone_number,
      employee_name: employee_name || "",
      execution_id: callResponse.execution_id || null,
      status: callResponse.status || "queued",
      provider_message: callResponse.message || "Call initiated",
    };

    return res.json({
      success: true,
      message: "Bolna call initiated successfully",
      agent_id: BOLNA_AGENT_ID,
      ...state.latestCall,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/bolna/webhook", (req, res) => {
  const payload = req.body || {};
  const status = pickFirst(payload, ["status", "event", "call_status", "data.status"]) || "received";
  const conversationKey = getConversationKey(payload);
  const existingTicket = conversationKey ? state.ticketRegistry.get(conversationKey) : null;
  const candidateTicket = buildTicketFromPayload(payload, existingTicket);

  state.lastEvent = {
    status,
    received_at: new Date().toISOString(),
    ticket_created: Boolean(candidateTicket),
    conversation_key: conversationKey || null,
  };

  if (candidateTicket) {
    state.latestTicket = candidateTicket;
    if (conversationKey) {
      state.ticketRegistry.set(conversationKey, candidateTicket);
    }
  }

  res.json({
    success: true,
    received: true,
    ticket_created: Boolean(candidateTicket),
    ticket_id: candidateTicket ? candidateTicket.ticket_id : null,
  });
});

app.get("/api/tickets/latest", (_req, res) => {
  if (!state.latestTicket) {
    return res.status(404).json({
      success: false,
      error: "No ticket received from Bolna yet",
      latestEvent: state.lastEvent,
    });
  }

  return res.json({
    success: true,
    latestEvent: state.lastEvent,
    ...state.latestTicket,
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`IT helpdesk voice app running on http://${HOST}:${PORT}`);
});

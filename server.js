const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());
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

function buildTicketId() {
  return `IT-${Math.floor(1000 + Math.random() * 9000)}`;
}

app.post("/api/agent/session", (req, res) => {
  const bolnaAgentId = process.env.BOLNA_AGENT_ID || "demo-agent";

  res.json({
    success: true,
    message: "Session initialized. Replace this mock response with your real Bolna session API call.",
    bolnaAgentId,
    launchMode: "mock",
    nextStep:
      "Connect this route to the Bolna session creation endpoint and return the real call/session details here.",
  });
});

app.post("/api/create-ticket", (req, res) => {
  const {
    employee_name,
    department,
    contact,
    issue_summary,
    issue_type,
    affected_system,
    issue_start_time,
    work_blocked,
    troubleshooting_done,
    severity,
  } = req.body;

  if (!employee_name || !issue_summary || !issue_type) {
    return res.status(400).json({
      success: false,
      error: "employee_name, issue_summary, and issue_type are required",
    });
  }

  const normalizedSeverity = normalizeSeverity(issue_type, work_blocked, severity);
  const assignedTeam = routingMap[issue_type] || routingMap.Other;

  return res.json({
    success: true,
    ticket_id: buildTicketId(),
    status: "Created",
    priority: normalizedSeverity,
    assigned_team: assignedTeam,
    created_at: new Date().toISOString(),
    ticket: {
      employee_name,
      department,
      contact,
      issue_summary,
      issue_type,
      affected_system,
      issue_start_time,
      work_blocked,
      troubleshooting_done,
      severity: normalizedSeverity,
    },
  });
});

app.get("/api/demo-ticket", (_req, res) => {
  res.json({
    employee_name: "Riya Sharma",
    department: "Finance",
    contact: "riya@company.com",
    issue_summary: "Unable to connect to company VPN since morning.",
    issue_type: "VPN",
    affected_system: "Windows laptop",
    issue_start_time: "Today at 9:00 AM",
    work_blocked: "Fully blocked",
    troubleshooting_done: "Restarted laptop and retried VPN login",
    severity: "High",
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`IT helpdesk voice app running on http://${HOST}:${PORT}`);
});

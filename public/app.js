const startAgentBtn = document.getElementById("start-agent-btn");
const refreshTicketBtn = document.getElementById("refresh-ticket-btn");
const agentStatus = document.getElementById("agent-status");
const ticketCard = document.getElementById("ticket-card");
const ticketEmpty = document.getElementById("ticket-empty");
const webhookUrlEl = document.getElementById("webhook-url");
const whitelistIpEl = document.getElementById("whitelist-ip");
const launchStateEl = document.getElementById("launch-state");

let agentConfig = null;

function populateTicket(ticketResponse) {
  const { ticket_id, status, priority, assigned_team, ticket } = ticketResponse;

  ticketEmpty.classList.add("hidden");
  ticketCard.classList.remove("hidden");

  document.getElementById("ticket-id").textContent = ticket_id;
  document.getElementById("ticket-status").textContent = status;
  document.getElementById("ticket-priority").textContent = priority;
  document.getElementById("assigned-team").textContent = assigned_team;
  document.getElementById("employee-name").textContent = ticket.employee_name || "-";
  document.getElementById("department").textContent = ticket.department || "-";
  document.getElementById("issue-type").textContent = ticket.issue_type || "-";
  document.getElementById("affected-system").textContent = ticket.affected_system || "-";
  document.getElementById("issue-summary").textContent = ticket.issue_summary || "-";
  document.getElementById("troubleshooting").textContent =
    ticket.troubleshooting_done || "No troubleshooting steps provided.";
}

function renderEmptyState(message) {
  ticketCard.classList.add("hidden");
  ticketEmpty.classList.remove("hidden");
  ticketEmpty.textContent = message;
}

async function loadAgentConfig() {
  try {
    const response = await fetch("/api/agent/config");
    const data = await response.json();

    agentConfig = data;
    webhookUrlEl.textContent = data.webhookUrl;
    whitelistIpEl.textContent = data.webhookWhitelistIp;
    launchStateEl.textContent = data.launchConfigured
      ? "Bolna launch URL configured"
      : "Bolna launch URL not configured yet";

    if (data.latestTicket) {
      populateTicket(data.latestTicket);
      agentStatus.textContent = "Latest Bolna ticket received and displayed below.";
    }
  } catch (error) {
    agentStatus.textContent =
      "Unable to load Bolna configuration. Check your backend and refresh the page.";
  }
}

async function createAgentSession() {
  agentStatus.textContent = "Checking Bolna agent launch configuration...";

  try {
    const response = await fetch("/api/agent/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "web-app" }),
    });

    const data = await response.json();
    await loadAgentConfig();

    if (data.launchUrl) {
      window.open(data.launchUrl, "_blank", "noopener,noreferrer");
      agentStatus.textContent =
        "Bolna agent opened in a new tab. After the call finishes, this app will show the latest webhook ticket.";
      return;
    }

    agentStatus.textContent = `${data.message} Webhook URL is shown on this page for your Bolna agent setup.`;
  } catch (error) {
    agentStatus.textContent =
      "Unable to initialize the Bolna agent right now. Please check your environment variables and backend.";
  }
}

async function refreshLatestTicket() {
  try {
    const response = await fetch("/api/tickets/latest", { cache: "no-store" });

    if (!response.ok) {
      renderEmptyState(
        "Waiting for a real Bolna webhook event. Complete a call in Bolna and this ticket panel will update."
      );
      return;
    }

    const latestTicket = await response.json();
    populateTicket(latestTicket);
    agentStatus.textContent = "Latest ticket pulled from the Bolna webhook successfully.";
  } catch (error) {
    agentStatus.textContent =
      "Unable to refresh the latest ticket. Please verify your deployed webhook is reachable.";
  }
}

startAgentBtn.addEventListener("click", createAgentSession);
refreshTicketBtn.addEventListener("click", refreshLatestTicket);

loadAgentConfig().then(refreshLatestTicket);
window.setInterval(refreshLatestTicket, 8000);

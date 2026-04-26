const startAgentBtn = document.getElementById("start-agent-btn");
const loadDemoBtn = document.getElementById("load-demo-btn");
const agentStatus = document.getElementById("agent-status");
const ticketCard = document.getElementById("ticket-card");
const ticketEmpty = document.getElementById("ticket-empty");

async function createAgentSession() {
  agentStatus.textContent = "Initializing Bolna session...";

  try {
    const response = await fetch("/api/agent/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "web-app",
      }),
    });

    const data = await response.json();

    agentStatus.textContent = `${data.message} Agent ID: ${data.bolnaAgentId}.`;
  } catch (error) {
    agentStatus.textContent =
      "Unable to initialize the Bolna session right now. Please check your backend integration.";
  }
}

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

async function runDemoTicketFlow() {
  agentStatus.textContent =
    "Running demo flow: simulated Bolna agent data is being sent to the helpdesk webhook.";

  try {
    const demoResponse = await fetch("/api/demo-ticket");
    const demoTicket = await demoResponse.json();

    const ticketResponse = await fetch("/api/create-ticket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(demoTicket),
    });

    const createdTicket = await ticketResponse.json();
    populateTicket(createdTicket);

    agentStatus.textContent =
      "Demo completed. In the live version, your Bolna agent will send this same payload after the voice conversation.";
  } catch (error) {
    agentStatus.textContent =
      "Demo flow failed. Please check the backend routes and try again.";
  }
}

startAgentBtn.addEventListener("click", createAgentSession);
loadDemoBtn.addEventListener("click", runDemoTicketFlow);

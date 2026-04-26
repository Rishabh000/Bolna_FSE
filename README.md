# IT Helpdesk Voice Agent Web App

This project is a lightweight web app for an enterprise IT helpdesk voice agent assignment. It is designed to demonstrate the full workflow:

User -> Web App -> Bolna Agent -> Backend Logic -> Ticket Output

## What the app includes

- A landing page for launching the voice support flow
- A mock `Bolna session` API route
- A `create-ticket` webhook endpoint
- Simple routing logic for priority and team assignment
- A demo button that simulates the full end-to-end flow

## Project structure

```text
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── package.json
├── README.md
└── server.js
```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Bolna integration

Right now, `POST /api/agent/session` returns a mock response. To make this production-ready for your demo:

1. Replace the mock response in `server.js`
2. Call the real Bolna session or conversation start API
3. Return the call/session details your frontend needs
4. Configure Bolna to send the collected ticket data to `POST /api/create-ticket`

## Webhook payload expected from Bolna

```json
{
  "employee_name": "Riya Sharma",
  "department": "Finance",
  "contact": "riya@company.com",
  "issue_summary": "Unable to connect to company VPN since morning",
  "issue_type": "VPN",
  "affected_system": "Windows laptop",
  "issue_start_time": "Today at 9:00 AM",
  "work_blocked": "Fully blocked",
  "troubleshooting_done": "Restarted laptop and retried VPN login",
  "severity": "High"
}
```

## Suggested demo script

1. Open the app
2. Explain that the employee clicks `Start Voice Support`
3. Show that the Bolna agent collects issue details by voice
4. Trigger the webhook with the structured data
5. Display the created ticket on the dashboard

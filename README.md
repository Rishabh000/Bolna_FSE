# IT Helpdesk Voice Agent Web App

This project is a webhook-driven web app for an enterprise IT helpdesk voice agent built around Bolna.

It demonstrates the full workflow:

User -> Web App -> Backend -> Bolna Agent -> Webhook -> Backend Logic -> Ticket Output

## What the app does

- Starts a real outbound Bolna voice call from the web app
- Shows the webhook URL that must be configured inside your Bolna agent
- Displays the Bolna webhook IP that should be whitelisted on your server
- Opens your Bolna agent launch URL from the app when configured
- Receives real execution data from Bolna at `POST /api/bolna/webhook`
- Converts the webhook payload into a routed IT support ticket
- Displays the latest ticket in the dashboard

## Project structure

```text
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── server.js
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000`

## Environment variables

- `HOST`: local bind host for Express
- `PORT`: local port for Express
- `PUBLIC_BASE_URL`: your deployed public domain so the UI shows the correct webhook URL
- `BOLNA_API_KEY`: API key from the Bolna Developers section
- `BOLNA_AGENT_ID`: the Bolna agent ID to invoke from code
- `BOLNA_FROM_PHONE_NUMBER`: optional caller number if your Bolna account requires it

## Bolna setup

1. Open your agent in Bolna.
2. In the **Push all execution data to webhook** section, paste the webhook URL shown in this app.
3. Save the agent.
4. Whitelist this IP on your server: `13.203.39.153`
5. Add your Bolna API key locally as `BOLNA_API_KEY`.
6. Start a support call from the web app by entering a phone number.
7. Let the call complete, then refresh the app and view the latest created ticket.

## Webhook endpoint

The backend receives Bolna updates at:

`POST /api/bolna/webhook`

The app tries to extract ticket fields from common payload shapes such as:

- top-level fields
- `data.*`
- `payload.*`
- `execution_data.*`
- `variables.*`
- `collected_data.*`
- `extracted_variables.*`
- `ticket.*`

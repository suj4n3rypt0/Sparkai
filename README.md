# StudySpark — AI Study Assistant

A responsive, dark-themed study assistant made with beginner-friendly HTML, CSS, JavaScript, and a Node.js/Express backend. It connects to the OpenAI API; the API key stays on the server.

## Features

- Chat interface with a responsive sidebar
- Five study modes: topic explanation, exam preparation, quiz practice, note summarization, and coding help
- Quick-start prompt cards, typing indicator, copy response, and new-chat control
- Chat history stored in the current browser using `localStorage`
- Dark/light theme toggle
- Backend input validation, request-size limit, rate limiting, and security headers
- Friendly API error messages

## Requirements

- Node.js 18 or newer (Node.js 20 LTS is recommended)
- An OpenAI API key with API access and available billing/credits
- Internet connection for AI requests

## Run locally

1. Extract the project folder and open it in a terminal.
2. Install packages:

   ```bash
   npm install
   ```

3. Copy `.env.example` to a new file named `.env` in the project root.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`

4. Open `.env` and replace `your_api_key_here` with your actual API key. Keep this file private. Do not paste the key into `public/app.js`, HTML, or CSS, and do not upload `.env` to GitHub.
5. Start the server:

   ```bash
   npm start
   ```

6. Open **http://localhost:3000** in your browser. Do not open `index.html` directly from your file manager, because the backend API needs the local server.

To stop the server, press `Ctrl + C` in the terminal.

## Change the model

The default model is configured by `OPENAI_MODEL` in `.env` (`gpt-4.1-mini`). Change it to a model available to your API account if needed, then restart the server.

## Project structure

```text
study-spark-ai/
├── public/
│   ├── index.html   # Page structure
│   ├── style.css    # Dark theme, responsive layout, light theme
│   └── app.js       # Chat interface and browser-side logic
├── .env.example     # Environment variable template (no secret key)
├── .gitignore       # Excludes .env and node_modules
├── package.json     # Dependencies and run commands
├── server.js        # Express backend and AI API call
└── README.md        # Setup guide
```

## Troubleshooting

- **“AI is not configured yet”**: ensure `.env` exists in the project root and contains `OPENAI_API_KEY=...`, then restart `npm start`.
- **401 / key rejected**: verify the key and make sure it has not been revoked.
- **429 / quota unavailable**: check API billing, limits, and rate limits for your account.
- **Could not reach the server**: keep the terminal running and visit `http://localhost:3000`.
- **Model not found or unavailable**: set `OPENAI_MODEL` to a model your API account can use.

## Security notes for a class project

The browser never receives the API key. The backend validates message roles and lengths, limits JSON body size, applies a basic per-IP request limit, and uses Helmet security headers. This is a classroom starter, not a production multi-user service: before public deployment, add authentication, stronger abuse controls, privacy disclosures, monitoring, and suitable hosting secrets management. Chat history is stored locally in the browser and is not synced between devices.

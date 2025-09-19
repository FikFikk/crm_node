# WhatsApp CRM Service (crm-wa)

Node.js/TypeScript WhatsApp gateway using Baileys, Express, and Socket.IO for CRM integration.

## Features

- WhatsApp multi-company connection (auto-reconnect)
- Send/receive WhatsApp messages via API
- QR code login per company
- Real-time status via Socket.IO
- Clean logging and .env configuration

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
   The API runs at [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env` file in the root with at least:

```
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=your_auth_secret_here
BETTER_AUTH_URL=http://localhost:3000
PHP_KEY=your_php_backend_key
```

**Variable explanations:**

- `PORT`: Port for the WhatsApp API server.
- `ALLOWED_ORIGINS` / `CORS_ORIGIN`: Allowed origins for CORS (frontend or CRM backend URLs).
- `BETTER_AUTH_SECRET`: Secret key for authenticating with the Better-T-Stack auth service. You get this from your authentication provider or set it in your auth service config. Make sure it matches the backend's expected secret.
- `BETTER_AUTH_URL`: URL of the authentication service (usually your backend or SSO server).
- `PHP_KEY`: API key/token provided by the PHP CRM backend. This is used for secure communication between the WhatsApp service and the backend. Obtain this from your backend admin or environment config.

Add other Baileys/CRM config as needed.

## Project Structure

```
crm-wa/
├── apps/
│   └── server/      # Backend API (Express)
```

## API Endpoints

All endpoints are prefixed with `/` and expect JSON. Example header: `Content-Type: application/json`

### 1. Generate QR Code

- **GET** `/qr-code?id=COMPANY_ID`
- **Query:** `id` (string, required)
- **Response:**
  - If already connected: `{ success, message, status, phone_number }`
  - If QR ready: `{ success, message, qr_code, status }`
  - If connecting: `{ success, message, status }`

### 2. Send WhatsApp Message

- **POST** `/send-message`
- **Body:**
  ```json
  {
    "company_id": "string",
    "to": "628xxxxxxx",
    "message": "Hello!"
  }
  ```
- **Response:** `{ success, message, message_id, status }`

### 3. Get Connection Status

- **GET** `/status/:companyId`
- **Response:** `{ success, ...connectionInfo }`

### 4. Disconnect WhatsApp

- **POST** `/disconnect/:companyId`
- **Response:** `{ success, message }`

### 5. Health Check

- **GET** `/test`
- **Response:** `{ success, message, timestamp, active_connections }`

## Example Usage

**Send Message Example:**

```bash
curl -X POST http://localhost:3000/send-message \
	-H "Content-Type: application/json" \
	-d '{"company_id":"2","to":"628xxxxxxx","message":"Hello!"}'
```

**Get QR Code Example:**

```bash
curl "http://localhost:3000/qr-code?id=2"
```

## Scripts

- `npm run dev` — Start all apps in dev mode
- `npm run build` — Build all apps
- `npm run dev:server` — Start only the server
- `npm run check-types` — TypeScript check

import express from 'express';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const app = express();
app.use(express.json());

// Store untuk menyimpan socket connections per company
const connections = new Map<string, WASocket>();
const qrCodes = new Map<string, string>();

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Main WhatsApp API endpoint (keberlanjutan dari versi lama)
app.post('/api/whatsapp', async (req, res) => {
  try {
    const { action } = req.body as { action?: string };

    switch (action) {
      case 'get-qr':
        return await handleGetQR(req, res);
      case 'send':
        return await handleSendMessage(req, res);
      case 'status':
        return await handleGetStatus(req, res);
      case 'disconnect':
        return await handleDisconnect(req, res);
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    res.status(500).json({ success: false, message: error?.message ?? String(error) });
  }
});

// Handle QR generation
async function handleGetQR(req: express.Request, res: express.Response) {
  const { company_id } = req.body as { company_id?: string };

  if (!company_id) {
    return res.status(400).json({ success: false, message: 'Company ID is required' });
  }

  try {
    // Jika sudah connected, return status
    const conn = connections.get(company_id);
    if (conn && (conn as any).user) {
      return res.json({ success: true, status: 'connected', phone_number: String((conn as any).user.id).split(':')[0], message: 'Already connected' });
    }

    // Jika ada QR code yang masih aktif, return QR tersebut
    if (qrCodes.has(company_id)) {
      return res.json({ success: true, status: 'connecting', qr_code: qrCodes.get(company_id), message: 'QR code generated' });
    }

    // Create new connection
    await createWhatsAppConnection(company_id);

    // Wait untuk QR code (timeout 30 detik)
    let attempts = 0;
    const maxAttempts = 30;
    while (!qrCodes.has(company_id) && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }

    if (qrCodes.has(company_id)) {
      return res.json({ success: true, status: 'connecting', qr_code: qrCodes.get(company_id), message: 'QR code generated' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
  } catch (error: any) {
    console.error('QR Generation Error:', error);
    res.status(500).json({ success: false, message: error?.message ?? String(error) });
  }
}

// Handle send message
async function handleSendMessage(req: express.Request, res: express.Response) {
  const { company_id, phone, message } = req.body as { company_id?: string; phone?: string; message?: string };

  if (!company_id || !phone || !message) {
    return res.status(400).json({ success: false, message: 'company_id, phone, and message are required' });
  }

  const connection = connections.get(company_id);
  if (!connection || !(connection as any).user) {
    return res.status(400).json({ success: false, message: 'WhatsApp not connected for this company' });
  }

  try {
    const jid = `${phone}@s.whatsapp.net`;
    const result = await (connection as any).sendMessage(jid, { text: message });

    res.json({ success: true, message_id: result.key?.id, status: 'sent', message: 'Message sent successfully' });
  } catch (error: any) {
    console.error('Send Message Error:', error);
    res.status(500).json({ success: false, message: error?.message ?? String(error) });
  }
}

// Handle get status
async function handleGetStatus(req: express.Request, res: express.Response) {
  const { company_id } = req.body as { company_id?: string };
  const connection = connections.get(company_id ?? '');

  if (!connection) {
    return res.json({ success: true, status: 'disconnected', phone_number: null, last_seen: null });
  }

  if ((connection as any).user) {
    return res.json({ success: true, status: 'connected', phone_number: String((connection as any).user.id).split(':')[0], last_seen: new Date().toISOString() });
  } else {
    return res.json({ success: true, status: 'connecting', phone_number: null, last_seen: null });
  }
}

// Handle disconnect
async function handleDisconnect(req: express.Request, res: express.Response) {
  const { company_id } = req.body as { company_id?: string };

  const connection = connections.get(company_id ?? '');
  if (connection) {
    try {
      await (connection as any).logout();
    } catch (e) {
      // ignore
    }
    connections.delete(company_id ?? '');
    qrCodes.delete(company_id ?? '');

    // Hapus session folder
    const sessionPath = path.join('./sessions', `session-${company_id}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  res.json({ success: true, message: 'Disconnected successfully' });
}

// Create WhatsApp connection
async function createWhatsAppConnection(company_id: string) {
  const sessionPath = path.join('./sessions', `session-${company_id}`);

  // Ensure sessions directory exists
  if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: ['CRM WhatsApp', 'Chrome', '1.0.0'] });

  // Handle QR code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update as any;

    console.log(`Connection update for company ${company_id}:`, { connection, lastDisconnect: lastDisconnect?.error?.message });

    if (qr) {
      try {
        const qrString = await qrcode.toDataURL(qr);
        qrCodes.set(company_id, qrString);
        console.log(`QR generated for company ${company_id}`);
      } catch (error) {
        console.error('QR Generation Error:', error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log('Connection closed, reconnecting:', shouldReconnect);

      if (shouldReconnect) {
        setTimeout(() => createWhatsAppConnection(company_id), 5000);
      } else {
        connections.delete(company_id);
        qrCodes.delete(company_id);
      }
    } else if (connection === 'open') {
      console.log(`WhatsApp connected for company ${company_id}`);
      connections.set(company_id, sock);
      qrCodes.delete(company_id); // Hapus QR karena sudah connected
    }
  });

  // Handle credentials update
  sock.ev.on('creds.update', saveCreds);

  // Handle messages (untuk logging/webhook ke PHP)
  sock.ev.on('messages.upsert', async (m) => {
    console.log('New message:', JSON.stringify(m, null, 2));
    // Anda bisa tambahkan webhook ke PHP API di sini jika diperlukan
  });

  // Store socket temporarily
  connections.set(company_id, sock);
}

export function startService(port = process.env.PORT ? Number(process.env.PORT) : 3001) {
  const server = app.listen(port, () => {
  console.log(`WhatsApp Service running on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
  console.log('Shutting down...');
  for (const [company_id, connection] of connections.entries()) {
    if (connection && (connection as any).user) {
    try {
      await (connection as any).logout();
    } catch (e) {
      // ignore
    }
    }
  }
  server.close(() => process.exit(0));
  });

  return server;
}

// Note: to run in this project (which may use ESM), prefer compiling with tsc then run the compiled JS,
// or run with an ESM-capable ts-node variant. Example:
// npx tsc && node dist/whatsapp-service.js
// or during development:
// npx ts-node-esm src/whatsapp-service.ts
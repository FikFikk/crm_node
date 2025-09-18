// whatsapp-service.ts - Enhanced TypeScript service untuk integrate dengan Baileys
import express from 'express';
import type { Request, Response } from 'express';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const app = express();
app.use(express.json());

// Types
type WhatsAppConnection = WASocket & {
    user?: {
        id: string;
        name?: string;
    };
}

// Store untuk menyimpan socket connections per company
const connections = new Map<string, WhatsAppConnection>();
const qrCodes = new Map<string, string>();
const connectionStatus = new Map<string, string>();

// Configuration
const config = {
    webhookUrl: 'http://localhost/api/wa/webhook', // PHP webhook endpoint di crm-backend
    debug: true,
    sessionPath: './sessions'
};

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

// Main WhatsApp API endpoint
app.post('/api/whatsapp', async (req, res) => {
    try {
        const { action, company_id, phone, message } = req.body;
        
        switch (action) {
            case 'get-qr':
                return await handleGetQR(req, res);
            case 'send':
                return await handleSendMessage(req, res);
            case 'status':
                return await handleGetStatus(req, res);
            case 'disconnect':
                return await handleDisconnect(req, res);
            case 'test':
                return handleTest(req, res);
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }
    } catch (error: any) {
        console.error('WhatsApp API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Handle QR generation
async function handleGetQR(req: Request, res: Response) {
    const { company_id } = req.body;
    
    if (!company_id) {
        return res.status(400).json({
            success: false,
            message: 'Company ID is required'
        });
    }
    
    try {
        // Jika sudah connected, return status
        const connection = connections.get(company_id);
        if (connection && connection.user) {
            return res.json({
                success: true,
                status: 'connected',
                phone_number: connection.user.id.split(':')[0],
                message: 'Already connected'
            });
        }
        
        // Jika ada QR code yang masih aktif, return QR tersebut
        if (qrCodes.has(company_id)) {
            return res.json({
                success: true,
                status: 'connecting',
                qr_code: qrCodes.get(company_id),
                message: 'QR code generated'
            });
        }
        
        // Create new connection
        await createWhatsAppConnection(company_id);
        
        // Wait untuk QR code (timeout 30 detik)
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!qrCodes.has(company_id) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (qrCodes.has(company_id)) {
            return res.json({
                success: true,
                status: 'connecting',
                qr_code: qrCodes.get(company_id),
                message: 'QR code generated'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate QR code'
            });
        }
        
    } catch (error) {
        console.error('QR Generation Error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// Test endpoint
function handleTest(req: Request, res: Response) {
    res.json({
        success: true,
        message: 'WhatsApp service is running',
        timestamp: new Date().toISOString()
    });
}

// Handle send message
async function handleSendMessage(req: Request, res: Response) {
    const { company_id, phone, message } = req.body;
    
    if (!company_id || !phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'company_id, phone, and message are required'
        });
    }
    
    const connection = connections.get(company_id);
    if (!connection || !connection.user) {
        return res.status(400).json({
            success: false,
            message: 'WhatsApp not connected for this company'
        });
    }
    
    try {
        const jid = `${phone}@s.whatsapp.net`;
        const result = await connection.sendMessage(jid, { text: message });
        
        res.json({
            success: true,
            message_id: result?.key?.id || 'unknown',
            status: 'sent',
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// Handle get status
async function handleGetStatus(req: Request, res: Response) {
    const { company_id } = req.body;
    
    const connection = connections.get(company_id);
    
    if (!connection) {
        return res.json({
            success: true,
            status: 'disconnected',
            phone_number: null,
            last_seen: null
        });
    }
    
    if (connection.user) {
        return res.json({
            success: true,
            status: 'connected',
            phone_number: connection.user.id.split(':')[0],
            last_seen: new Date().toISOString()
        });
    } else {
        return res.json({
            success: true,
            status: 'connecting',
            phone_number: null,
            last_seen: null
        });
    }
}

// Handle disconnect
async function handleDisconnect(req: Request, res: Response) {
    const { company_id } = req.body;
    
    const connection = connections.get(company_id);
    if (connection) {
        await connection.logout();
        connections.delete(company_id);
        qrCodes.delete(company_id);
        
        // Hapus session folder
        const sessionPath = `./sessions/session-${company_id}`;
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true });
        }
    }
    
    res.json({
        success: true,
        message: 'Disconnected successfully'
    });
}

// Create WhatsApp connection
async function createWhatsAppConnection(company_id: string) {
    const sessionPath = `./sessions/session-${company_id}`;
    
    // Ensure sessions directory exists
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions');
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Kita akan handle QR sendiri
        browser: ['CRM WhatsApp', 'Chrome', '1.0.0']
    });
    
    // Handle QR code
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
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
            const error = lastDisconnect?.error as any;
            const shouldReconnect = (error?.output?.statusCode !== DisconnectReason.loggedOut);
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    for (const [company_id, connection] of connections.entries()) {
        if (connection && connection.user) {
            await connection.logout();
        }
    }
    process.exit(0);
});
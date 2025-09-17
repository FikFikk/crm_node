// src/routers/whatsapp.router.ts
import { Router } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { QRCodeService } from '../services/qrcode.service';
import { connectionStore } from '../stores/connection.store';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../config/constants';
import type { Request, Response } from 'express';

const router = Router();

// GET /qr-code?id=2 - Generate QR code untuk company
router.get('/qr-code', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.id as string;
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required' 
      });
    }

    Logger.info(`QR Code requested for company ${companyId}`);

    // Check jika sudah connected
    if (connectionStore.has(companyId) && connectionStore.getStatus(companyId) === 'connected') {
      const sock = connectionStore.get(companyId)!;
      const phoneNumber = sock.user?.id?.split(':')[0];
      
      return res.json({
        success: true,
        message: 'Already connected',
        status: 'connected',
        phone_number: phoneNumber
      });
    }

    // Check jika ada QR yang pending
    if (QRCodeService.hasQRCode(companyId)) {
      return res.json({
        success: true,
        message: 'QR code ready',
        qr_code: QRCodeService.getQRCode(companyId),
        status: 'qr_ready'
      });
    }

    // Buat connection baru dan store di connectionStore
    const sock = await WhatsAppService.createConnection(companyId);
    connectionStore.set(companyId, sock);
    
    // Wait sebentar untuk QR generation
    await new Promise(resolve => setTimeout(resolve, CONSTANTS.QR_WAIT_TIMEOUT));
    
    if (QRCodeService.hasQRCode(companyId)) {
      res.json({
        success: true,
        message: 'QR code generated',
        qr_code: QRCodeService.getQRCode(companyId),
        status: 'qr_ready'
      });
    } else {
      res.json({
        success: true,
        message: 'Connection initiated, QR pending',
        status: 'connecting'
      });
    }
    
  } catch (error) {
    Logger.error('QR Code generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /send-message - Send WhatsApp message
router.post('/send-message', async (req: Request, res: Response) => {
  try {
    const { company_id, to, message } = req.body;
    
    if (!company_id || !to || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'company_id, to, and message are required' 
      });
    }

    const result = await WhatsAppService.sendMessage(company_id, to, message);
    
    Logger.info(`Message sent from company ${company_id} to ${to}:`, result);
    
    res.json({ 
      success: true,
      message: 'Message sent successfully',
      message_id: result?.key?.id,
      status: 'sent' 
    });
  } catch (error) {
    Logger.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /status/:companyId - Get connection status
router.get('/status/:companyId', (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const connectionInfo = WhatsAppService.getConnectionInfo(companyId);

    res.json({
      success: true,
      ...connectionInfo
    });
  } catch (error) {
    Logger.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /disconnect/:companyId - Disconnect WhatsApp
router.post('/disconnect/:companyId', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId;
    await WhatsAppService.disconnect(companyId);

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    Logger.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /test - Health check
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'WhatsApp service is running',
    timestamp: new Date().toISOString(),
    active_connections: connectionStore.getAll()
  });
});

export { router as whatsappRouter };
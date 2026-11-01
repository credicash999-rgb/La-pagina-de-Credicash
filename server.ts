/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // In-memory sync cache for CRM endpoint (populated by system or queried directly)
  let cachedData: {
    clientes: any[];
    operaciones: any[];
    cuotas: any[];
    configuracion: any;
  } = {
    clientes: [],
    operaciones: [],
    cuotas: [],
    configuracion: {}
  };

  // Endpoint to sync current snapshot from applet client to server cache
  app.post('/api/v1/crm/internal/sync-cache', (req: Request, res: Response) => {
    const { clientes, operaciones, cuotas, configuracion } = req.body || {};
    if (Array.isArray(clientes)) cachedData.clientes = clientes;
    if (Array.isArray(operaciones)) cachedData.operaciones = operaciones;
    if (Array.isArray(cuotas)) cachedData.cuotas = cuotas;
    if (configuracion) cachedData.configuracion = configuracion;
    res.json({ success: true, count: cachedData.clientes.length });
  });

  // 1. CONSULTA SEGURA DE ESTADO DE CUENTA PARA CRM WHATSAPP
  // GET /api/v1/crm/clientes/resumen?telefono={telefono_o_alias}
  app.get('/api/v1/crm/clientes/resumen', (req: Request, res: Response) => {
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization'];
    const configuredKey = cachedData.configuracion?.crmApiKey || process.env.CRM_API_KEY || 'credicash_crm_secret';

    // Simple Bearer or API Key check if key is configured
    if (configuredKey && apiKeyHeader) {
      const cleanHeader = String(apiKeyHeader).replace('Bearer ', '').trim();
      if (cleanHeader !== configuredKey) {
        return res.status(401).json({ error: 'No autorizado. Token de API inválido.' });
      }
    }

    const rawParam = (req.query.telefono || req.query.alias || req.query.query || '').toString().trim();
    if (!rawParam) {
      return res.status(400).json({ error: 'Parámetro teléfono o alias es requerido (?telefono=...)' });
    }

    const cleanNumber = rawParam.replace(/\D/g, '');

    const foundClient = cachedData.clientes.find((c: any) => {
      const cTel = (c.telefono || '').replace(/\D/g, '');
      const cWhats = (c.whatsapp || '').replace(/\D/g, '');
      const cId = (c.id || '').toLowerCase();
      const cDni = (c.dni || '').replace(/\D/g, '');
      const cAlias = (c.aliasAnonimo || '').toLowerCase();
      const qLower = rawParam.toLowerCase();

      return (
        (cleanNumber && (cTel.includes(cleanNumber) || cleanNumber.includes(cTel) || cWhats.includes(cleanNumber))) ||
        cId === qLower ||
        cDni === cleanNumber ||
        cAlias.includes(qLower)
      );
    });

    if (!foundClient) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        parametro_busqueda: rawParam
      });
    }

    // Active loan for this client
    const clientOps = cachedData.operaciones.filter((o: any) => o.idCliente === foundClient.id);
    const activeOp = clientOps.find((o: any) => o.estado === 'ACTIVA' || o.estado === 'VENCIDA') || clientOps[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const opCuotas = cachedData.cuotas.filter((c: any) => activeOp && c.idOperacion === activeOp.id);
    const pendingCuotas = opCuotas.filter((c: any) => c.estado !== 'PAGADA').sort((a: any, b: any) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

    let estadoCalculado = 'al_dia';
    if (activeOp?.diasMora > 0 || pendingCuotas.some((c: any) => c.fechaVencimiento < todayStr)) {
      estadoCalculado = 'en_mora';
    } else if (pendingCuotas.length > 0 && pendingCuotas[0].fechaVencimiento <= todayStr) {
      estadoCalculado = 'proximo_a_vencer';
    }

    const proximaCuota = pendingCuotas[0];
    const cuotaActualNum = activeOp ? (activeOp.cuotasPagadas + 1) : 1;

    const responsePayload = {
      cliente_codigo: foundClient.id,
      nombre: `${foundClient.nombre} ${foundClient.apellido || ''}`.trim(),
      prestamo_id: activeOp ? activeOp.id : 'SIN-OPERACION',
      linea: activeOp ? `Préstamo ${activeOp.frecuencia || 'Personal'}` : 'Sin Préstamo Activo',
      saldo_restante: activeOp ? (activeOp.totalPendiente || 0) : 0,
      cuota_actual: cuotaActualNum,
      cuotas_totales: activeOp ? activeOp.cantidadCuotas : 0,
      monto_cuota: activeOp ? activeOp.valorCuota : 0,
      vencimiento: proximaCuota ? proximaCuota.fechaVencimiento : (activeOp?.proximoVencimiento || todayStr),
      estado: estadoCalculado,
      cbu_oficial: cachedData.configuracion?.cbuOficial || '0170099220000049281729',
      alias_oficial: cachedData.configuracion?.aliasOficial || 'FINANCIERA.COBROS.OFICIAL'
    };

    return res.json(responsePayload);
  });

  // Mock receiver webhook for local tests
  app.post('/api/enviar-mensaje-oficial', (req: Request, res: Response) => {
    console.log('[CRM WHATSAPP WEBHOOK RECEIVED]:', req.body);
    return res.json({
      success: true,
      mensaje: 'Notificación oficial enviada con éxito por WhatsApp',
      timestamp: new Date().toISOString(),
      recibido: req.body
    });
  });

  // Vite development middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`CrediCash Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});

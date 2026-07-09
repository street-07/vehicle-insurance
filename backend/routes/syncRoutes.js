import express from 'express';

const router = express.Router();
export const sseClients = new Set();

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection message
  res.write('data: connected\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

export const broadcastRefresh = () => {
  sseClients.forEach(client => {
    client.write('data: refresh\n\n');
  });
};

export default router;

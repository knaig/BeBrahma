import express from 'express';
// import { ConversationMemoryManager } from '../ai/conversation-memory';

const router = express.Router();

router.post('/memory', async (_req, res) => {
  return res.status(501).json({ error: 'Conversation memory temporarily disabled' });
});

export default router;

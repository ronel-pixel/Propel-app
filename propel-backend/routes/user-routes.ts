import express, { Response } from 'express';
import { validateToken, AuthRequest } from '../middleware/auth-middleware';
import { getOrCreateUserProfile } from '../services/user-service';

const router = express.Router();

// get user profile
router.get('/me', validateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;
  const email = req.user?.email;

  try {
    const profile = await getOrCreateUserProfile(userId!, email);
    res.status(200).json(profile);
  } catch (error) {
    console.error("User Profile Error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
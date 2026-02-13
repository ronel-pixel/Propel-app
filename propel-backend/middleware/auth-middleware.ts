import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase-config';

// הרחבת הטיפוס של Request כדי שיכיר את אובייקט ה-user שאנחנו מוסיפים
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const validateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // בדיקה אם בכלל נשלח Header של אימות
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // אימות הטוקן מול שרתי Firebase
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // הזרקת פרטי המשתמש לתוך ה-request כדי שהראוטים הבאים יוכלו להשתמש בזה
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next(); // הכל תקין, עוברים לשלב הבא
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};
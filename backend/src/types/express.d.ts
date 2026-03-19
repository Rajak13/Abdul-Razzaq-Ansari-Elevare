import 'express';

declare module 'express-serve-static-core' {
  interface User {
    userId: string;
    email: string;
  }
  interface Request {
    user?: User;
    admin?: {
      id: string;
      email: string;
      role: 'owner' | 'administrator' | 'moderator';
      mfa_enabled: boolean;
    };
  }
}

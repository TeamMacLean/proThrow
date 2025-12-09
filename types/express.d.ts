import "express";

declare global {
  namespace Express {
    interface User {
      username: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      mail?: string;
      iconURL?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

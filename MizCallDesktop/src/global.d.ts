declare global {
  interface Window {
    mizcall?: {
      env?: string;
      loginHost?: (email: string, password: string) => Promise<{
        token: string;
        hostId?: string;
        name?: string;
        avatarUrl?: string;
      }>;
      loginUser?: (userId: string, password: string) => Promise<{
        token: string;
        hostId?: string;
        name?: string;
        avatarUrl?: string;
      }>;
    };
  }
}

export {};


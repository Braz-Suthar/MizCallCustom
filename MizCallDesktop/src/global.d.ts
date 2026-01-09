declare global {
  interface Window {
    mizcall?: {
      env?: string;
      loginHost?: (email: string, password: string) => Promise<{
        token: string;
        refreshToken: string;
        hostId?: string;
        name?: string;
        avatarUrl?: string;
      }>;
      loginUser?: (userId: string, password: string) => Promise<{
        token: string;
        refreshToken: string;
        hostId?: string;
        userId?: string;
        name?: string;
        avatarUrl?: string;
        password?: string;
      }>;
      openActiveCallWindow?: (payload: any) => void;
      onActiveCallContext?: (cb: (data: any) => void) => () => void;
      openSystemSettings?: (type: "microphone" | "camera") => void;
    };
  }
}

export {};


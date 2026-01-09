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
        email?: string;
        twoFactorEnabled?: boolean;
        requireOtp?: boolean;
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
      verifyHostOtp?: (hostId: string, otp: string) => Promise<{
        token: string;
        refreshToken: string;
        hostId: string;
        name?: string;
        avatarUrl?: string;
        email?: string;
        twoFactorEnabled?: boolean;
      }>;
      requestHostPasswordOtp?: (identifier: string) => Promise<{ ok: boolean; hostId: string; email?: string }>;
      resetHostPassword?: (payload: { hostId: string; otp: string; newPassword: string }) => Promise<{ ok: boolean }>;
      openActiveCallWindow?: (payload: any) => void;
      onActiveCallContext?: (cb: (data: any) => void) => () => void;
      openSystemSettings?: (type: "microphone" | "camera") => void;
    };
  }
}

export {};


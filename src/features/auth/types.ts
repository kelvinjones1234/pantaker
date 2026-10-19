export type AuthActionState = {
  status: "idle" | "error" | "code_sent";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthState: AuthActionState = { status: "idle" };

export type GoogleSignInResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

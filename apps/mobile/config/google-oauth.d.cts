export type GoogleOAuthBuildClients = {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  requireAndroid?: boolean;
};

export function validateGoogleOAuthClients(input: GoogleOAuthBuildClients): void;

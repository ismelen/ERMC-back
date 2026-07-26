import { AuthService, OAuthData } from './auth-serivice';

export class CloudService {
  static async getToken(
    current?: OAuthData,
    forced: boolean = false,
    returnPath?: string
  ): Promise<OAuthData | undefined> {
    const { refresh, expiresAt: expirationDate, token, email } = current ?? {};
    const expiresAt = expirationDate ?? 0;

    if (!forced && token && expiresAt > Date.now()) return current;

    let tokens: OAuthData | undefined;

    if (!refresh || forced) {
      tokens = await AuthService.login(returnPath);
    } else {
      tokens = await AuthService.refreshToken(refresh);
    }

    if (!tokens) return;
    if (!tokens.email) tokens.email = email;

    return tokens;
  }
}

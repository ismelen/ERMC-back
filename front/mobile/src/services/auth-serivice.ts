import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { DROPBOX_API_KEY } from '../constants';
import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
} from 'expo-crypto';

export interface OAuthData {
  token?: string;
  refresh?: string;
  expiresAt?: number;
  email?: string;
}

WebBrowser.maybeCompleteAuthSession();

export class AuthService {
  static async login(returnPath?: string): Promise<OAuthData | undefined> {
    const redirectUri = Linking.createURL('oauth');

    const { codeVerifier, codeChallenge } = await AuthService.generatePKCE();

    const stateParam = returnPath ? `&state=${encodeURIComponent(returnPath)}` : '';

    const authUrl =
      `https://www.dropbox.com/oauth2/authorize` +
      `?client_id=${DROPBOX_API_KEY}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      `&token_access_type=offline` +
      stateParam +
      `&scope=files.content.write%20files.metadata.read%20account_info.read`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== 'success') return undefined;

    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code as string | undefined;
    if (!code) return undefined;

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_API_KEY,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!res.ok) return undefined;

    const { access_token, refresh_token, expires_in } = await res.json();

    const email = await AuthService.getUserEmail(access_token);

    return {
      token: access_token,
      refresh: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      email: email,
    };
  }

  static async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const randomBytes = getRandomBytes(32);
    const codeVerifier = btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, codeVerifier, {
      encoding: CryptoEncoding.BASE64,
    });

    const codeChallenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return { codeVerifier, codeChallenge };
  }

  static async refreshToken(refresh: string): Promise<OAuthData | undefined> {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: DROPBOX_API_KEY,
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error_description ?? 'Failed to refresh Dropbox token');
    }

    const { access_token, expires_in, refresh_token } = await res.json();

    return {
      expiresAt: Date.now() + expires_in * 1000,
      token: access_token,
      refresh: refresh_token,
    };
  }

  static async getUserEmail(accessToken: string): Promise<string | undefined> {
    try {
      const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Error al obtener la cuenta:', err);
        return undefined;
      }

      const data = await res.json();

      return data.email;
    } catch (error) {
      console.error('Error de red al intentar obtener el email:', error);
      return undefined;
    }
  }
}

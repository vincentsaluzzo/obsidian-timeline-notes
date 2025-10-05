import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Notice } from 'obsidian';
import { OAuthCallbackServer } from './OAuthCallbackServer';

export interface AuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface TokenData {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
    token_type: string;
}

export class AuthManager {
    private oauth2Client: OAuth2Client | null = null;
    private config: AuthConfig | null = null;
    private tokenData: TokenData | null = null;

    constructor() {}

    /**
     * Initialize OAuth2 client with configuration
     */
    initialize(config: AuthConfig): void {
        this.config = config;
        this.oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            config.redirectUri
        );
    }

    /**
     * Set stored token data
     */
    setTokenData(tokenData: TokenData): void {
        this.tokenData = tokenData;
        if (this.oauth2Client) {
            this.oauth2Client.setCredentials({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expiry_date: tokenData.expiry_date,
                token_type: tokenData.token_type
            });
        }
    }

    /**
     * Get authorization URL for OAuth consent
     */
    getAuthUrl(): string {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.readonly'],
            prompt: 'consent' // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokenFromCode(code: string): Promise<TokenData> {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        try {
            const { tokens } = await this.oauth2Client.getToken(code);

            const tokenData: TokenData = {
                access_token: tokens.access_token!,
                refresh_token: tokens.refresh_token || undefined,
                expiry_date: tokens.expiry_date || undefined,
                token_type: tokens.token_type || 'Bearer'
            };

            this.setTokenData(tokenData);
            return tokenData;
        } catch (error) {
            new Notice('Failed to exchange authorization code for tokens');
            throw error;
        }
    }

    /**
     * Get OAuth2 client (for use with Google APIs)
     */
    getClient(): OAuth2Client {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }
        return this.oauth2Client;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean {
        return this.tokenData !== null && this.oauth2Client !== null;
    }

    /**
     * Clear authentication
     */
    clearAuth(): void {
        this.tokenData = null;
        if (this.oauth2Client) {
            this.oauth2Client.setCredentials({});
        }
    }

    /**
     * Start OAuth flow with automatic callback server
     * This method starts a local server, opens the browser, and waits for the callback
     */
    async authenticateWithCallback(): Promise<TokenData> {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        // Create callback server
        const callbackServer = new OAuthCallbackServer(42813, 60000);

        try {
            // Start server first
            const codePromise = callbackServer.waitForCallback();

            // Open browser with auth URL
            const authUrl = this.getAuthUrl();
            window.open(authUrl, '_blank');

            // Wait for callback
            const code = await codePromise;

            // Exchange code for tokens
            const tokenData = await this.getTokenFromCode(code);

            return tokenData;
        } catch (error) {
            callbackServer.stop();
            throw error;
        }
    }
}

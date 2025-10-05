import * as http from 'http';
import { Notice } from 'obsidian';

export class OAuthCallbackServer {
    private server: http.Server | null = null;
    private port: number;
    private timeoutMs: number;
    private timeoutHandle: NodeJS.Timeout | null = null;

    constructor(port: number = 42813, timeoutMs: number = 60000) {
        this.port = port;
        this.timeoutMs = timeoutMs;
    }

    /**
     * Start the server and wait for OAuth callback
     * Returns a promise that resolves with the authorization code
     */
    async waitForCallback(): Promise<string> {
        return new Promise((resolve, reject) => {
            // Set timeout
            this.timeoutHandle = setTimeout(() => {
                this.stop();
                reject(new Error('OAuth callback timeout - no response received within 60 seconds'));
            }, this.timeoutMs);

            // Create HTTP server
            this.server = http.createServer((req, res) => {
                // Parse URL
                const url = new URL(req.url || '', `http://localhost:${this.port}`);

                // Check for authorization code
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');

                if (error) {
                    // User denied authorization
                    this.sendErrorPage(res, error);
                    this.stop();
                    reject(new Error(`Authorization denied: ${error}`));
                    return;
                }

                if (code) {
                    // Success! Send success page and resolve
                    this.sendSuccessPage(res);

                    // Clear timeout
                    if (this.timeoutHandle) {
                        clearTimeout(this.timeoutHandle);
                        this.timeoutHandle = null;
                    }

                    // Stop server after a short delay to ensure response is sent
                    setTimeout(() => {
                        this.stop();
                        resolve(code);
                    }, 500);
                } else {
                    // No code parameter found
                    this.sendErrorPage(res, 'No authorization code received');
                }
            });

            // Handle server errors
            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.port} is already in use. Please close other applications using this port.`));
                } else {
                    reject(new Error(`Server error: ${err.message}`));
                }
                this.stop();
            });

            // Start listening
            this.server.listen(this.port, 'localhost', () => {
                console.log(`OAuth callback server listening on http://localhost:${this.port}`);
            });
        });
    }

    /**
     * Stop the server
     */
    stop(): void {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }

        if (this.server) {
            this.server.close(() => {
                console.log('OAuth callback server stopped');
            });
            this.server = null;
        }
    }

    /**
     * Send success page to browser
     */
    private sendSuccessPage(res: http.ServerResponse): void {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #10b981;
            margin: 0 0 1rem 0;
            font-size: 2rem;
        }
        p {
            color: #6b7280;
            margin: 0.5rem 0;
            font-size: 1.1rem;
        }
        .note {
            margin-top: 2rem;
            padding: 1rem;
            background: #f3f4f6;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #4b5563;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>Authorization Successful!</h1>
        <p>You have successfully authorized Google Calendar access.</p>
        <p>You can now close this window and return to Obsidian.</p>
        <div class="note">
            This window will close automatically in a few seconds.
        </div>
    </div>
    <script>
        // Auto-close after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * Send error page to browser
     */
    private sendErrorPage(res: http.ServerResponse, error: string): void {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Failed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #ef4444;
            margin: 0 0 1rem 0;
            font-size: 2rem;
        }
        p {
            color: #6b7280;
            margin: 0.5rem 0;
            font-size: 1.1rem;
        }
        .error-detail {
            margin-top: 1.5rem;
            padding: 1rem;
            background: #fee2e2;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Authorization Failed</h1>
        <p>There was a problem with the authorization.</p>
        <p>Please close this window and try again in Obsidian.</p>
        <div class="error-detail">
            Error: ${error}
        </div>
    </div>
</body>
</html>
        `;

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * Check if a port is available
     */
    static async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = http.createServer();

            server.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });

            server.once('listening', () => {
                server.close();
                resolve(true);
            });

            server.listen(port, 'localhost');
        });
    }
}

import { createClient } from '@/lib/auth/client';

export interface DriveFile {
    id: string;
    name: string;
    webViewLink?: string;
    iconLink?: string;
}

export class GoogleDriveService {
    private static async getAccessToken(): Promise<string | null> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.provider_token || null;
    }

    /**
     * Get or create a designated folder for Scrivener Flow
     */
    static async getOrCreateFolder(folderName: string = 'ScrivenerFlow_Attachments'): Promise<string> {
        const token = await this.getAccessToken();
        if (!token) {
            console.error('Google Drive Debug: Token is missing from session');
            throw new Error('請登出並重新登入，並確保勾選 Google Drive 權限');
        }

        // Search for the folder with proper encoding
        const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: query })}`;

        console.log('Google Drive Debug: Fetching folder search...', { folderName });

        try {
            const searchRes = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!searchRes.ok) {
                const errorData = await searchRes.json();
                console.error('Google Drive API Error:', errorData);
                throw new Error(`Google API 錯誤: ${errorData.error?.message || searchRes.statusText}`);
            }

            const searchData = await searchRes.json();
            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }

            // Create the folder if not found
            console.log('Google Drive Debug: Folder not found, creating...', folderName);
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            });
            const createData = await createRes.json();
            return createData.id;
        } catch (err: any) {
            console.error('Google Drive Network/Fetch Error:', err);
            if (err.message === 'Failed to fetch') {
                throw new Error('網路連線失敗，可能是公司防火牆阻擋了瀏覽器直接連線到 googleapis.com');
            }
            throw err;
        }
    }

    /**
     * Resumable Upload Implementation
     */
    static async uploadFile(
        file: File,
        folderId?: string,
        onProgress?: (progress: number) => void
    ): Promise<DriveFile> {
        const token = await this.getAccessToken();
        if (!token) throw new Error('Google Access Token not found');

        // 1. Initial Request to get the Upload URL
        const metadata = {
            name: file.name,
            parents: folderId ? [folderId] : [],
        };

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': file.type,
                'X-Upload-Content-Length': file.size.toString(),
            },
            body: JSON.stringify(metadata),
        });

        if (!res.ok) throw new Error('Failed to initialize upload');
        const uploadUrl = res.headers.get('Location');
        if (!uploadUrl) throw new Error('Upload URL not received');

        // 2. Upload the file content
        const xhr = new XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const result = JSON.parse(xhr.responseText);
                    resolve({
                        id: result.id,
                        name: result.name,
                    });
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(file);
        });
    }

    /**
     * Get file details (web link)
     */
    static async getFileDetails(fileId: string): Promise<DriveFile> {
        const token = await this.getAccessToken();
        if (!token) throw new Error('Google Access Token not found');

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,iconLink`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return await res.json();
    }
}

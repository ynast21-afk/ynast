/**
 * Backblaze B2 URL 처리를 위한 중앙 집중식 유틸리티
 */

interface MediaUrlOptions {
    url: string | null | undefined;
    token?: string | null;
    activeBucketName?: string | null;
    downloadUrl?: string | null;
}

/**
 * B2 URL을 수정하고 인증 토큰을 추가합니다.
 * @param options URL, 토큰, 활성 버킷 이름, 다운로드 URL을 포함하는 옵션 객체
 * @returns 수정된 URL 또는 원본 URL
 */
export function getMediaUrl({ url, token, activeBucketName, downloadUrl }: MediaUrlOptions): string {
    if (!url) return '';

    // B2 URL이 아닌 경우 원본 반환
    if (!url.includes('backblazeb2.com/file/')) return url;

    let processedUrl = url;

    try {
        const parts = url.split('/');
        const fileIndex = parts.indexOf('file');

        if (fileIndex !== -1 && parts.length > fileIndex + 1) {
            // 1. 버킷 이름 수정 (activeBucketName이 있을 경우)
            if (activeBucketName && activeBucketName !== 'undefined') {
                parts[fileIndex + 1] = activeBucketName;
            }

            // 2. 도메인 수정 (downloadUrl이 있을 경우)
            if (downloadUrl) {
                const correctedPath = parts.slice(fileIndex).join('/');
                const baseDomain = downloadUrl.endsWith('/') ? downloadUrl.slice(0, -1) : downloadUrl;
                processedUrl = `${baseDomain}/${correctedPath}`;
            } else {
                processedUrl = parts.join('/');
            }
        }
    } catch (e) {
        console.error('Error processing B2 URL:', e);
    }

    // 3. 인증 토큰 추가 (B2 URL이고 토큰이 있을 경우)
    if (processedUrl.includes('backblazeb2.com') && token) {
        const separator = processedUrl.includes('?') ? '&' : '?';
        // 이미 Authorization 파라미터가 있는지 확인 (중복 방지)
        if (!processedUrl.includes('Authorization=')) {
            return `${processedUrl}${separator}Authorization=${token}`;
        }
    }

    return processedUrl;
}

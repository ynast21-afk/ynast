/**
 * 클라이언트 측 MIME 타입 해결 유틸리티
 * 브라우저의 file.type이 빈 문자열이거나 잘못된 경우 대비 → 확장자 기반 결정
 */

const VIDEO_MIME_MAP: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2',
    '.ts': 'video/mp2t',
    '.mts': 'video/mp2t',
    '.m2ts': 'video/mp2t',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.ogv': 'video/ogg',
    '.f4v': 'video/mp4',
}

const IMAGE_MIME_MAP: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
}

const ALL_MIME_MAP: Record<string, string> = {
    ...VIDEO_MIME_MAP,
    ...IMAGE_MIME_MAP,
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
}

/**
 * 파일 이름(확장자)으로부터 올바른 Content-Type을 결정합니다.
 * 브라우저 제공 타입보다 확장자 기반 매핑을 우선합니다.
 */
export function resolveContentType(fileName: string, browserType?: string): string {
    const ext = getFileExtension(fileName)

    // 확장자 기반이 가장 신뢰할 수 있음
    if (ALL_MIME_MAP[ext]) return ALL_MIME_MAP[ext]

    // 브라우저가 제공한 타입 (비거나 generic이 아닌 경우)
    if (browserType && browserType !== '' && browserType !== 'application/octet-stream') {
        return browserType
    }

    return 'application/octet-stream'
}

/**
 * 파일이 지원되는 비디오 형식인지 확인합니다.
 * file.type 대신 확장자로 판별 → 브라우저가 인식 못하는 형식도 통과 가능
 */
export function isVideoFile(file: File): boolean {
    const ext = getFileExtension(file.name)
    return ext in VIDEO_MIME_MAP
}

/**
 * 파일이 지원되는 이미지 형식인지 확인합니다.
 */
export function isImageFile(file: File): boolean {
    const ext = getFileExtension(file.name)
    return ext in IMAGE_MIME_MAP
}

/**
 * 지원되는 모든 비디오 확장자 목록을 반환합니다.
 * HTML input accept 속성에 사용할 수 있는 형식입니다.
 */
export function getAcceptedVideoExtensions(): string {
    return Object.keys(VIDEO_MIME_MAP).join(',')
}

/**
 * 지원되는 모든 이미지 확장자 목록을 반환합니다.
 */
export function getAcceptedImageExtensions(): string {
    return Object.keys(IMAGE_MIME_MAP).join(',')
}

function getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
}

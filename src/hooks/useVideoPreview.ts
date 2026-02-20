'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVideoPreviewOptions {
    videoUrl: string
    frameCount?: number           // 캡처할 프레임 수 (기본 5)
    intervalMs?: number           // 프레임 전환 간격 ms (기본 1000)
    enabled?: boolean             // 전체 활성화 여부
}

interface UseVideoPreviewReturn {
    frameUrls: string[]           // 캡처된 프레임 URL 배열
    activeIndex: number           // 현재 표시 중인 프레임 인덱스 (-1이면 비활성)
    isLoading: boolean            // 프레임 캡처 중인지
    isReady: boolean              // 프레임이 모두 준비되었는지
    startPreview: () => void      // 호버 시작 시 호출
    stopPreview: () => void       // 호버 종료 시 호출
}

/**
 * 비디오에서 랜덤 프레임 5장을 캡처하여 1초 간격으로 순환 표시하는 훅.
 * 
 * 작동 방식:
 * 1. 마우스를 올리면 숨겨진 <video>에서 비디오 메타데이터를 로드
 * 2. 전체 재생 시간에서 랜덤 5개 지점을 골라 해당 프레임을 <canvas>로 캡처
 * 3. 캡처된 이미지(data URL)를 1초 간격으로 순환 표시
 * 4. 마우스를 떼면 순환 중지
 * 
 * 한번 캡처된 프레임은 메모리에 캐시되어 재호버 시 다시 로드하지 않음.
 */
export function useVideoPreview({
    videoUrl,
    frameCount = 5,
    intervalMs = 1000,
    enabled = true,
}: UseVideoPreviewOptions): UseVideoPreviewReturn {
    const [frameUrls, setFrameUrls] = useState<string[]>([])
    const [activeIndex, setActiveIndex] = useState(-1)
    const [isLoading, setIsLoading] = useState(false)
    const [isReady, setIsReady] = useState(false)

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const isCapturingRef = useRef(false)
    const isMountedRef = useRef(true)

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            // 캡처된 blob URL 해제
            // (data URL 사용 시 불필요하지만, 안전을 위해)
        }
    }, [])

    // 프레임 캡처 함수
    const captureFrames = useCallback(async (): Promise<string[]> => {
        if (isCapturingRef.current) return []
        isCapturingRef.current = true

        return new Promise((resolve) => {
            // 캔버스 생성 (재사용)
            if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas')
            }
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                isCapturingRef.current = false
                resolve([])
                return
            }

            // 비디오 요소 생성
            const video = document.createElement('video')
            video.crossOrigin = 'anonymous'
            video.preload = 'auto'
            video.muted = true
            video.playsInline = true
            videoRef.current = video

            const frames: string[] = []
            let seekPoints: number[] = []
            let currentSeekIndex = 0

            const cleanup = () => {
                video.removeEventListener('loadedmetadata', onMetadataLoaded)
                video.removeEventListener('seeked', onSeeked)
                video.removeEventListener('error', onError)
                video.src = ''
                video.load()
                isCapturingRef.current = false
            }

            const onError = () => {
                cleanup()
                resolve([])
            }

            const onSeeked = () => {
                if (!isMountedRef.current) {
                    cleanup()
                    resolve(frames)
                    return
                }

                try {
                    // 현재 프레임을 캡처
                    canvas.width = video.videoWidth || 320
                    canvas.height = video.videoHeight || 180
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                    // JPEG 품질 0.7로 data URL 생성 (메모리 절약)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                    frames.push(dataUrl)

                    currentSeekIndex++
                    if (currentSeekIndex < seekPoints.length) {
                        // 다음 시점으로 이동
                        video.currentTime = seekPoints[currentSeekIndex]
                    } else {
                        // 모든 프레임 캡처 완료
                        cleanup()
                        resolve(frames)
                    }
                } catch (e) {
                    // CORS 등의 이유로 캡처 실패 시
                    cleanup()
                    resolve(frames)
                }
            }

            const onMetadataLoaded = () => {
                const duration = video.duration
                if (!duration || duration <= 0 || !isFinite(duration)) {
                    cleanup()
                    resolve([])
                    return
                }

                // 영상의 5%~95% 구간에서 랜덤 시점 선택
                const minTime = duration * 0.05
                const maxTime = duration * 0.95
                const range = maxTime - minTime

                seekPoints = Array.from({ length: frameCount }, () =>
                    minTime + Math.random() * range
                ).sort((a, b) => a - b)  // 순서대로 정렬 (seek 성능 향상)

                currentSeekIndex = 0
                video.currentTime = seekPoints[0]
            }

            video.addEventListener('loadedmetadata', onMetadataLoaded, { once: true })
            video.addEventListener('seeked', onSeeked)
            video.addEventListener('error', onError, { once: true })

            // 5초 타임아웃
            setTimeout(() => {
                if (isCapturingRef.current) {
                    cleanup()
                    resolve(frames.length > 0 ? frames : [])
                }
            }, 8000)

            video.src = videoUrl
            video.load()
        })
    }, [videoUrl, frameCount])

    // 순환 시작
    const startCycling = useCallback((urls: string[]) => {
        if (urls.length === 0) return

        setActiveIndex(0)

        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % urls.length)
        }, intervalMs)
    }, [intervalMs])

    // 호버 시작
    const startPreview = useCallback(async () => {
        if (!enabled || !videoUrl) return

        // 이미 프레임이 준비되어 있으면 바로 순환 시작
        if (frameUrls.length > 0) {
            startCycling(frameUrls)
            return
        }

        // 아직 프레임이 없으면 캡처 시작
        setIsLoading(true)
        const captured = await captureFrames()

        if (!isMountedRef.current) return

        if (captured.length > 0) {
            setFrameUrls(captured)
            setIsReady(true)
            startCycling(captured)
        }
        setIsLoading(false)
    }, [enabled, videoUrl, frameUrls, captureFrames, startCycling])

    // 호버 종료
    const stopPreview = useCallback(() => {
        setActiveIndex(-1)
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    return {
        frameUrls,
        activeIndex,
        isLoading,
        isReady,
        startPreview,
        stopPreview,
    }
}

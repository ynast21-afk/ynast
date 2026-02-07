'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Comment {
    id: string
    videoId: string
    authorId: string
    authorName: string
    text: string
    createdAt: string
    likes: number
}

interface CommentSectionProps {
    videoId: string
}

export default function CommentSection({ videoId }: CommentSectionProps) {
    const { user } = useAuth()
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')

    // Load comments from localStorage
    useEffect(() => {
        const savedComments = localStorage.getItem('kstreamer_comments')
        if (savedComments) {
            try {
                const allComments: Comment[] = JSON.parse(savedComments)
                setComments(allComments.filter(c => c.videoId === videoId))
            } catch (e) {
                console.error('Failed to load comments:', e)
            }
        }
    }, [videoId])

    const handleAddComment = () => {
        if (!newComment.trim()) return
        if (!user) {
            alert('댓글을 달려면 로그인이 필요합니다.')
            return
        }

        const comment: Comment = {
            id: Date.now().toString(),
            videoId,
            authorId: user.id || 'anonymous',
            authorName: user.name || 'Anonymous',
            text: newComment,
            createdAt: new Date().toISOString(),
            likes: 0
        }

        const savedComments = localStorage.getItem('kstreamer_comments')
        const allComments = savedComments ? JSON.parse(savedComments) : []
        const updatedAll = [comment, ...allComments]
        localStorage.setItem('kstreamer_comments', JSON.stringify(updatedAll))

        setComments(prev => [comment, ...prev])
        setNewComment('')

        // Admin notification simulation
        const notifications = JSON.parse(localStorage.getItem('kstreamer_admin_notifications') || '[]')
        notifications.unshift({
            id: Date.now().toString(),
            type: 'comment',
            message: `${user.name}님이 새로운 댓글을 남겼습니다.`,
            time: new Date().toISOString(),
            isRead: false
        })
        localStorage.setItem('kstreamer_admin_notifications', JSON.stringify(notifications))
    }

    const handleDeleteComment = (commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return

        const savedComments = localStorage.getItem('kstreamer_comments')
        if (savedComments) {
            const allComments: Comment[] = JSON.parse(savedComments)
            const updatedAll = allComments.filter(c => c.id !== commentId)
            localStorage.setItem('kstreamer_comments', JSON.stringify(updatedAll))
            setComments(prev => prev.filter(c => c.id !== commentId))
        }
    }

    return (
        <div className="mt-10">
            <h3 className="text-xl font-semibold mb-5">💬 댓글 {comments.length}개</h3>

            {/* Comment Input */}
            {user ? (
                <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary flex-shrink-0">
                        {user.name?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="w-full bg-bg-secondary border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors min-h-[100px] resize-none"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddComment}
                                className="px-6 py-2 bg-accent-primary text-black font-bold rounded-full hover:opacity-90 transition-opacity"
                            >
                                댓글 쓰기
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-bg-secondary p-6 rounded-xl text-center mb-8 border border-white/10">
                    <p className="text-text-secondary mb-4">로그인 후 댓글을 작성할 수 있습니다.</p>
                    <Link href="/login" className="text-accent-primary font-bold hover:underline">로그인 하러 가기 →</Link>
                </div>
            )}

            {/* Comment List */}
            <div className="space-y-6">
                {comments.length === 0 ? (
                    <p className="text-text-secondary italic text-center py-10">첫 댓글을 남겨보세요!</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-zinc-700 flex items-center justify-center text-white flex-shrink-0">
                                {comment.authorName?.[0].toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">@{comment.authorName}</span>
                                        <span className="text-xs text-text-secondary">
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {(user?.id === comment.authorId || user?.membership === 'vip') && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                                <p className="text-text-secondary leading-relaxed mb-3 whitespace-pre-wrap">{comment.text}</p>
                                <div className="flex gap-4 text-xs text-text-secondary">
                                    <button className="hover:text-accent-primary flex items-center gap-1 transition-colors">
                                        ❤️ {comment.likes}
                                    </button>
                                    <button className="hover:text-accent-primary transition-colors">💬 Reply</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

import Link from 'next/link'

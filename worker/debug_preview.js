fetch('http://localhost:3000/api/db')
    .then(r => r.json())
    .then(db => {
        const lines = []
        // Find a video with previewUrls
        const withPreviews = db.videos.filter(v => v.previewUrls && v.previewUrls.length > 0)
        lines.push('Videos with previewUrls: ' + withPreviews.length)
        if (withPreviews.length > 0) {
            const v = withPreviews[0]
            lines.push('\nExample: ' + v.title)
            lines.push('previewUrls count: ' + v.previewUrls.length)
            v.previewUrls.forEach((u, i) => lines.push(`  [${i}] ${u.substring(0, 120)}`))
            lines.push('gradient: ' + v.gradient)
            lines.push('thumbnailUrl: ' + (v.thumbnailUrl ? v.thumbnailUrl.substring(0, 100) : 'NONE'))
        }
        // Check the test videos
        lines.push('\nTest video rud9281:')
        const rv = db.videos.find(v => v.title && v.title.includes('rud9281') && v.id.includes('1771513'))
        if (rv) {
            lines.push('  previewUrls: ' + JSON.stringify(rv.previewUrls || []))
            lines.push('  gradient: ' + rv.gradient)
            lines.push('  thumbnailUrl: ' + (rv.thumbnailUrl || 'NONE'))
        }
        require('fs').writeFileSync('worker/preview_check.txt', lines.join('\n'))
        console.log('Done')
    })

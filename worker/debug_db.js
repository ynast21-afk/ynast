const fs = require('fs')

fetch('http://localhost:3000/api/db')
    .then(r => r.json())
    .then(db => {
        const lines = []
        lines.push('Total: ' + db.videos.length)

        // First 5
        db.videos.slice(0, 5).forEach((v, i) => {
            lines.push(`[${i}] ${v.title}`)
            lines.push(`  videoUrl: ${v.videoUrl ? v.videoUrl.substring(0, 80) : 'NONE'}`)
            lines.push(`  thumbUrl: ${v.thumbnailUrl ? 'YES' : 'NONE'}`)
            lines.push(`  duration: ${v.duration}`)
        })

        // Search rud9281
        lines.push('\nSearch rud9281:')
        db.videos.filter(v => v.title && v.title.includes('rud9281')).forEach(v => {
            lines.push(`  ${v.id} | ${v.title}`)
        })

        // Search b24ip7
        lines.push('\nSearch b24ip7:')
        db.videos.filter(v => v.title && v.title.includes('b24ip7')).forEach(v => {
            lines.push(`  ${v.id} | ${v.title}`)
        })

        lines.push('\nNo thumbnail: ' + db.videos.filter(v => !v.thumbnailUrl).length)
        lines.push('Duration 0:00: ' + db.videos.filter(v => v.duration === '0:00').length)

        const output = lines.join('\n')
        fs.writeFileSync('worker/dbcheck.txt', output)
        console.log('Done')
    })

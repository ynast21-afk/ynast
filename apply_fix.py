import os

file_path = r'C:\Users\attme\.gemini\antigravity\scratch\kstreamer-dance\src\app\video\[id]\VideoClient.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Indices are 0-based. Line 333 is index 332.
# Line 388 is index 387.
# We want to replace from 332 (inclusive) to 387 (inclusive).
# Slice [332:388] includes 332 up to 387.

start_idx = 332
end_idx = 388

# Double check context (optional but good for log)
print(f"Replacing lines {start_idx+1}-{end_idx}:")
print(lines[start_idx].strip())
print("...")
print(lines[end_idx-1].strip())

new_content = [
    '                        <div className="space-y-4">\n',
    '                            {relatedVideos.map((v) => (\n',
    '                                <RelatedVideoCard key={v.id} video={v} />\n',
    '                            ))}\n',
    '                        </div>\n'
]

lines[start_idx:end_idx] = new_content

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File updated successfully.")

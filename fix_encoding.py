import os

file_path = 'src/app/admin/page.tsx'

try:
    # Try different encodings to read the file
    for encoding in ['utf-8-sig', 'utf-16', 'cp949', 'latin-1']:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
            print(f"Successfully read with {encoding}")
            break
        except Exception:
            continue
    else:
        print("Failed to read with known encodings")
        exit(1)

    # Write back as UTF-8 (no BOM)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully converted to UTF-8")

except Exception as e:
    print(f"Error: {e}")
    exit(1)

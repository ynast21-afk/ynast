/**
 * B2 백업 복구 스크립트
 *
 * 사용법:
 * 1. admin 계정으로 로그인
 * 2. 브라우저 콘솔에서 이 스크립트 실행
 * 3. 복구할 백업 선택
 */

async function listBackups() {
    const authToken = localStorage.getItem('kstreamer_user');
    if (!authToken) {
        console.error('❌ 로그인이 필요합니다.');
        return;
    }

    const user = JSON.parse(authToken);
    const token = btoa(authToken);

    try {
        const res = await fetch('/api/admin/backup', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('❌ 백업 목록 조회 실패:', error);
            return;
        }

        const backups = await res.json();
        console.log('📦 사용 가능한 백업:', backups.length + '개');
        console.table(backups.map((b, i) => ({
            번호: i + 1,
            파일명: b.fileName,
            크기: (b.size / 1024).toFixed(2) + ' KB',
            업로드일시: new Date(b.uploadTimestamp).toLocaleString('ko-KR')
        })));

        return backups;
    } catch (error) {
        console.error('❌ 에러:', error);
    }
}

async function restoreBackup(fileName) {
    const authToken = localStorage.getItem('kstreamer_user');
    if (!authToken) {
        console.error('❌ 로그인이 필요합니다.');
        return;
    }

    const token = btoa(authToken);

    const confirmed = confirm(`정말로 "${fileName}"에서 복구하시겠습니까?\n현재 데이터는 백업으로 저장됩니다.`);
    if (!confirmed) {
        console.log('⚠️ 복구가 취소되었습니다.');
        return;
    }

    console.log('🔄 복구 중...');

    try {
        const res = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName })
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('❌ 복구 실패:', error);
            return;
        }

        const result = await res.json();
        console.log('✅ 복구 성공!', result.message);
        console.log('🔄 페이지를 새로고침하여 복구된 데이터를 확인하세요.');

        const reload = confirm('페이지를 새로고침하시겠습니까?');
        if (reload) {
            window.location.reload();
        }
    } catch (error) {
        console.error('❌ 에러:', error);
    }
}

// 사용법 출력
console.log(`
🔧 백업 복구 도구
==================

1️⃣ 백업 목록 보기:
   const backups = await listBackups();

2️⃣ 최근 백업 복구:
   const backups = await listBackups();
   await restoreBackup(backups[0].fileName);

3️⃣ 특정 백업 복구:
   await restoreBackup('backups/db_2026-02-11T13:00:00.000Z.json');
`);

// 자동으로 백업 목록 표시
listBackups();

@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   CPX 추출기 - 로컬 서버
echo ============================================
echo.
echo  브라우저(크롬/엣지)가 자동으로 열립니다.
echo  주소:  http://localhost:8765
echo.
echo  화면 오른쪽 위 [설치] 버튼(또는 주소창의 설치 아이콘)을 누르면
echo  앱으로 설치됩니다. 설치 후에는 이 창을 닫아도 오프라인으로 실행됩니다.
echo.
echo  이 창을 닫으면 서버가 종료됩니다.
echo ============================================
start "" http://localhost:8765
python -m http.server 8765 2>nul || py -m http.server 8765

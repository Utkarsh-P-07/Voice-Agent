# Start backend and frontend together
Write-Host "Starting Voice Todo Agent..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend/main.py" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow

# Start backend and frontend together (run from project root)
Write-Host "Starting Voice Todo Agent..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir . ; Set-Location backend" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 2

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or run manually:" -ForegroundColor Cyan
Write-Host "  Terminal 1: python -m uvicorn main:app --reload --reload-dir ." -ForegroundColor White
Write-Host "  Terminal 2: cd frontend && npm run dev" -ForegroundColor White

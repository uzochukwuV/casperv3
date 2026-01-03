@echo off
echo Testing DEX API Endpoints
echo =========================

set BASE_URL=http://localhost:3001
set TCSPR=11e528cd01b3b40845e1353ea482fd4f46cab386e88801d53abdfdeb77100859
set USDT=4ad18d2ea1a622e22b9f4c3e4b90eca5708788853d9122113cf78b8a23282dc6
set CDAI=60233c0f979a59991a0a4813846dd2302727f4253911a5c87be6ed1e78196448

echo.
echo 1. Testing Pool Data Query (TCSPR/USDT, 3000 fee)
echo ================================================
curl -X GET "%BASE_URL%/api/dex/pool/%TCSPR%/%USDT%/3000" -H "Content-Type: application/json"

echo.
echo.
echo 2. Testing Swap Quote (1000000000 TCSPR to USDT)
echo ===============================================
curl -X POST "%BASE_URL%/api/dex/quote" ^
  -H "Content-Type: application/json" ^
  -d "{\"token_in\":\"%TCSPR%\",\"token_out\":\"%USDT%\",\"fee\":3000,\"amount_in\":\"1000000000\",\"sqrt_price_limit_x96\":\"0\"}"

echo.
echo.
echo 3. Testing Current Pool Price (TCSPR/USDT)
echo =========================================
curl -X GET "%BASE_URL%/api/dex/price/%TCSPR%/%USDT%/3000" -H "Content-Type: application/json"

echo.
echo.
echo 4. Testing TWAP Query (last 3600 seconds)
echo ========================================
curl -X GET "%BASE_URL%/api/dex/twap/%TCSPR%/%USDT%/3000/3600/0" -H "Content-Type: application/json"

echo.
echo.
echo 5. Testing Multi-hop Router Quote (TCSPR -> USDT -> CDAI)
echo ========================================================
curl -X POST "%BASE_URL%/api/dex/router/quote-multi-hop" ^
  -H "Content-Type: application/json" ^
  -d "{\"path\":[\"%TCSPR%\",\"%USDT%\",\"%CDAI%\"],\"fees\":[3000,3000],\"amount_in\":\"1000000000\"}"

echo.
echo.
echo 6. Testing Position Manager Query (token_id: 1)
echo ==============================================
curl -X GET "%BASE_URL%/api/dex/position-manager/1" -H "Content-Type: application/json"

echo.
echo.
echo 7. Testing Pool Data Query (USDT/CDAI, 3000 fee)
echo ================================================
curl -X GET "%BASE_URL%/api/dex/pool/%USDT%/%CDAI%/3000" -H "Content-Type: application/json"

echo.
echo.
echo 8. Testing Swap Quote (500000000 USDT to CDAI)
echo =============================================
curl -X POST "%BASE_URL%/api/dex/quote" ^
  -H "Content-Type: application/json" ^
  -d "{\"token_in\":\"%USDT%\",\"token_out\":\"%CDAI%\",\"fee\":3000,\"amount_in\":\"500000000\",\"sqrt_price_limit_x96\":\"0\"}"

echo.
echo.
echo 9. Testing Current Pool Price (USDT/CDAI)
echo ========================================
curl -X GET "%BASE_URL%/api/dex/price/%USDT%/%CDAI%/3000" -H "Content-Type: application/json"

echo.
echo.
echo 10. Testing Multi-hop Router Quote (CDAI -> USDT -> TCSPR)
echo =========================================================
curl -X POST "%BASE_URL%/api/dex/router/quote-multi-hop" ^
  -H "Content-Type: application/json" ^
  -d "{\"path\":[\"%CDAI%\",\"%USDT%\",\"%TCSPR%\"],\"fees\":[3000,3000],\"amount_in\":\"100000000\"}"

echo.
echo.
echo All tests completed!
pause
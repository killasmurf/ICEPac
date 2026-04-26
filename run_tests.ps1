$env:JAVA_HOME = "C:\Users\Adam Murphy\AI\jdk\jdk-17.0.18+8"
Set-Location "C:\Users\Adam Murphy\AI\icepac"
& "C:\Users\Adam Murphy\AppData\Local\Programs\Python\Python310\python.exe" -m pytest tests\test_estimation_service.py tests\test_assignment_service.py tests\test_risk_service.py tests\test_approval_service.py -v 2>&1 | Out-File -FilePath "C:\Users\Adam Murphy\AI\icepac\test_results.txt" -Encoding utf8

@echo off
set "JAVA_HOME=C:\Users\Adam Murphy\AI\jdk\jdk-17.0.18+8"
pushd "C:\Users\Adam Murphy\AI\icepac"
python -m pytest tests\test_estimation_service.py tests\test_assignment_service.py tests\test_risk_service.py tests\test_approval_service.py -v
popd

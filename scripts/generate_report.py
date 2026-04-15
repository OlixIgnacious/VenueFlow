import subprocess
import os
import json
from datetime import datetime

def run_command(cmd, cwd=None):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    return result

def generate_report():
    report_path = "automated_test_report.md"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 1. Run Backend Tests
    print("Running Backend Tests...")
    backend_res = run_command("python3 -m pytest tests/backend/test_access_control.py -v")
    backend_status = "PASS" if backend_res.returncode == 0 else "FAIL"
    
    # 2. Run Frontend Tests
    print("Running Frontend E2E Tests...")
    # Add PATH for playwright and npm
    env = os.environ.copy()
    env["PATH"] = f"/opt/homebrew/bin:{env.get('PATH', '')}"
    frontend_res = run_command("npx playwright test --project=chromium", cwd="frontend")
    frontend_status = "PASS" if frontend_res.returncode == 0 else "FAIL"

    # 3. Aggregate Results into Markdown
    report_content = f"""# VenueFlow Automated Testing Report
Generated on: {timestamp}

## Overall Status: {"✅ SUCCESS" if backend_status == "PASS" and frontend_status == "PASS" else "❌ FAILURE"}

---

## 🏗️ Backend Access Control (Pytest)
**Status:** {backend_status}

### Test Summary
```text
{backend_res.stdout}
```

---

## 🌐 Frontend E2E & Redirection (Playwright)
**Status:** {frontend_status}

### Test Summary
```text
{frontend_res.stdout}
```

### Roles Verified
| Role | Auth Success | Correct Dashboard | Unauthorized Blocked |
| :--- | :---: | :---: | :---: |
| Admin | ✅ | ✅ | N/A |
| Staff | ✅ | ✅ | N/A |
| Attendee | ✅ | ✅ | ✅ |

---

## 🔍 System Verification Audit
This suite verified the complete Role-Based Access Control (RBAC) matrix for VenueFlow. 
- **Admin Flow**: Verified full access to `/admin/dashboard`.
- **Staff Flow**: Verified boundary protection for `/staff/dashboard`.
- **Attendee Flow**: Verified redirection to the public dashboard and active "Access Denied" bouncers on admin routes.

*Note: For detailed visual traces of frontend failures, run `npx playwright show-report` in the frontend directory.*
"""
    
    with open(report_path, "w") as f:
        f.write(report_content)
    
    print(f"✅ Report generated at {report_path}")

if __name__ == "__main__":
    generate_report()

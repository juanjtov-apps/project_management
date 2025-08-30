# project_management
Project management app for the construction industry
<br>
## 🚀 MVP Success Criterion (demo 2025-07-28)
<br>**A foreman can:**<br>1. Log in.<br>2. View all projects.<br>3. Inline-edit a task and see it persist after refresh.<br>4 Add and remove projects.<br>5 Use dropdowns and change the tasks' status.

<br>

### 🚀 MVP User Journeys<br>
- Open `/projects` → list or cards view.<br>
- Click a project → edit task fields inline.<br>
- Auto-save with toast → refresh to confirm persistence.<br>

<br>

### Post-launch Backlog<br>
- Calendar / Gantt view<br>
- File uploads<br>
- Summary of the day<br>
- Role-based permissions<br>
- Email with daily tasks

## Development

### Backend

Run the FastAPI backend with automatic restart and heartbeat checks:

```bash
./start_backend.sh
```

This script uses `python_backend/keep_alive.py` to restart the server if it
crashes and to periodically ping the `/health` endpoint so hosting platforms do
not suspend the process due to inactivity.


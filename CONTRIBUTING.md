# 🤝 Contributing to StylistAI V2

Welcome to StylistAI V2! This document outlines our collaborative engineering workflow, branching strategy, and team norms for our two-person development setup.

---

## 👥 Two-Person Work Division

The project is structured into two parallel, decoupled workstreams:

| Workstream | Owner | Focus Areas |
| :--- | :--- | :--- |
| **Workstream A** | Developer A | Foundation, PostgreSQL schema, Backend architecture, Auth/RBAC, Availability engine, Concurrency handling, API implementation, CI/CD |
| **Workstream B** | Developer B | Frontend restructuring, Dashboards (Customer, Staff, Admin), Calendar UI, AI Chat UI, Responsive design, Accessibility, Client integration |
| **Shared / Cross-Cutting** | Both | Architecture decisions, Database/API contracts (`docs/API_CONTRACTS.md`), AI tool definitions, Google Calendar integration, Security reviews, PR reviews |

### 🛡️ The Anti-Silo Rule
* Neither developer should become the sole person who understands a major subsystem.
* **Pattern**: Developer A builds ➡️ Developer B reviews ➡️ Developer B later contributes or modifies.
* Both developers must review every pull request before it is merged into `main`.

---

## 🌿 Git Branching Strategy

1. **`main` Branch**:
   * Always represents the working, stable version.
   * **Direct pushes to `main` are prohibited.**
   * All changes enter `main` exclusively through Pull Requests with passing CI checks.

2. **Feature Branch Naming**:
   * Backend / Foundation: `feature/backend-<feature-name>` or `feature/<feature-name>` (e.g., `feature/v2-schema`, `feature/auth-rbac`, `feature/availability-engine`)
   * Frontend / Product: `feature/frontend-<feature-name>` or `feature/<feature-name>` (e.g., `feature/customer-dashboard`, `feature/staff-dashboard`, `feature/booking-flow`)
   * Fixes: `fix/<issue-description>`

3. **Branch Lifecycle**:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/availability-engine
   # ... develop, test locally ...
   git push origin feature/availability-engine
   # ... open PR against main ...
   ```

---

## 📑 API Contract Policy

- Frontend and Backend are decoupled by **`docs/API_CONTRACTS.md`**.
- If a payload, status code, or endpoint path needs to change:
  1. Both developers must agree on the change.
  2. Update `docs/API_CONTRACTS.md` first.
  3. Implement the change in backend and frontend.

---

## ✅ Definition of Done (DoD)

A feature is considered complete only when:
- [ ] Implementation satisfies all acceptance criteria.
- [ ] Server-side input validation and error handling are in place.
- [ ] Server-enforced authorization / RBAC checks are verified.
- [ ] Relevant unit and integration tests exist and pass.
- [ ] CI pipeline passes without warnings/errors.
- [ ] PR has been reviewed and approved by the other developer.

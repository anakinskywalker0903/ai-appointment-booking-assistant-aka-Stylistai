# Agent Rules

- **Do Not Git Commit or Push**: The agent should only make code changes and save files locally. Do not run `git add`, `git commit`, or `git push` commands. The user will review and push the changes themselves.
- **Zero Hardcoding**: Do not hardcode preset appointment times or rigid responses. Operating hours, breaks, and stylist capabilities must be validated dynamically on the fly, offering smart alternative suggestions if a requested slot is occupied or unavailable.
- **Core Philosophy**: "AI should understand the user. The application should enforce the rules." Keep business logic, validation invariants, and state management cleanly implemented in the application layer.

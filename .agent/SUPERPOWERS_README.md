# ANTIGRAVITY Superpowers Library

This Agent environment includes the full suite of [Obra's Superpowers](https://github.com/obra/superpowers), formatted for direct use with `ANTIGRAVITY`.

## 📂 Location

The full repository is stored in:
`./.agent/skill_library/obra-superpowers`

## 🚀 How to use in a new project

To transfer these superpowers to a new project, simply copy the entire `.agent` folder to your new project root.

### Quick Setup (PowerShell)

If you are starting a fresh project and want to inject these skills:

1. **Copy the `.agent` folder** from this project to your new project.
2. The skills are already active in `.agent/skills`.
3. If you want to update or restore skills from the library, run:

```powershell
# Copy all skills from the library to the active skills folder
Copy-Item -Path ".\.agent\skill_library\obra-superpowers\skills\*" -Destination ".\.agent\skills" -Recurse -Force
```

## 🛠 Available Superpowers

You have access to the following capabilities (and more):

- **Brainstorming**: `/brainstorm` - Turn ideas into designs.
- **Planning**: `/write-plan` - Create detailed implementation plans.
- **Git Workflow**: `/start_feature`, `/git-pushing` - Standardized git operations.
- **Debugging**: `/systematic-debugging` - Structured debugging process.
- **Review**: `/requesting-code-review` - Self-review before finishing tasks.

See `.agent/skills` for the full list of active skills.

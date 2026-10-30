# GitHub Backup Workflow

## 1. Create Remote Backup Repo
1. Create a new empty GitHub repository.
2. Add remote:

```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 2. Daily Safe Workflow
1. Pull latest:

```bash
git pull --ff-only
```

2. Start feature branch by task:

```bash
git checkout -b feature/week1-auth
```

3. Commit small checkpoints:

```bash
git add .
git commit -m "feat: implement google auth and onboarding"
git push -u origin feature/week1-auth
```

4. Merge only after CI passes:
   - Open Pull Request to `main`.
   - Confirm lint/build checks pass.
   - Merge PR.

## 3. Recovery If Something Breaks
1. View history:

```bash
git log --oneline --decorate --graph -20
```

2. Revert bad commit safely:

```bash
git revert <commit_sha>
git push
```

## 4. Rule For This Repo
- Never work without committing before major changes.
- Keep each commit tied to one `To-do.md` task.

---
title: Git cheatsheet
---

## Squash merge

```shell
git merge --squash target

# 변경사항을 하나의 커밋으로 만들기
git commit -m "feat: Add www application
```

```shell
# 원격 저장소에 푸시
git push origin main

# 로컬 브랜치 삭제 (선택사항)
git branch -d add-www

# 원격 브랜치 삭제 (선택사항)
git push origin --delete add-www
```

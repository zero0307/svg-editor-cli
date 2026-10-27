# GitHub Actions 配置模板

CI 是 Continuous Integration，即持续集成。代码推送或创建 PR 后，服务器会自动安装依赖、构建并运行测试，检查修改是否引入问题。本实验没有要求必须启用 CI。

`github-actions.yml` 模板会在 Ubuntu/Windows、Node 22/24 上执行 `npm ci`、`npm run check` 和 `npm run verify:visual`。目前尚未启用，跨平台运行结果也未验证；这些命令可以先在本地手动执行。

本机 GitHub OAuth 凭据缺少 `workflow` 权限，向 `.github/workflows/ci.yml` 推送配置时遭到 GitHub 拒绝，因此模板暂存于此目录，不会触发 Actions。

取得工作流写权限后，将模板复制到 `.github/workflows/ci.yml` 并提交即可启用，应用源码和测试无需修改。工作流运行时只需要读取仓库内容。

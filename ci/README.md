# GitHub Actions 配置模板

CI 是 Continuous Integration（持续集成）：代码推送或提出 PR 后，由服务器自动安装依赖、构建并运行测试，帮助发现修改引入的问题。当前实验文档没有要求必须启用 CI，因此它是工程增强项，不是缺失的实验功能。

`github-actions.yml` 是可启用的 CI 模板，在 Ubuntu/Windows、Node 22/24 上执行 `npm ci`、`npm run check` 和 `npm run verify:visual`。未启用时，本地仍可手动执行这些检查；不能据此宣称其他系统已实际验收。

当前本机 GitHub OAuth 凭据没有 `workflow` 权限，GitHub 拒绝了向 `.github/workflows/ci.yml` 的推送。因此将配置放在这里，保证其他交付文件可以正常推送；该模板当前不会自动触发 Actions，跨平台结果尚未验证。

日后使用拥有工作流写权限的授权，将它复制到 `.github/workflows/ci.yml` 并提交即可启用。无需更改应用源码或测试。模板只需要仓库内容读取权限。

# GitHub Actions 配置模板

`github-actions.yml` 是可启用的 CI 模板，在 Ubuntu/Windows、Node 22/24 上执行 `npm ci` 和 `npm run check`。

当前本机 GitHub OAuth 凭据没有 `workflow` 权限，GitHub 拒绝了向 `.github/workflows/ci.yml` 的推送。因此将配置放在这里，保证其他交付文件可以正常推送；该模板当前不会自动触发 Actions，跨平台结果尚未验证。

日后使用拥有工作流写权限的授权，将它复制到 `.github/workflows/ci.yml` 并提交即可启用。无需更改应用源码或测试。模板只需要仓库内容读取权限。

# Phase 1 交付清单与演示步骤

本文件用于正式交作业前快速核对；完整架构、设计取舍和实际协作过程见 [README](README.md)。

## 已完成的工程交付

- TypeScript 严格模式、面向对象、一类一文件、Command 与 Composite。
- 六种内置图形、全部 19 条命令、唯一 id、有序树、失败原子性。
- 完整撤销重做与文档操作屏障，无默认 100 步截断。
- SVG 文件读写、自动补 id、中文与 XML 转义、原子替换文件。
- 常见嵌套平移和正等比缩放的导入归一化，覆盖课程背景示例。
- 架构图、依赖规则、变化点、真实过程记录、一致性自查和质量保证。
- 82 项回归测试通过；离线检查原始/归一化变换示例像素差为零。
- 分步 Git 历史和远程仓库；新交付以 final 标记，旧交付归档为 final-20261020。

## 从干净检出开始验证

需要 Node.js 22 或 24 与 npm。在仓库根目录执行：

```sh
npm ci
npm run check
npm run verify:visual
```

`check` 应显示 82 项测试通过，以及架构检查通过。视觉结果位于 `artifacts/visual/`；报告应显示 `differingChannels: 0`。本次保留的证据见 [visual-verification](visual-verification/README.md)。

## 三分钟功能演示

```sh
npm run cli -- --script examples/flowchart.commands
npm run cli -- --script examples/history.commands
npm run cli -- --script examples/transforms.commands
```

三个示例分别展示自顶向下创建层级、结构编辑与 undo/redo、外部嵌套 transform 读入并转为可编辑画布坐标。生成的 SVG 均可直接用浏览器打开。

交互演示可执行 `npm run cli` 后输入：

```text
init
create g node
create rect frame 20 30 160 60 #4a90d9 in node
create text label 40 65 "开始" in node
move node 50 0
undo
redo
tree
save demo.svg
undo
```

最后一条应报 `error: undo not allowed after io command`。失败命令不会退出交互，也不会污染文档或历史。

## 提交前由提交者核对

1. 确认课程平台的真实截止时间；所给需求文件没有注明日期。
2. 仓库目前为私有。按课程流程授权教师/助教访问，或提交课程要求的材料包。
3. 在课程平台填写仓库地址、final 标签和要求的身份信息；工程并未代填学号、姓名或代为提交。
4. 亲自阅读代码与过程记录，补充自己的真实反思，理解快照事务、组合递归和依赖方向。

浏览器原生检查此前被权限策略拒绝；本次用离线渲染完成图像比较和目视检查，未绕过该拒绝。GitHub Actions 只有配置模板，当前 OAuth 缺少 workflow 权限，未启用远程 CI；这不是本阶段提交要求中的必选项。

## 明确的范围限制

box、插件加载器和 GUI 不属于本阶段。任意 SVG 的旋转、不等比缩放、path、CSS、tspan、复杂坐标系和长度敏感扩展不在当前支持保证内；不支持的输入会明确拒绝。当前 SVG 子集与资源边界详见架构文档第 2 节。

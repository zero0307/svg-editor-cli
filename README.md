# SVG Editor CLI

高级软件开发 Lab1 Phase 1：使用 TypeScript、Command 和 Composite 模式实现的 SVG 命令行编辑器。

## 快速开始

需要 Node.js 22 或更新版本和 npm。在项目根目录执行：

```sh
npm ci
npm run cli
```

```text
svg> init 800 600
svg> create g node
svg> create rect frame 120 100 160 60 #4a90d9 in node
svg> create text label 155 135 "开始" in node
svg> move node 0 100
svg> undo
svg> tree
svg> save demo.svg
```

用浏览器打开 `demo.svg` 即可预览。使用 `help` 查看所有命令。交互模式通过 Ctrl+D（Unix）或 Ctrl+Z 后回车（Windows）退出。

## 示例与验证

```sh
npm run cli -- --script examples/flowchart.commands
npm run cli -- --script examples/history.commands
npm run cli -- --script examples/transforms.commands
npm run check
npm run test:coverage
npm run verify:visual
```

本地检查可直接运行；[GitHub Actions 模板](ci/README.md) 已准备，因当前 GitHub 授权缺少 workflow 权限尚未启用。

示例会生成 `examples/flowchart.svg` 和 `examples/history.svg`。构建后也可直接运行 `node dist/src/bootstrap/main.js`，通过标准输入传入命令，或使用 `--script "含空格的路径"`。脚本在错误后继续处理剩余行，出现错误时最终退出码为 1；全部成功为 0。

支持六种内置类型和全部 19 条课程命令；支持嵌套分组、完整编辑历史、SVG 读写、自动补 id、原子编辑和原子文件替换。`box` 属后续插件阶段。

导入器支持这六类元素构成的 SVG 子集，包括嵌套的 translate 和正等比 scale。导入时归一化为画布坐标，保留分组、字号与描边语义。暂不支持旋转、不等比缩放、CSS、path、tspan 和不同坐标系的 viewBox；不支持的结构明确报错并保留原文档。详见 [架构、过程记录与验收说明](doc/README.md)。

`npm run verify:visual` 通过本地 resvg-js 生成预览，并验证课程变换示例在导入前后的渲染像素一致，不需要浏览器或网络服务。[交付清单与演示步骤](doc/DELIVERY.md)列出了验收命令和正式提交事项。

## 文件导航

- [课程需求](phase_cli_1.md)
- [架构方案、设计决策、过程记录和质量保证](doc/README.md)
- [PlantUML 架构图](doc/architecture.puml)
- [两节点流程图脚本](examples/flowchart.commands)
- [分组和撤销示例](examples/history.commands)
- [嵌套变换导入示例](examples/transforms.commands)

本工程使用唯一运行时依赖 [@xmldom/xmldom](https://github.com/xmldom/xmldom) 解析和序列化 XML；测试使用 [Node.js 内置测试运行器](https://nodejs.org/docs/latest-v24.x/api/test.html)。

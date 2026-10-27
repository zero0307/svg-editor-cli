# SVG Editor CLI

高级软件开发 Lab1 Phase 1 作业，用 TypeScript 实现 SVG 命令行编辑。编辑操作采用 Command 模式，图形与分组采用 Composite 模式。

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

保存后，用浏览器打开 `demo.svg` 查看结果。输入 `help` 可查看全部命令；退出交互模式时，Unix 使用 Ctrl+D，Windows 使用 Ctrl+Z 后回车。

## 示例与验证

```sh
npm run cli -- --script examples/flowchart.commands
npm run cli -- --script examples/history.commands
npm run cli -- --script examples/transforms.commands
npm run check
npm run test:coverage
npm run verify:visual
```

上述检查可在本地运行。[GitHub Actions 模板](ci/README.md) 也已准备好，但当前 GitHub 授权缺少 workflow 权限，尚未启用。

流程图和历史示例会生成 `examples/flowchart.svg`、`examples/history.svg`。构建后，也可以运行 `node dist/src/bootstrap/main.js`，从标准输入读取命令，或用 `--script "含空格的路径"` 读取脚本。脚本遇到错误后会继续处理剩余行；只要出现过错误，退出码就是 1，全部成功则为 0。

目前已实现课程要求的六种内置类型和 19 条命令，包括嵌套分组、完整撤销/重做、SVG 读写和自动补 id。编辑失败时保留原文档，保存文件时采用原子替换。`box` 留待后续插件阶段实现。

SVG 导入范围限于这六类元素，支持嵌套的 translate 和正等比 scale。导入器会将坐标转换为画布坐标，同时保留分组、字号与描边的含义。旋转、不等比缩放、CSS、path、tspan 和不同坐标系的 viewBox 暂不支持，遇到这些结构会报错并保留原文档。具体约束见 [架构、过程记录与验收说明](doc/README.md)。

`npm run verify:visual` 使用本地 resvg-js 生成预览，比较课程变换示例在导入前后的渲染像素。该检查不需要浏览器或网络服务。[交付清单与演示步骤](doc/DELIVERY.md)列出了验收命令和提交前要处理的事项。

## 课程平台提交

课程平台要求上传一份包含 Git 仓库地址的 `README.md`，提交文件已放在 [doc/submission/README.md](doc/submission/README.md)。其中列出了仓库地址、final 标签、完整实验报告和运行方式。

## 文件导航

- [课程需求](phase_cli_1.md)
- [架构方案、设计决策、过程记录和质量保证](doc/README.md)
- [PlantUML 架构图](doc/architecture.puml)
- [两节点流程图脚本](examples/flowchart.commands)
- [分组和撤销示例](examples/history.commands)
- [嵌套变换导入示例](examples/transforms.commands)

运行时只依赖 [@xmldom/xmldom](https://github.com/xmldom/xmldom)，用于解析和序列化 XML。测试使用 [Node.js 内置测试运行器](https://nodejs.org/docs/latest-v24.x/api/test.html)。

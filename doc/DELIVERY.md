# Phase 1 交付清单与演示步骤

课程平台要求上传一份包含 Git 仓库地址的 `README.md`。提交用文件为 [submission/README.md](submission/README.md)，完整架构、设计取舍和 AI 协作记录仍保存在本目录的 [README](README.md) 中。

## 已完成的工程交付

- 代码使用 TypeScript 严格模式，按一类一文件组织，并实现 Command 与 Composite 模式。
- 六种内置图形和 19 条命令均已实现，id 唯一，分组保留子元素顺序。失败的编辑不会改变文档。
- 撤销/重做保留完整编辑历史，文档操作会设置历史屏障，没有默认 100 步截断。
- SVG 读写支持自动补 id、中文和 XML 转义；保存时以临时文件原子替换目标文件。
- SVG 导入支持嵌套平移和正等比缩放，课程背景中的变换示例已通过检查。
- 文档包含架构图、依赖规则、预期变化、协作记录、一致性自查和质量保证。
- 83 项回归测试通过；课程变换示例在导入归一化前后的离线渲染像素差为零。
- 代码有分步 Git 提交记录，并已推送远程仓库。当前交付使用 final 标签，历次交付版本保留归档标签。

## 按实验原文复核

| 原文要求                                                | 当前结论                                           |
| ------------------------------------------------------- | -------------------------------------------------- |
| TypeScript、面向对象、多态、封装、一类一文件            | 已实现，静态检查与源码抽查通过                     |
| Command、容器与叶子统一操作                             | 已实现 Command 与 Composite                        |
| 六种图形、全部命令、白名单、错误与历史语义              | 已实现；无参数 save 保持最近一次 read 的路径       |
| doc/README.md 的架构、过程、自查、质量保证，附 PlantUML | 已具备                                             |
| 分步 Git 历史、远程仓库、最终 final 标签                | 已具备，final 和交付包对应当前交付版本             |
| final 在截止时间前完成                                  | 无法核实：提供的文档未注明截止时间，需对照课程平台 |
| 教师访问与正式课程提交                                  | 已验证仓库匿名访问，课程平台尚未提交               |
| CI、box、插件加载、GUI                                  | CI 为可选检查；其余属于后续阶段                    |

## 从干净检出开始验证

需要 Node.js 22 或 24 与 npm。在仓库根目录执行：

```sh
npm ci
npm run check
npm run verify:visual
```

`check` 应显示 83 项测试通过，并通过架构检查。图像检查结果位于 `artifacts/visual/`，报告中的 `differingChannels` 应为 0。已保留的验收图像和报告见 [visual-verification](visual-verification/README.md)。

## 三分钟功能演示

```sh
npm run cli -- --script examples/flowchart.commands
npm run cli -- --script examples/history.commands
npm run cli -- --script examples/transforms.commands
```

三个示例依次演示如何创建层级结构、编辑分组并撤销/重做，以及将外部 SVG 中的嵌套 transform 转成可编辑的画布坐标。生成的 SVG 可直接用浏览器打开。

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

最后一条应报 `error: undo not allowed after io command`，因为 save 会设置历史屏障。报错后仍可继续输入命令，文档和历史保持原样。

## 提交前由提交者核对

1. 确认课程平台公布的截止时间；需求文件未注明日期。
2. 仓库已公开并验证匿名访问，教师或助教可通过提交文件中的链接查看代码、历史与实验报告。
3. 在课程平台上传 [submission/README.md](submission/README.md)。文件已包含仓库地址、final 标签和实验报告链接，目前尚未代为上传或提交。
4. 阅读代码与协作记录，确认能解释快照事务、组合递归和依赖方向。个人反思应按自己的实际理解补充。

浏览器原生检查因权限限制未能进行，图像比较和目视检查使用离线渲染完成。GitHub Actions 目前只有配置模板；由于 OAuth 缺少 workflow 权限，远程 CI 尚未启用。实验没有要求必须启用 CI。

## 支持范围

box、插件加载器和 GUI 留待后续阶段。当前导入器不支持旋转、不等比缩放、path、CSS、tspan、复杂坐标系和长度敏感扩展，遇到这些输入会报错。SVG 子集及资源限制见架构文档第 2 节。

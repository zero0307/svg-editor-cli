# 离线图像验收证据

2026-10-21 在 Windows / Node.js 24 下运行 `npm run verify:visual`，使用项目开发依赖 resvg-js 和本机 Microsoft YaHei 字体渲染图像。检查全程在本地完成，无需启动浏览器或网络服务器。

- [flowchart.png](flowchart.png)：目视检查了中文节点、颜色和连线。
- [history.png](history.png)：目视检查了分组编辑后的几何位置和文字。
- [transforms-original.png](transforms-original.png)：课程嵌套变换示例的原始渲染。
- [transforms-normalized.png](transforms-normalized.png)：导入归一化再保存后的渲染。
- [report.json](report.json)：源文件 SHA-256、图像尺寸与差异指标。

两张 400×200 的变换示例图逐像素一致，差异通道数和平均绝对差均为 0。这一结果只适用于当前样本；其他 SVG 或字体环境需要另行检查。

重新运行脚本时，生成的文件放在 `artifacts/visual/`，本目录中的验收快照保持不变。比较图像时，脚本会缓存 RGBA 缓冲区，避免重复通过原生接口复制像素。

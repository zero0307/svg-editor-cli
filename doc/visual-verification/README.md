# 离线图像验收证据

2026-10-21 在 Windows / Node.js 24 下执行 `npm run verify:visual`，使用项目开发依赖 resvg-js 和本机 Microsoft YaHei 字体进行离线检查；不启动浏览器或网络服务器。

- [flowchart.png](flowchart.png)：已查看中文节点、颜色和连线。
- [history.png](history.png)：已查看分组编辑后的几何位置和文字。
- [transforms-original.png](transforms-original.png)：课程嵌套变换示例的原始渲染。
- [transforms-normalized.png](transforms-normalized.png)：导入归一化再保存后的渲染。
- [report.json](report.json)：源文件 SHA-256、图像尺寸与差异指标。

本示例的两张 400×200 变换图像逐像素一致，差异通道数和平均绝对差均为 0。该结果验证本样本；不声称任意 SVG 或不同字体环境的图像都能逐像素一致。

重新生成的文件放在 `artifacts/visual/`，不会自动覆盖这里保留的验收快照。脚本比较使用一次缓存的 RGBA 缓冲区，不需要重复跨原生接口复制像素。

# SVG 编辑器：架构与开发记录

## 架构方案（初稿）

采用 TypeScript 严格模式和面向对象设计。领域对象封装几何与树结构；Command 封装编辑；使用工作副本和文档快照保证原子性与撤销。CLI、文件系统与 XML 解析均位于边界。

模块：`domain`（领域）、`application`（用例、命令和端口）、`cli`（文本交互）、`infrastructure`（SVG 与文件适配）、`bootstrap`（依赖装配）。依赖方向为 CLI → application → domain；infrastructure → application/domain；bootstrap 可依赖全部。domain 无外部依赖。

Command 为必需模式，Composite 统一叶子和容器操作。类型工厂、命令分发是规范允许的两个名称分派入口，记录为后续插件阶段的待重构项。暂不开发 box 和插件加载器。

## 过程记录

- 2026-10-20：读完课程需求，确认目录只有需求文档，无既有代码或仓库。先提交架构草案和工程骨架，再逐阶段实现。
- 初始 npm 使用 Program Files 下不可写的系统缓存；项目通过 `.npmrc` 使用本地缓存，不修改全局配置。

## 待明确的语义

跨父容器分组的落点、导入 SVG transform 的支持范围、历史屏障后的旧历史处理，需要在实现与测试中写明决策。

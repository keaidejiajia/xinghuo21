# AGENTS.md - 星火燎原项目协作规则

本文件是项目级工作记忆。后续任何 AI 助手、Codex、Claude 或自动化脚本进入本项目时，都必须先读这里，再动代码。

## 项目定位

星火燎原是 21 班班级操行评定系统，核心价值是稳定、可靠、保护数据。代码漂亮不是第一优先级，学生数据不丢、桌面版能用、网页版同步正常才是第一优先级。

技术栈：React + TypeScript + Vite。主题为暗色 OLED 风格，设计 tokens 在 `src/data/theme.ts`。样式主要是 inline style。桌面版通过本地 PowerShell 服务器读写 `data.json`，网页版托管在 Vercel，通过 serverless API 同步 GitHub `data` 分支中的 `data.json`。

## 一句话原则

**先本地桌面版吃透，再上线。**

不要把线上系统当试验田。任何功能调整、样式调整、数据逻辑调整，都先在桌面版完整测试，确认无误后再部署到 `xinghuo21.xin`。

## 数据安全原则

1. `data.json` 是项目最重要的文件，任何操作都不能随意覆盖、清空、格式破坏或用测试数据替换真实数据。
2. 真实数据包含学生、行为记录、配置、座位等多类 localStorage 快照。不要只保存一小段测试 JSON 到 `/api/save`，否则会覆盖整份云端数据。
3. 桌面版数据源：`C:\Users\11879\Desktop\星火燎原\data.json`。
4. 网页版数据源：GitHub 仓库 `keaidejiajia/xinghuo21` 的 `data` 分支中的 `data.json`。
5. GitHub `pages` 分支不再作为主要数据存储分支，不要让部署产物和数据文件混在同一分支里互相覆盖。
6. `api/load.js` 必须通过 GitHub Contents API 读取并 Base64 解码内容，避免 `raw.githubusercontent.com` 的 CORS、CDN 缓存和中文编码损坏问题。
7. `api/save.js` 写入 `data` 分支，提交前必须获取当前 SHA，遇到 409 冲突要重试。
8. `demo_user` 这类登录缓存不应覆盖云端共享数据。

## 桌面优先工作流

修改功能时按这个顺序：

1. 先读代码，确认现有模式，不做无关重构。
2. 小范围修改源码。
3. 运行类型检查：

```powershell
npx tsc --noEmit
```

4. 运行 Vite 构建：

```powershell
npx vite build
```

5. 同步桌面版构建产物到：

```text
C:\Users\11879\Desktop\星火燎原\
```

通常需要同步：

```text
dist/index.html
dist/assets/
```

6. 启动桌面版：双击 `C:\Users\11879\Desktop\星火燎原\星火燎原.bat`，或运行 `server.ps1`。本地端口为 `8421`。
7. 验证桌面版：

```text
http://localhost:8421
http://localhost:8421/api/load
http://localhost:8421/api/save
```

8. 在桌面版真实页面里测试功能：登记行为、刷新页面、检查学生数据、检查记录列表、检查 UI 是否错位。
9. 只有桌面版确认无误后，才允许部署线上版。

## publish.sh 注意事项

当前 `publish.sh` 不是纯桌面同步脚本。它会执行类型检查、构建、同步桌面版，并且会 `git push origin main`，从而触发 Vercel 自动部署。

因此：

- 如果只是想测试桌面版，不要随手运行 `bash publish.sh`，除非已经确认可以同步触发线上部署。
- 更稳妥的做法是先手动执行 `npx tsc --noEmit`、`npx vite build`，再只同步 `dist` 到桌面文件夹。
- 如果以后频繁本地测试，建议拆出一个单独脚本，例如 `publish-desktop.sh`，只负责构建和同步桌面版，不推送 GitHub。

## 线上部署工作流

桌面版测试通过后，再上线。推荐步骤：

1. 确认 git 工作区只包含本次相关改动，不要混入无关文件。
2. 提交到 GitHub `main` 分支，或直接运行：

```powershell
npx vercel deploy --prod --yes
```

3. 部署后验证 API：

```text
https://xinghuo21.xin/api/status
https://xinghuo21.xin/api/load
https://xinghuo21.xin/api/save
```

`/api/status` 应返回 JSON，并显示 `tokenSet: true`。`/api/load` 应返回完整 JSON，中文不能乱码。

4. 做跨浏览器同步测试：

- Edge 打开 `https://xinghuo21.xin` 登记一条不重要的测试行为。
- Chrome 打开同一网址并刷新。
- Chrome 能看到刚才的记录，才算同步链路通过。

5. 如果线上异常，先查 API 返回内容和 Vercel 部署版本，不要盲目改前端。

## Vercel 与部署限制

1. Vercel 免费额度是滚动 24 小时窗口，不是固定每天美东 0 点重置。
2. 不要频繁空提交、频繁试部署，容易打满每日部署额度。
3. 部署失败时，先看 build log 和 TypeScript 错误，别连环重试。
4. 严禁运行：

```powershell
npx vercel remove xinghuo21
```

这会删除整个 Vercel 项目，而不是删除单个历史部署。

5. 如需删除单个部署，必须确认命令目标是具体 deployment，且不要删除当前生产部署。
6. Vercel 项目应连接 GitHub 仓库 `keaidejiajia/xinghuo21`，Production Branch 为 `main`。
7. 环境变量 `GITHUB_TOKEN` 必须在 Vercel Production 中存在。不要把 token 写进源码或提交到仓库。

## API 约定

网页版依赖三个 Vercel 函数：

- `api/status.js`：诊断 `GITHUB_TOKEN` 是否存在。
- `api/load.js`：从 GitHub `data` 分支读取 `data.json`。
- `api/save.js`：把完整 localStorage 快照写入 GitHub `data` 分支。

重要细节：

- `/api/load` 不能返回 HTML；如果返回 HTML，说明 API 路由被 SPA fallback 或部署配置吞掉了。
- `/api/load` 不能走浏览器直接请求 GitHub raw，因为会遇到 CORS。
- `/api/load` 不要使用 `application/vnd.github.raw+json` 后直接 `text()` 处理中文，曾经导致中文乱码和 JSON parse 失败。
- `/api/save` 收到的是整份数据快照，不是增量补丁。

## UI 修改原则

1. 手机端优化优先解决真实体验问题：内容溢出、标签顶出屏幕、弹窗超宽、文字断行、按钮太小。
2. 不要做“看起来很炫但实际难用”的界面。这个系统是班主任日常使用的工具，扫描、登记、复查要快。
3. 卡片和列表里遇到“描述 + 右侧标签”结构，手机端要允许 `flexWrap: wrap`，避免把标签顶出屏幕。
4. 图表、弹窗、Dashboard 统计在手机端必须限制最大宽度和高度，避免横向溢出。
5. 改 UI 后必须同时看桌面宽屏和手机窄屏效果。

## 协作风格

1. 先诊断，再动手；先验证，再宣布修好。
2. 不要覆盖用户已有改动，不要随意回滚。
3. 修改范围要小，优先沿用现有代码风格。
4. 每次上线前至少完成：类型检查、构建、桌面版 smoke test、线上 API 验证。
5. 遇到数据问题，优先保护和恢复真实数据，而不是追求代码改得漂亮。
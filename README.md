# 拾日

拾日是一本可以在浏览器里打开的个人手账，有日历、天气、可分类的记录和一只会陪你说话的小猫。

[打开网页](https://iris-yixinxu.github.io/shiri-memo/) · [下载完整项目 ZIP](https://github.com/Iris-YixinXu/shiri-memo/archive/refs/heads/main.zip)

访客打开公开网页就可以写自己的日程。「今日安排」右上角的加号可以上传照片。访客的文字保存在当前浏览器，照片保存在该浏览器的 IndexedDB。分享网址不会分享日程。

点击小猫卡片的 **启用 Qwen3 对话**，浏览器会首次下载约 570–919 MB 的 Qwen3-0.6B 量化模型。支持 WebGPU 的设备可在浏览器里生成聊天回复、周报和每日寄语。快捷回复可以直接使用，聊天和周报推理在设备上完成。

想使用自己选择的供应商，可下载独立的 [拾日自选 API 版](https://github.com/Iris-YixinXu/shiri-memo-api)。

## 配置公开版的账号登录

账号上线前需要一个 [Supabase 项目](https://supabase.com/dashboard/projects)。

1. 在该项目的 SQL Editor 运行 [supabase/schema.sql](supabase/schema.sql)，创建按用户隔离的手账和私有照片存储。
2. 在 Supabase Authentication 的 URL Configuration 中，把 `https://iris-yixinxu.github.io/shiri-memo/` 配为 Site URL 和允许的重定向地址。启用 Email 登录并配置注册确认邮件。
3. 在 GitHub 的 [Actions 仓库变量](https://github.com/Iris-YixinXu/shiri-memo/settings/variables/actions) 设置 `SUPABASE_URL`（形如 `https://项目编号.supabase.co`）和 `SUPABASE_PUBLISHABLE_KEY`。填写可公开的 publishable key，或旧版 anon key。
4. 手动运行 [Publish 拾日](https://github.com/Iris-YixinXu/shiri-memo/actions/workflows/pages.yml)。完成后可用两个不同账号验证日程和照片互不可见。

登录后可跨浏览器使用同一账号的手账。空手账可以在登录对话框选择 **导入此浏览器记录**，导入前的访客记录仍可以在该浏览器上使用。公开版的 Qwen3 对话记录保存在当前浏览器，并按账号分开。

## 下载到自己的电脑使用

1. 安装 [Node.js](https://nodejs.org/en/download) 22 或更新版本。下载并解压项目 ZIP，或用 Git 克隆此仓库。
2. 在项目根目录的终端运行 `node worker/local.mjs`，也可以运行 `npm start`。启动后打开 [本机拾日](http://127.0.0.1:8766/)。
3. 首次启动会生成 `worker/.dev.vars`。用编辑器打开，在 `DEEPSEEK_API_KEY=` 的等号后填入你自己的 DeepSeek API Key。保存并刷新网页，即可在小猫卡片里自由聊天。每天首次打开本机版时，也会用同一把 Key 生成并缓存寄语。

程序仅监听本机的 `127.0.0.1`。没有 Key 时仍可使用日历、记录、照片和小猫的快捷回复。备忘录和照片由本机保存。主动发给小猫的聊天消息由 DeepSeek 处理。

| 文件或目录 | 用途 |
| --- | --- |
| `data/records.json` | 文字记录、计划、重点和照片索引，首次保存时生成。 |
| `data/chat-history.json` | 本机与小猫的对话，用于继续聊天和生成周报。 |
| `data/images/YYYY-MM-DD/` | 每条记录的照片原件，按记录日期建文件夹。 |
| `worker/.dev.vars` | 个人 DeepSeek API Key。 |
| `worker/cat-prompt.mjs` | 小猫实际使用的 Prompt，修改后重启本机程序。 |

在记录编辑页选择照片并保存，周报会按记录日期显示照片。也可以从周报的 **添加照片** 新建记录。备份时复制整个 `data/` 目录即可。Git 会忽略数据目录和密钥文件。网页版与本机版各自保存记录。

## 本周回顾

公开版启用 Qwen3 后，在「周报汇总」里点「让小猫总结」。小猫在当前浏览器读取所选周的记录和此浏览器为当前账号保存的对话。

配置自己的 DeepSeek API Key 后，在本机手账的 **本周回顾** 里选择一周，再在下方的 **周报汇总** 点击 **让小猫总结**。小猫会根据所选周的对话和手账，用两到四句话写一段回顾。生成时发给 DeepSeek 的资料包括所选周的对话摘录、事项标题、分类、日期、完成状态和心情统计。日记正文、笔记正文和照片保存在本机。小结显示在当前页面会话里。

本机对话从这一版开始保存。在聊天窗口点击 **清空** 可以删除本机保存的对话。公开网页的快捷回复不写入本机聊天历史。

## 项目文件

- [memo/](memo/) 是本机与 GitHub Pages 共用的网页。
- [worker/](worker/) 包含本机服务、DeepSeek 聊天接口和可以修改的 [小猫 Prompt](worker/cat-prompt.mjs)。
- [.github/workflows/pages.yml](.github/workflows/pages.yml) 发布网页与账号配置。

## 可选的云端聊天

需要从多台设备通过网址使用自己的 DeepSeek 聊天时，可把聊天接口部署到 [Cloudflare Workers](https://dash.cloudflare.com/?to=/:account/workers-and-pages)，并用自己设定的聊天口令控制访问。

1. 登录 Cloudflare。安装 Node.js 后，在仓库根目录执行下列命令部署 Worker。首次运行会要求授权 Wrangler。

   ```sh
   cd worker
   npx --yes wrangler@4 deploy
   ```

2. 在同一目录执行以下命令，在各自的交互提示里填值。

   ```sh
   npx --yes wrangler@4 secret put DEEPSEEK_API_KEY
   npx --yes wrangler@4 secret put CAT_ACCESS_CODE
   ```

   也可以在 Cloudflare 的 Worker 设置中打开 **Variables and Secrets**，把两项都选为 **Secret**。

   | 名称 | 填什么 |
   | --- | --- |
   | `DEEPSEEK_API_KEY` | DeepSeek 平台创建的 API Key。接口使用 `deepseek-flash`。 |
   | `CAT_ACCESS_CODE` | 你自设的一串 16–120 位口令。使用随机生成的英文字母、数字和符号，且不包含空格。把它发给你愿意开放聊天的人。 |

3. 把部署时显示的 HTTPS 网址加上 `/api/chat`，填进 [memo/chat-config.js](memo/chat-config.js) 的 `CAT_CHAT_ENDPOINT`。这个文件只填写公开的接口网址。提交到 `main` 后，GitHub Pages 会更新。
4. 打开网页，在小猫卡片里填聊天口令，发送一句测试消息。

以后修改小猫 Prompt 时，需要重新部署 Worker。只改网页时，提交到 GitHub 即可。

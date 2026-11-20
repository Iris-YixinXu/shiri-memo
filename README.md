# 拾日

一个放在 GitHub Pages 上的个人手账。日期、天气、备忘录和简笔画小猫都在同一页里。

[打开拾日](https://iris-yixinxu.github.io/shiri-memo/)

## 项目文件

- [memo/](memo/) 是 GitHub Pages 发布的网页。备忘录由访问者的浏览器保存。
- [worker/cat-prompt.mjs](worker/cat-prompt.mjs) 是小猫实际使用的 Prompt。可以在这里调整它的性格、称呼、语气示例和安慰方式。
- [worker/](worker/) 是小猫的聊天接口。它把用户发送的消息和当前对话的一小段历史交给 DeepSeek。前端不会读取手账内容来填充聊天。
- [.github/workflows/pages.yml](.github/workflows/pages.yml) 发布网页、准备每日寄语。每日寄语与聊天是独立功能。

## 启用小猫聊天

网页已留出聊天入口。需要部署 Worker、配置密钥，并将 Worker 网址填回网页。

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
4. 打开网页，点击 **和小猫聊天**，填聊天口令，发送一句测试消息。

以后修改小猫 Prompt 时，需要重新部署 Worker。只改网页时，提交到 GitHub 即可。

## 每日寄语的密钥

给每日寄语启用 DeepSeek 时，在 [GitHub 仓库的 Actions Secrets](https://github.com/Iris-YixinXu/shiri-memo/settings/secrets/actions) 添加 `DEEPSEEK_API_KEY`。这个设置只供每日发布流程使用，小猫聊天读取的是 Cloudflare 里的同名 Secret。

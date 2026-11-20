"use strict";

const catChatDialog = $("cat-chat-dialog");
const catChatForm = $("cat-chat-form");
const catChatLog = $("cat-chat-log");
const catChatInput = $("cat-chat-input");
const catChatCode = $("cat-chat-code");
const catChatGreeting = catChatLog.firstElementChild;
const catChatHistory = [];
let catChatUnlocked = false;
let catChatSending = false;

function chatEndpoint() {
  try {
    const url = new URL(CAT_CHAT_ENDPOINT);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol === "https:" || local) && !url.username && !url.password) return url;
  } catch {
    // The public site can run before a chat endpoint is configured.
  }
  return null;
}

function setChatStatus(text) {
  const status = $("cat-chat-status");
  status.textContent = text;
  status.hidden = !text;
}

function appendChatMessage(role, content) {
  const bubble = element("p", `chat-message ${role}`, content);
  bubble.setAttribute("aria-label", role === "user" ? "你" : "小猫");
  catChatLog.append(bubble);
  catChatLog.scrollTop = catChatLog.scrollHeight;
  return bubble;
}

function setChatSending(sending) {
  catChatSending = sending;
  $("cat-chat-send").textContent = sending ? "小猫在想…" : "发送";
  $("cat-chat-send").disabled = $("cat-chat-clear").disabled = sending;
  catChatInput.readOnly = catChatCode.readOnly = sending;
}

function chatRequestBody(message) {
  const messages = [...catChatHistory.slice(-10), message];
  const encoder = new TextEncoder();
  let body = JSON.stringify({ messages });
  while (encoder.encode(body).length > 48 * 1024 && messages.length > 1) {
    messages.splice(0, 2);
    body = JSON.stringify({ messages });
  }
  return body;
}

async function sendChat(event) {
  event.preventDefault();
  if (catChatSending) return;
  const endpoint = chatEndpoint();
  const content = catChatInput.value.trim();
  const accessCode = catChatCode.value.trim();
  if (!endpoint || !content) return;
  if (!/^[!-~]{16,120}$/.test(accessCode)) {
    setChatStatus("请输入站点管理员给你的聊天口令。");
    catChatCode.focus();
    return;
  }
  const message = { role: "user", content };
  const bubble = appendChatMessage(message.role, message.content);
  setChatStatus("");
  setChatSending(true);
  catChatInput.value = "";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessCode}` },
      body: chatRequestBody(message),
      signal: AbortSignal.timeout(28000),
      redirect: "error",
      cache: "no-store",
    });
    if (response.status === 401) {
      catChatUnlocked = false;
      $("cat-code-field").hidden = false;
      catChatCode.value = "";
      throw new Error("聊天口令有误，请重新输入。");
    }
    let errorMessage = "小猫暂时连不上，请稍后再试。";
    if (response.status === 429) errorMessage = "消息发得有点快，等一分钟再试喵。";
    if (response.status === 503) errorMessage = "聊天服务还需要完成配置。";
    if (!response.ok) throw new Error(errorMessage);
    const { reply } = await response.json();
    if (typeof reply !== "string" || !reply.trim()) throw new Error("这次没有收到小猫的回复，请再试一次。");
    catChatHistory.push(message, { role: "assistant", content: reply });
    appendChatMessage("assistant", reply);
    catChatUnlocked = true;
    $("cat-code-field").hidden = true;
  } catch (error) {
    bubble.remove();
    catChatInput.value = content;
    const knownError = error instanceof Error && !(error instanceof TypeError) &&
      !(error instanceof SyntaxError) && !(error instanceof DOMException);
    setChatStatus(knownError ? error.message : "小猫暂时连不上，请稍后再试。");
  } finally {
    setChatSending(false);
    if (catChatDialog.open) (catChatUnlocked ? catChatInput : catChatCode).focus();
  }
}

$("cat-chat-open").addEventListener("click", () => {
  const enabled = Boolean(chatEndpoint());
  catChatForm.hidden = !enabled;
  $("cat-chat-unavailable").hidden = enabled;
  catChatDialog.showModal();
  if (enabled && !catChatSending) (catChatUnlocked ? catChatInput : catChatCode).focus();
});
$("cat-chat-close").addEventListener("click", () => catChatDialog.close());
$("cat-chat-clear").addEventListener("click", () => {
  catChatHistory.length = 0;
  catChatLog.replaceChildren(catChatGreeting);
  catChatInput.value = "";
  setChatStatus("");
  catChatInput.focus();
});
catChatForm.addEventListener("submit", sendChat);

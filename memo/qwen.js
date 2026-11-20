"use strict";

const ShiriQwen = (() => {
  let worker;
  let loaded = false;
  let sequence = 0;
  const pending = new Map();
  const persona = "你是拾日的手账小猫，用简短温柔的中文陪主人聊两三句。先听懂对方，再给一个具体小提示。偶尔说‘喵喵’或‘喵’，不要过度撒娇或编造细节。";
  const keyFor = (owner) => `shiri.qwen-history.v1.${owner ?? "guest"}`;

  function turns(owner) {
    try {
      const value = JSON.parse(localStorage.getItem(keyFor(owner)));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function remember(owner, turn) {
    try {
      localStorage.setItem(keyFor(owner), JSON.stringify([...turns(owner), turn].slice(-160)));
    } catch {
      // The current conversation can continue even if the browser is out of storage.
    }
  }

  function recent(owner) {
    return turns(owner).slice(-5).flatMap(({ user, assistant }) => [
      { role: "user", content: user }, { role: "assistant", content: assistant },
    ]);
  }

  function request(action, data = {}, progress) {
    if (!worker) {
      worker = new Worker(new URL("./qwen-worker.js", document.baseURI), { type: "module" });
      worker.onmessage = ({ data }) => {
        const call = pending.get(data.id);
        if (!call) return;
        if (data.progress !== undefined) {
          call.progress?.(data.progress, data.file);
          return;
        }
        pending.delete(data.id);
        if (data.error) call.reject(new Error(data.error));
        else call.resolve(data.result);
      };
      worker.onerror = () => {
        for (const call of pending.values()) call.reject(new Error("浏览器里的 Qwen3 暂时无法运行。"));
        pending.clear();
        worker.terminate();
        worker = undefined;
        loaded = false;
        document.dispatchEvent(new Event("shiri:qwen-unavailable"));
      };
    }
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject, progress });
      worker.postMessage({ id, action, ...data });
    });
  }

  return {
    ready: () => loaded,
    async load(progress) {
      if (loaded) return;
      await request("load", {}, progress);
      loaded = true;
    },
    complete(messages, maxTokens = 144) {
      return request("reply", { messages, maxTokens });
    },
    chat(messages) {
      return request("reply", { messages: [{ role: "system", content: persona }, ...messages], maxTokens: 144 });
    },
    recap(owner, records, start, end) {
      const during = (day) => day >= start && day <= end;
      const planned = records.filter((record) => during(record.date));
      const done = records.filter((record) => during(record.done));
      const chats = turns(owner).filter((turn) => during(turn.date));
      if (!planned.length && !done.length && !chats.length) throw new Error("这一周还没有可总结的记录或对话。");
      const facts = {
        日期: [start, end],
        记录: planned.filter((record) => record.type !== "journal").slice(0, 9).map((record) => ({ 标题: record.title, 日期: record.date })),
        已完成: done.slice(0, 6).map((record) => record.title),
        已标记的心情: planned.filter((record) => record.type === "journal" && record.mood).slice(0, 10).map((record) => record.mood),
        对话: chats.slice(-7).map((turn) => ({ 日期: turn.date, 主人: turn.user.slice(0, 200), 小猫: turn.assistant.slice(0, 100) })),
      };
      return request("reply", {
        messages: [
          { role: "system", content: persona + " 根据手账数据回顾一周，写两到四句话。计划不代表已经发生，勿猜测情绪，只输出小结正文。" },
          { role: "user", content: JSON.stringify(facts) },
        ], maxTokens: 176,
      });
    },
    recent,
    remember,
    clear(owner) {
      localStorage.removeItem(keyFor(owner));
    },
  };
})();

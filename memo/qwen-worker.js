const modelId = "onnx-community/Qwen3-0.6B-ONNX";
let generator;
let queue = Promise.resolve();

async function load(id) {
  const adapter = await self.navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error("这个浏览器暂时无法使用 WebGPU，可以继续使用快捷回复。");
  const { env, pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1");
  env.allowLocalModels = false;
  env.backends.onnx.wasm.numThreads = 1;
  generator = await pipeline("text-generation", modelId, {
    device: "webgpu",
    dtype: adapter.features.has("shader-f16") ? "q4f16" : "q4",
    revision: "a7b503b1c3f7e98e8f80b6d565f47807a5007d9c",
    progress_callback(data) {
      if (data.status === "progress" && Number.isFinite(data.progress)) {
        self.postMessage({ id, progress: Math.round(data.progress), file: data.file });
      }
    },
  });
  return true;
}

async function reply(messages, maxTokens) {
  if (!generator) throw new Error("请先启用 Qwen3。");
  const prompt = generator.tokenizer.apply_chat_template(messages, {
    tokenize: false, add_generation_prompt: true, enable_thinking: false,
  });
  const result = await generator(prompt, { max_new_tokens: maxTokens, do_sample: false, return_full_text: false });
  const text = result[0]?.generated_text;
  const answer = (typeof text === "string" ? text : "").replace(/^[\s\S]*?<\/think>/, "").replace(/<think>[\s\S]*$/, "").trim();
  if (!answer) throw new Error("小猫这次没想到该说什么，请再试一次。");
  return answer;
}

self.addEventListener("message", ({ data }) => {
  queue = queue.then(async () => {
    const { id, action, messages, maxTokens } = data;
    try {
      const result = action === "load" ? await load(id) : await reply(messages, maxTokens);
      self.postMessage({ id, result });
    } catch (error) {
      self.postMessage({ id, error: action === "load" ?
        (error.message.includes("WebGPU") ? error.message : "Qwen3 加载失败，请检查网络、浏览器和可用空间后重试。") :
        "小猫这次没能生成回复，请再试一次。" });
    }
  });
});

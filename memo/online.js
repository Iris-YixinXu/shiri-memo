"use strict";

const ShiriOnline = (() => {
  const bucket = "shiri-private-photos";
  let client;
  let user = null;
  let observedId;

  function isPublicKey(key) {
    if (key.startsWith("sb_publishable_")) return true;
    try {
      const encoded = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(encoded)).role === "anon";
    } catch {
      return false;
    }
  }

  async function loadNotebook(owner) {
    const { data, error } = await client.from("shiri_notebooks").select("state,version").eq("owner_id", owner).maybeSingle();
    if (error) throw new Error("暂时无法读取账号手账。");
    return { state: data?.state ?? null, revision: data?.version ?? null };
  }

  async function saveNotebook(owner, state, revision) {
    const version = revision === null ? 1 : revision + 1;
    const table = client.from("shiri_notebooks");
    const statement = revision === null ?
      table.insert({ owner_id: owner, state, version }) :
      table.update({ state, version }).eq("owner_id", owner).eq("version", revision);
    const { data, error } = await statement.select("version").maybeSingle();
    if (error?.code === "23505" || (!error && !data)) throw new Error("这个账号的手账刚在另一处更新，请刷新后再保存。");
    if (error) throw new Error("暂时无法保存账号手账，内容还在编辑框里。");
    return { state, revision: data.version };
  }

  async function upload(owner, id, blob) {
    const { error } = await client.storage.from(bucket).upload(`${owner}/${id}`, blob, { contentType: blob.type });
    if (error) throw new Error("照片上传失败，请重试。");
  }

  async function download(owner, id) {
    const { data, error } = await client.storage.from(bucket).download(`${owner}/${id}`);
    if (error) throw new Error("照片暂时不可用。");
    return data;
  }

  function remove(owner, id) {
    return client.storage.from(bucket).remove([`${owner}/${id}`]);
  }

  async function start(onAccount, importGuest, canImport) {
    const dialog = $("account-dialog");
    const form = $("account-form");
    const status = $("account-status");
    const entry = $("account-open");
    const password = $("account-password");
    let working = false;
    const configured = /^https:\/\//.test(SHIRI_SUPABASE_URL) && isPublicKey(SHIRI_SUPABASE_PUBLISHABLE_KEY);
    entry.hidden = false;

    function render() {
      entry.textContent = user ? "我的账号" : "登录";
      form.hidden = !client || Boolean(user);
      $("account-actions").hidden = !user;
      $("account-import").hidden = !user || !canImport();
      status.textContent = user?.email ?? (client ? "登录后可在其他浏览器查看自己的手账。" :
        "账号服务尚未配置。你可以先使用此浏览器的手账。");
    }

    entry.addEventListener("click", () => { render(); dialog.showModal(); });
    $("account-close").addEventListener("click", () => dialog.close());
    render();
    if (!configured) return;
    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm");
      client = createClient(SHIRI_SUPABASE_URL, SHIRI_SUPABASE_PUBLISHABLE_KEY, { auth: { storageKey: "shiri.auth.v1" } });
      client.auth.onAuthStateChange((_, session) => {
        window.setTimeout(async () => {
          const next = session?.user ?? null;
          if ((next?.id ?? null) === observedId) return;
          observedId = next?.id ?? null;
          user = next;
          password.value = "";
          await onAccount(user);
          render();
        }, 0);
      });
      render();
    } catch {
      status.textContent = "账号服务暂时不可用。";
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (working) return;
      working = true;
      const credentials = { email: $("account-email").value.trim(), password: password.value };
      try {
        const register = event.submitter?.name === "register";
        const result = register ?
          await client.auth.signUp({ ...credentials, options: { emailRedirectTo: location.origin + location.pathname } }) :
          await client.auth.signInWithPassword(credentials);
        password.value = "";
        if (result.error) {
          status.textContent = register ? "暂时无法注册，请检查邮箱或稍后再试。" : "登录失败，请检查邮箱、密码或邮箱验证状态。";
        } else if (register && !result.data.session) {
          status.textContent = "请打开邮箱完成验证，然后登录。";
        } else {
          dialog.close();
        }
      } catch {
        status.textContent = "暂时无法连接账号服务，请重试。";
      } finally {
        working = false;
      }
    });
    $("account-logout").addEventListener("click", async () => {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) status.textContent = "暂时无法退出，请重试。";
      else dialog.close();
    });
    $("account-import").addEventListener("click", async () => {
      if (working || !canImport()) return;
      working = true;
      $("account-import").disabled = true;
      try {
        if (await importGuest()) {
          render();
          status.textContent = "已导入此浏览器的记录。";
        } else {
          status.textContent = "导入未完成。原来的浏览器记录仍可使用。";
        }
      } finally {
        working = false;
        $("account-import").disabled = false;
      }
    });
  }

  return { start, loadNotebook, saveNotebook, upload, download, remove };
})();

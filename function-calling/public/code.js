const chatMessages = document.getElementById("chatMessages");
const promptInput = document.getElementById("promptInput");
const sendButton = document.getElementById("sendButton");

function appendMessage(text, role, extraClass = "") {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${extraClass}`.trim();
  bubble.textContent = text;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return { row, bubble };
}

async function sendPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  appendMessage(prompt, "user");
  promptInput.value = "";

  const loading = appendMessage("考え中...", "ai", "loading");
  sendButton.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const text = data.text || data.error || "回答を取得できませんでした。";
    loading.bubble.textContent = text;
    loading.bubble.classList.remove("loading");
  } catch (error) {
    loading.bubble.textContent = `通信エラー: ${error.message}`;
    loading.bubble.classList.remove("loading");
  } finally {
    sendButton.disabled = false;
    promptInput.focus();
  }
}

sendButton.addEventListener("click", sendPrompt);
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPrompt();
  }
});

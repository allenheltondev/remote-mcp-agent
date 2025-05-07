import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: marshall({
        ":pk": "mcp",
        ":sk": "server#"
      }),
    }));

    const servers = response.Items.map((item) => unmarshall(item));

    const html = getHtml(servers);
    return {
      statusCode: 200,
      body: html,
      headers: {
        'Content-Type': 'text/html',
      },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 200,
      body: '<html><h1>Something went wrong :( </h1></html>',
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
};

const getHtml = (servers) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MCP Server Config</title>
  <style>
    :root {
      --primary: #2c7be5;
      --primary-hover: #1a68d1;
      --success: #2ecc71;
      --success-hover: #27ae60;
      --background: #f6f9fc;
      --border: #dce3eb;
      --text: #2d3748;
      --card: #ffffff;
      --shadow: rgba(0, 0, 0, 0.06);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--background);
      color: var(--text);
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: linear-gradient(90deg, var(--primary), #3b89f0);
      color: white;
      box-shadow: 0 3px 12px var(--shadow);
      padding: 1rem 0;
    }

    .topbar-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0;
    }

    .container-grid {
      display: grid;
      grid-template-columns: minmax(0, 480px) 1fr;
      gap: 2rem;
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 4px 12px var(--shadow);
      padding: 1rem;
    }

    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      font-size: 0.95rem;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 100;
    }

    .toast.show {
      opacity: 1;
    }

    .server {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 6px var(--shadow);
      overflow: hidden;
    }

    .server-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      cursor: pointer;
    }

    .server-title {
      font-weight: 500;
      font-size: 1rem;
    }

    .server-body {
      padding: 1rem;
      display: none;
    }

    .server.expanded .server-body {
      display: block;
    }

    label {
      font-weight: 500;
      display: block;
      margin-bottom: 0.25rem;
      margin-top: 0.5rem;
    }

    input[type="text"] {
      width: 100%;
      padding: 0.6rem;
      margin-bottom: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 1rem;
    }

    .header-pair {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .header-pair input {
      flex: 1;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    button {
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    button.primary {
      background: var(--primary);
      color: white;
    }

    button.primary:hover {
      background: var(--primary-hover);
    }

    button.secondary {
      background: #e0e6ed;
      color: var(--text);
    }

    button.secondary:hover {
      background: #d1dbe8;
    }

    .add-btn-wrapper {
      text-align: center;
      margin-top: 1rem;
    }

    .chat-panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 4px 12px var(--shadow);
      display: flex;
      flex-direction: column;
      padding: 1rem;
      height: fit-content;
    }

    .chat-panel h2 {
      margin-top: 0;
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .chat-log {
      border: 1px solid #ccc;
      border-radius: 6px;
      background: #f9f9f9;
      height: 300px;
      overflow-y: auto;
      padding: 0.75rem;
      font-size: 0.95rem;
      margin-bottom: 0.75rem;
    }

    #chat-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    #chat-input {
      flex: 1;
      padding: 0.5rem;
      font-size: 1rem;
      border-radius: 6px;
      border: 1px solid #ccc;
      margin: 0;
    }

    .typing-dots {
      display: none;
      height: 24px;
      align-items: center;
      justify-content: center;
      margin-left: 0.5rem;
    }

    .typing-dots span {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin: 0 2px;
      background-color: var(--primary);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    .typing-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    .typing-dots span:nth-child(3) {
      animation-delay: 0s;
    }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-content">
      <h1>Configure MCP Servers</h1>
    </div>
  </div>

  <div class="container-grid">
    <div class="card">
      <div id="server-list"></div>
      <div class="add-btn-wrapper">
        <button class="primary" onclick="addServer()">+ Add Server</button>
      </div>
    </div>

    <div class="chat-panel">
      <h2>Agent Chat</h2>
      <div id="chat-log" class="chat-log"></div>
      <form id="chat-form" onsubmit="sendMessage(event)">
        <input type="text" id="chat-input" placeholder="Ask the agent..." required />
        <button id="send-button" type="submit" class="primary">Send</button>
        <div id="typing-dots" class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </form>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const serverList = document.getElementById('server-list');
    const toast = document.getElementById('toast');
    const sessionId = crypto.randomUUID();

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function toggleServer(serverEl) {
      serverEl.classList.toggle('expanded');
    }

    function addServer(name = '', url = '', headers = []) {
      const serverEl = document.createElement('div');
      serverEl.className = 'server expanded';

      serverEl.innerHTML = \`
        <div class="server-header" onclick="toggleServer(this.parentElement)">
          <div class="server-title">\${name || 'New Server'}</div>
          <div>▾</div>
        </div>
        <div class="server-body">
          <label>Name</label>
          <input type="text" class="name" value="\${name}" />
          <label>URL</label>
          <input type="text" class="url" value="\${url}" />
          <div class="headers">
            <label>Headers</label>
            \${headers.map(h => \`
              <div class="header-pair">
                <input type="text" class="header-key" placeholder="Key" value="\${h.key ?? ''}" />
                <input type="text" class="header-value" placeholder="Value" value="\${h.value ?? ''}" />
                <button class="secondary" onclick="this.parentElement.remove()">✕</button>
              </div>
            \`).join('')}
          </div>
          <button class="secondary" onclick="addHeader(this)">+ Add Header</button>
          <div class="actions">
            <button class="primary" onclick="saveServer(this)">Save</button>
            <button class="secondary" onclick="deleteServer(this)">Delete</button>
          </div>
        </div>
      \`;

      serverList.appendChild(serverEl);
    }

    function addHeader(button) {
      const headersDiv = button.previousElementSibling;
      const pairDiv = document.createElement('div');
      pairDiv.className = 'header-pair';
      pairDiv.innerHTML = \`
        <input type="text" class="header-key" placeholder="Key" />
        <input type="text" class="header-value" placeholder="Value" />
        <button class="secondary" onclick="this.parentElement.remove()">✕</button>
      \`;
      headersDiv.appendChild(pairDiv);
    }

    function saveServer(button) {
      const server = button.closest('.server');
      const name = server.querySelector('.name').value;
      const url = server.querySelector('.url').value;
      const headers = Array.from(server.querySelectorAll('.header-pair')).map(pair => ({
        key: pair.querySelector('.header-key').value,
        value: pair.querySelector('.header-value').value
      }));

      fetch('./servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, headers })
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save');
        showToast(\`Saved \${name}\`);
      })
      .catch(err => {
        console.error(err);
        showToast('Save failed.');
      });
    }

    function deleteServer(button) {
      const server = button.closest('.server');
      const name = server.querySelector('.name').value;

      if (!name) {
        showToast('Name required for delete');
        return;
      }

      fetch(\`./servers/\${encodeURIComponent(name)}\`, {
        method: 'DELETE'
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        showToast(\`Deleted \${name}\`);
        server.remove();
      })
      .catch(err => {
        console.error(err);
        showToast('Delete failed.');
      });
    }

    function sendMessage(event) {
      event.preventDefault();
      const input = document.getElementById('chat-input');
      const log = document.getElementById('chat-log');
      const message = input.value.trim();
      if (!message) return;

      const sendBtn = document.getElementById('send-button');
      const dots = document.getElementById('typing-dots');
      sendBtn.style.display = 'none';
      dots.style.display = 'flex';

      const userEntry = document.createElement('div');
      userEntry.textContent = "You: " + message;
      log.appendChild(userEntry);
      input.value = '';
      log.scrollTop = log.scrollHeight;

      fetch('./agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ message })
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to send message");
        return res.json();
      })
      .then(data => {
        const agentEntry = document.createElement('div');
        agentEntry.textContent = "Agent: " + (data.message || "[no response]");
        log.appendChild(agentEntry);
        log.scrollTop = log.scrollHeight;
      })
      .catch(err => {
        console.error(err);
        showToast("Failed to contact agent.");
      })
      .finally(() => {
        sendBtn.style.display = 'inline-block';
        dots.style.display = 'none';
      });
    }


    const servers = ${JSON.stringify(servers)};
    servers.forEach(({ sk, url, headers = [] }) => {
      const name = sk.split('#')[1];
      addServer(name, url, headers);
    });
  </script>
</body>
</html>`;
};

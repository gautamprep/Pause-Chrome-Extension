
(() => {
  if (window.__pauseInjected) return;
  window.__pauseInjected = true;

  const MODAL_ID = "pause-intent-backdrop";

  function getDomain() {
    const host = location.hostname.replace(/^www\./, "");
    const p = host.split(".");
    return p.slice(-2).join(".");
  }
  const DOMAIN = getDomain();

  const syncGet = k => new Promise(r => chrome.storage.sync.get(k, r));
  const syncSet = o => new Promise(r => chrome.storage.sync.set(o, r));

  async function shouldShow() {
    console.log("[Pause] Checking if modal should show...");
    const d = await syncGet(["promptFrequency", "monitoredSites", "mutedToday", "lastPromptPerDomain"]);
    console.log("[Pause] Storage data:", d);
    console.log("[Pause] Current domain:", DOMAIN);

    const freq = d.promptFrequency || "every";
    const monitored = (d.monitoredSites || {})[DOMAIN] ?? false;

    console.log("[Pause] Frequency:", freq);
    console.log("[Pause] Is monitored:", monitored);
    console.log("[Pause] Is muted:", d.mutedToday);

    if (!monitored || d.mutedToday) {
      console.log("[Pause] ❌ Not showing - monitored=", monitored, "muted=", d.mutedToday);
      return false;
    }

    const lastEntry = (d.lastPromptPerDomain || {})[DOMAIN];
    // lastEntry can be a number (timestamp) or object {timestamp, duration}
    // Backward compatibility: if number, treat duration as 0
    const lastTs = (typeof lastEntry === 'object') ? lastEntry.timestamp : (lastEntry || 0);
    const duration = (typeof lastEntry === 'object') ? lastEntry.duration : 0;

    const elapsedMins = (Date.now() - lastTs) / 60000;

    console.log("[Pause] Last shown:", lastTs ? new Date(lastTs).toLocaleString() : "never");
    console.log("[Pause] Duration:", duration, "mins");
    console.log("[Pause] Elapsed:", elapsedMins.toFixed(1), "mins");

    // If we are still within the "unlocked" duration, don't show
    if (elapsedMins < duration) {
      console.log("[Pause] ❌ Not showing - still within unlock duration");
      return false;
    }

    if (freq === "every") {
      console.log("[Pause] ✅ Showing modal - frequency is 'every'");
      return true;
    }
    if (freq === "hourly") return elapsedMins >= 60;
    if (freq === "daily") return elapsedMins >= 1440;
    return false;
  }

  function removeModal() { document.getElementById(MODAL_ID)?.remove(); }

  async function markShown(durationMinutes = 0) {
    const d = await syncGet(["lastPromptPerDomain"]);
    const obj = d.lastPromptPerDomain || {};
    obj[DOMAIN] = {
      timestamp: Date.now(),
      duration: durationMinutes
    };
    await syncSet({ lastPromptPerDomain: obj });
  }

  function showModal() {
    removeModal();
    const el = document.createElement("div");
    el.id = MODAL_ID;
    el.innerHTML = `
      <div id="pause-intent-modal">
        <div class="logo-circle" style="width: 64px; height: 64px; margin: 0 auto 16px;">
          <svg width="100%" height="100%" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="128" height="128" rx="32" fill="url(#paint0_linear)"/>
            <path d="M56 88V40H76C84.8366 40 92 47.1634 92 56C92 64.8366 84.8366 72 76 72H68V88H56Z" fill="white"/>
            <defs>
              <linearGradient id="paint0_linear" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
                <stop stop-color="#007AFF"/>
                <stop offset="1" stop-color="#5856D6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h3>What brings you here?</h3>
        <div id="chips">
          <span class="pause-chip" data-v="Watch one specific thing">Watch one specific thing</span>
          <span class="pause-chip" data-v="Study something">Study something</span>
          <span class="pause-chip" data-v="Short break">Short break</span>
        </div>
        <input id="pause-intent-input" placeholder="I’m here to..." />
        
        <div id="timerSection">
          <span class="timerBtn" data-time="10">10m</span>
          <span class="timerBtn" data-time="20">20m</span>
          <span class="timerBtn" data-time="30">30m</span>
          <span class="timerBtn custom">Custom</span>
        </div>
        <button id="startBtn">Start</button>
        <div id="mute">Mute today</div>
      </div>
    `;
    document.body.appendChild(el);

    const chips = el.querySelectorAll(".pause-chip");
    const input = el.querySelector("#pause-intent-input");

    const timerBtns = el.querySelectorAll(".timerBtn");
    let selectedMinutes = null;
    timerBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        timerBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (btn.classList.contains("custom")) {
          const c = prompt("Enter minutes:");
          if (c && !isNaN(c)) {
            selectedMinutes = Number(c);
            btn.textContent = c + "m";
          }
        } else {
          selectedMinutes = Number(btn.dataset.time);
        }
        chrome.storage.sync.set({ pauseTimer: selectedMinutes });
      });
    });
    chips.forEach(c => {
      c.onclick = () => {
        chips.forEach(x => x.classList.remove("selected"));
        c.classList.add("selected");
        input.value = c.dataset.v;
      };
    });

    el.querySelector("#startBtn").onclick = async () => {
      try {
        const btn = el.querySelector("#startBtn");
        btn.textContent = "Starting...";
        btn.style.opacity = "0.7";

        const reason = input.value.trim();
        console.log("[Pause] Start clicked. Minutes:", selectedMinutes, "Reason:", reason);

        if (selectedMinutes) {
          try {
            chrome.runtime.sendMessage({
              action: "createAlarm",
              minutes: selectedMinutes,
              reason: reason || "Browse"
            });
          } catch (e) {
            console.error("[Pause] Failed to send message:", e);
            // If extension context invalidated, we must alert user
            if (e.message.includes("Extension context invalidated")) {
              alert("Please reload the page to fix the extension connection.");
              return;
            }
          }
        }

        await markShown(selectedMinutes || 1);
      } catch (e) {
        console.error("[Pause] Error in start handler:", e);
      } finally {
        removeModal();
      }
    };
    el.querySelector("#mute").onclick = () => {
      syncSet({ mutedToday: true }); removeModal();
    };
  }

  async function check() { if (await shouldShow()) showModal(); }

  // Initial
  check();

  // SPA navigation
  let last = location.href;
  new MutationObserver(() => {
    if (location.href !== last) {
      last = location.href;
      check();
    }
  }).observe(document, { childList: true, subtree: true });

  // Timer expiration modal
  function showTimerExpiredModal(reason = "") {
    removeModal();
    const el = document.createElement("div");
    el.id = MODAL_ID;
    el.innerHTML = `
      <div id="pause-intent-modal">
        <h3>⏰ Time's up!</h3>
        ${reason ? `<p class="timer-message">Reason: ${reason}</p>` : `<p class="timer-message">Your browsing session has ended.</p>`}
        <button id="continueBtn" class="timer-continue-btn">Continue Browsing</button>
        <button id="breakBtn" class="timer-break-btn">Take a Break</button>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#continueBtn").onclick = () => {
      removeModal();
      showModal(); // Show the intent modal again
    };

    el.querySelector("#breakBtn").onclick = () => {
      // Ask background to open new tab and close this one
      chrome.runtime.sendMessage({ action: "takeBreak" });
    };
  }

  // Listen for timer expiration messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showTimerExpired") {
      showTimerExpiredModal(request.reason);
    }
  });
})();

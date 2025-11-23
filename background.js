chrome.runtime.onInstalled.addListener((details) => {
  const defaults = {
    promptFrequency: "every",
    monitoredSites: {
      "youtube.com": true,
      "instagram.com": true,
      "facebook.com": true,
      "linkedin.com": false
    },
    mutedToday: false,
    lastPromptPerDomain: {}
  };

  chrome.storage.sync.get(null, (data) => {
    // Merge defaults with existing data, but defaults take precedence for missing keys
    const merged = Object.assign({}, defaults, data);
    chrome.storage.sync.set(merged, () => {
      console.log("Pause extension initialized with defaults");
    });
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: "onboarding.html" });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createAlarm" && request.minutes) {
    chrome.alarms.create("pauseTimer", { delayInMinutes: request.minutes });

    // Store which domain set the timer and the reason
    if (sender.tab && sender.url) {
      const url = new URL(sender.url);
      const domain = url.hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
      chrome.storage.local.set({
        timerDomain: domain,
        timerTabId: sender.tab.id,
        timerReason: request.reason || "Browse"
      });
    }
  }

  if (request.action === "takeBreak" && sender.tab) {
    // Open a new tab (Chrome's default new tab page)
    chrome.tabs.create({}, () => {
      // Then close the current tab
      chrome.tabs.remove(sender.tab.id);
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pauseTimer") {
    // Always show system notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
      title: "Time's up!",
      message: "Your pause timer has finished. The modal will appear on your next visit.",
      priority: 2
    });

    // Get the domain and reason that set the timer
    chrome.storage.local.get(["timerDomain", "timerReason"], (result) => {
      if (result.timerDomain) {
        // Send message to all tabs on the same domain
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url) {
              const url = new URL(tab.url);
              const domain = url.hostname.replace(/^www\./, "").split(".").slice(-2).join(".");

              // Only send modal message if on the same domain
              if (domain === result.timerDomain) {
                chrome.tabs.sendMessage(tab.id, {
                  action: "showTimerExpired",
                  reason: result.timerReason || "Browse"
                }).catch(() => {
                  // Ignore errors if content script not loaded
                });
              }
            }
          });
        });
      }
    });

    // Clear all unlock durations so modal will show on next visit
    chrome.storage.sync.set({ lastPromptPerDomain: {} }, () => {
      console.log("Timer expired - unlock status cleared");
    });
  }
});

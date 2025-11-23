// INSTRUCTIONS: 
// 1. Right-click the Pause extension icon
// 2. Select "Inspect popup"
// 3. Go to the Console tab
// 4. Paste this entire code and press Enter
// 5. Close the popup
// 6. Reload the extension in chrome://extensions
// 7. Visit YouTube

chrome.storage.sync.clear(() => {
    const defaults = {
        promptFrequency: "every",
        monitoredSites: {
            "youtube.com": true,
            "instagram.com": true,
            "twitter.com": true,
            "x.com": true,
            "facebook.com": true,
            "reddit.com": true,
            "tiktok.com": true,
            "linkedin.com": false
        },
        mutedToday: false,
        lastPromptPerDomain: {}
    };

    chrome.storage.sync.set(defaults, () => {
        console.log("✅ Extension reset complete!");
        console.log("Next steps:");
        console.log("1. Close this popup");
        console.log("2. Reload the extension in chrome://extensions");
        console.log("3. Visit youtube.com");
    });
});

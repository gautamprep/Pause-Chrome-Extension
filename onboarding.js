document.addEventListener("DOMContentLoaded", () => {
    // --- Get Started Button Logic ---
    const startBtn = document.getElementById('start');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // You could add a tutorial or configuration steps here
            // For now, just close the tab or show a success message
            alert("You're all set! Visit a distracting site to see Pause in action.");
        });
    }

    // --- Settings Logic (Copied from popup.js) ---
    const freqDiv = document.getElementById("freq");
    const muteBtn = document.getElementById("mute");
    const muteIcon = document.getElementById("muteIcon");
    const muteText = document.getElementById("muteText");
    const sitesDiv = document.getElementById("sites");
    const newSiteInput = document.getElementById("newSiteInput");
    const addSiteBtn = document.getElementById("addSiteBtn");

    const freqs = ["every", "hourly", "daily"];

    const defaultSites = [
        { key: "youtube.com", label: "YouTube" },
        { key: "facebook.com", label: "Facebook" },
        { key: "instagram.com", label: "Instagram" },
        { key: "linkedin.com", label: "LinkedIn" }
    ];

    function updateMuteButton(isMuted) {
        if (isMuted) {
            muteText.textContent = "Unmute";
            muteIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
        <path d="M22 9l-6 6"></path>
        <path d="M16 9l6 6"></path>
      `;
        } else {
            muteText.textContent = "Mute for Today";
            muteIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
        }
    }

    function renderSites(monitoredSites, customSites) {
        sitesDiv.innerHTML = "";

        // Merge defaults and custom sites
        const allSites = [
            ...defaultSites.map(s => ({ ...s, isCustom: false })),
            ...customSites.map(s => ({ key: s, label: s, isCustom: true }))
        ];

        allSites.forEach(site => {
            const row = document.createElement("div");
            row.className = "site-row";

            const label = document.createElement("span");
            label.className = "site-label";
            label.textContent = site.label;

            const rightDiv = document.createElement("div");
            rightDiv.style.display = "flex";
            rightDiv.style.alignItems = "center";

            const toggle = document.createElement("label");
            toggle.className = "toggle-switch";

            const input = document.createElement("input");
            input.type = "checkbox";
            // Default sites default to true (or whatever is in storage), custom sites default to true
            input.checked = monitoredSites[site.key] ?? (site.isCustom ? true : false);

            const slider = document.createElement("span");
            slider.className = "toggle-slider";

            input.addEventListener("change", () => {
                chrome.storage.sync.get(["monitoredSites"], result => {
                    const sites = result.monitoredSites || {};
                    sites[site.key] = input.checked;
                    chrome.storage.sync.set({ monitoredSites: sites });
                });
            });

            toggle.appendChild(input);
            toggle.appendChild(slider);
            rightDiv.appendChild(toggle);

            if (site.isCustom) {
                const removeBtn = document.createElement("button");
                removeBtn.className = "remove-site-btn";
                removeBtn.innerHTML = "&times;";
                removeBtn.title = "Remove website";
                removeBtn.onclick = () => {
                    removeCustomSite(site.key);
                };
                rightDiv.appendChild(removeBtn);
            }

            row.appendChild(label);
            row.appendChild(rightDiv);
            sitesDiv.appendChild(row);
        });
    }

    function addCustomSite() {
        const site = newSiteInput.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

        if (!site) return;

        // Simple domain validation
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,10}$/;
        if (!domainRegex.test(site)) {
            alert("Please enter a valid domain (e.g., twitter.com)");
            return;
        }

        chrome.storage.sync.get(["customSites", "monitoredSites"], data => {
            const customSites = data.customSites || [];
            const monitoredSites = data.monitoredSites || {};

            if (customSites.length >= 5) {
                alert("You can only add up to 5 custom websites.");
                return;
            }

            if (customSites.includes(site) || defaultSites.some(s => s.key === site)) {
                alert("This website is already in the list.");
                return;
            }

            customSites.push(site);
            monitoredSites[site] = true; // Enable by default

            chrome.storage.sync.set({ customSites, monitoredSites }, () => {
                newSiteInput.value = "";
                renderSites(monitoredSites, customSites);
            });
        });
    }

    function removeCustomSite(site) {
        chrome.storage.sync.get(["customSites", "monitoredSites"], data => {
            const customSites = data.customSites || [];
            const monitoredSites = data.monitoredSites || {};

            const newCustomSites = customSites.filter(s => s !== site);
            delete monitoredSites[site];

            chrome.storage.sync.set({ customSites: newCustomSites, monitoredSites }, () => {
                renderSites(monitoredSites, newCustomSites);
            });
        });
    }

    if (addSiteBtn) {
        addSiteBtn.onclick = addCustomSite;
    }

    // Allow Enter key to add site
    if (newSiteInput) {
        newSiteInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                addCustomSite();
            }
        });
    }

    chrome.storage.sync.get(null, data => {
        // Frequency buttons
        freqs.forEach(f => {
            const b = document.createElement("button");
            b.textContent = f;
            b.className = "freqBtn" + (data.promptFrequency === f ? " sel" : "");
            b.onclick = () => {
                chrome.storage.sync.set({ promptFrequency: f });
                document.querySelectorAll(".freqBtn").forEach(x => x.classList.remove("sel"));
                b.classList.add("sel");
            };
            freqDiv.appendChild(b);
        });

        // Mute button state
        updateMuteButton(data.mutedToday || false);

        // Render sites
        renderSites(data.monitoredSites || {}, data.customSites || []);
    });

    // Mute button click handler
    if (muteBtn) {
        muteBtn.onclick = () => {
            chrome.storage.sync.get(["mutedToday"], data => {
                const newMuteState = !data.mutedToday;
                chrome.storage.sync.set({ mutedToday: newMuteState });
                updateMuteButton(newMuteState);
            });
        };
    }

});

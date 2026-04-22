(function () {
    const STORAGE_KEY = "vegfit-planner-v1";

    function readState() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch {
            return {};
        }
    }

    function savePanelOrder() {
        const state = readState();
        state.panelOrder = Array.from(document.querySelectorAll(".movable-panel")).map((panel) => panel.dataset.panel);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function movePanel(panel, direction) {
        const content = document.querySelector(".content");
        const panels = Array.from(content.querySelectorAll(".movable-panel"));
        const index = panels.indexOf(panel);
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= panels.length) return;

        if (direction < 0) {
            content.insertBefore(panel, panels[targetIndex]);
        } else {
            content.insertBefore(panels[targetIndex], panel);
        }
        savePanelOrder();
    }

    function addMoveControls() {
        document.querySelectorAll(".movable-panel").forEach((panel) => {
            if (panel.querySelector(".mobile-move")) return;
            const controls = document.createElement("div");
            controls.className = "mobile-move";
            controls.innerHTML = [
                '<button class="move-button" type="button" data-move="-1">Move up</button>',
                '<button class="move-button" type="button" data-move="1">Move down</button>'
            ].join("");
            controls.addEventListener("click", (event) => {
                const button = event.target.closest("[data-move]");
                if (!button) return;
                movePanel(panel, Number(button.dataset.move));
            });
            panel.prepend(controls);
        });
    }

    function encodeState() {
        return btoa(unescape(encodeURIComponent(JSON.stringify(readState()))));
    }

    function fixShareButton() {
        const button = document.getElementById("sharePlanBtn");
        if (!button) return;
        button.addEventListener("click", async (event) => {
            if (window.location.protocol === "file:") {
                event.preventDefault();
                event.stopImmediatePropagation();
                alert("Open the phone URL first. File links from this computer cannot open on your phone.");
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            const shareUrl = `${window.location.href.split("#")[0]}#data=${encodeState()}`;
            if (navigator.share) {
                await navigator.share({ title: "VegFit Planner", text: "Open this to import my VegFit plan.", url: shareUrl });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                button.textContent = "Link copied";
                setTimeout(() => button.textContent = "Share to phone", 1200);
            }
        }, true);
    }

    addMoveControls();
    fixShareButton();
})();

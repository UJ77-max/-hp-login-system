const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core", "Quads", "Hamstrings", "Glutes", "Calves"];
const STORAGE_KEY = "vegfit-planner-v1";

const defaults = {
    profile: {
        weight: 70,
        height: 172,
        age: 25,
        waist: 82,
        goal: "recomp",
        dietType: "vegEgg",
        gymStart: "18:30",
        gymDuration: 75
    },
    logs: {},
    panelOrder: ["metrics", "meals", "gym", "diet", "recovery", "progress"]
};

const state = loadState();

const $ = (id) => document.getElementById(id);

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaults);

    try {
        return { ...structuredClone(defaults), ...JSON.parse(saved) };
    } catch {
        return structuredClone(defaults);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function encodeState() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function decodeState(value) {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
}

function applySharedStateFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith("#data=")) return;

    try {
        const shared = decodeState(hash.slice(6));
        Object.assign(state, { ...structuredClone(defaults), ...shared });
        saveState();
        history.replaceState(null, "", window.location.pathname);
    } catch {
        alert("Could not import shared plan link.");
    }
}

function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function formatDateLabel() {
    return new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short"
    }).format(new Date());
}

function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function formatTime24(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatTime(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours24 = Math.floor(normalized / 60);
    const mins = normalized % 60;
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function proteinMultiplier(goal) {
    if (goal === "muscle") return 1.8;
    if (goal === "fatloss") return 1.7;
    if (goal === "maintain") return 1.4;
    return 1.6;
}

function calorieTarget(profile) {
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    const base = 22 * profile.weight * 24;
    const active = base * 1.45;
    const goalAdjust = {
        muscle: 250,
        fatloss: -350,
        maintain: 0,
        recomp: -100
    }[profile.goal];
    return {
        calories: Math.round(active + goalAdjust),
        bmi: bmi.toFixed(1)
    };
}

function getTargets() {
    const profile = state.profile;
    const protein = Math.round(profile.weight * proteinMultiplier(profile.goal));
    const calories = calorieTarget(profile);
    return { protein, ...calories };
}

function getWeekDates() {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return todayKey(date);
    });
}

function weeklyLogs() {
    const keys = new Set(getWeekDates());
    return Object.entries(state.logs)
        .filter(([date]) => keys.has(date))
        .map(([date, log]) => ({ date, ...log }));
}

function trainedMusclesThisWeek() {
    const trained = new Set();
    weeklyLogs().forEach((log) => {
        (log.muscles || []).forEach((muscle) => trained.add(muscle));
    });
    return trained;
}

function fatigueScore() {
    const logs = weeklyLogs();
    if (!logs.length) return 0;

    const effortLoad = logs.reduce((sum, log) => sum + Number(log.effort || 0), 0);
    const lowSleepCount = logs.filter((log) => Number(log.sleep || 0) < 6.5).length;
    const consecutiveDays = getRecentTrainingStreak();
    return clamp(Math.round((effortLoad / 70) * 70 + lowSleepCount * 8 + Math.max(0, consecutiveDays - 3) * 8), 0, 100);
}

function getRecentTrainingStreak() {
    let streak = 0;
    const date = new Date();
    for (let i = 0; i < 7; i += 1) {
        const key = todayKey(date);
        const log = state.logs[key];
        if (!log || log.workoutType === "rest") break;
        streak += 1;
        date.setDate(date.getDate() - 1);
    }
    return streak;
}

function fatigueLabel(score) {
    if (score >= 75) return "High fatigue: use recovery or light training";
    if (score >= 50) return "Medium fatigue: avoid max effort";
    return "Fresh enough for planned training";
}

function mealPlan() {
    const { protein } = getTargets();
    const start = parseTime(state.profile.gymStart);
    const end = start + Number(state.profile.gymDuration || 75);
    const perMeal = Math.round(protein / 4);

    return [
        {
            time: formatTime(start - 150),
            sortTime: formatTime24(start - 150),
            title: "Pre-gym meal",
            text: `${perMeal}g protein target. Roti/rice + dal, curd, paneer/tofu, fruit. Keep it easy to digest.`
        },
        {
            time: formatTime(start - 35),
            sortTime: formatTime24(start - 35),
            title: "Small boost",
            text: "Banana, dates, black coffee, or lemon water. Skip heavy fats right before lifting."
        },
        {
            time: formatTime(end),
            sortTime: formatTime24(end),
            title: "Gym ends",
            text: "Hydrate, cool down, and log muscles trained before you leave."
        },
        {
            time: formatTime(end + 35),
            sortTime: formatTime24(end + 35),
            title: "Post-gym food",
            text: `${perMeal}g protein target with carbs. Paneer/tofu bowl, dal-rice, curd, sprouts, or eggs if enabled.`
        },
        {
            time: formatTime(end + 150),
            sortTime: formatTime24(end + 150),
            title: "Dinner",
            text: "Whole grains, vegetables, lentils/beans, dairy or soy, and a small healthy fat source."
        }
    ];
}

function recoveryPlan() {
    const fatigue = fatigueScore();
    const today = state.logs[todayKey()];
    const soreness = Number(today?.soreness || 0);
    const sleep = Number(today?.sleep || 7);
    const score = clamp(100 - fatigue - soreness * 3 + Math.max(0, sleep - 7) * 4, 0, 100);

    let action = "Train normally, but warm up well and keep form strict.";
    if (score < 45) action = "Take rest, walk 20-30 minutes, stretch, and sleep earlier.";
    else if (score < 70) action = "Do light technique work, mobility, or avoid the sore muscle group.";

    return [
        ["Readiness", `${score}%`, action],
        ["Rest rule", "24-48h", "Give sore muscles at least one full day before training them hard again."],
        ["Recovery food", "Protein + carbs", "Use dal-rice, paneer/tofu, curd, fruit, or eggs if enabled after hard training."],
        ["Hydration", "2-3L", "Use water through the day and add electrolytes when sweat is high."]
    ];
}

function shoppingItems() {
    const items = ["dal", "chickpeas or rajma", "curd", "paneer or tofu", "soy chunks", "rice or roti flour", "oats", "fruit", "green vegetables", "nuts and seeds"];
    if (state.profile.dietType === "vegEgg") items.splice(4, 0, "eggs");
    return items;
}

function dietFoods() {
    const egg = state.profile.dietType === "vegEgg";
    const base = [
        ["Breakfast", "Oats or poha with curd, milk, nuts, seeds, and fruit."],
        ["Lunch", "Dal or chole/rajma with rice/roti, salad, curd, and cooked vegetables."],
        ["Snack", "Sprouts chaat, roasted chana, peanuts, fruit, or Greek-style curd."],
        ["Dinner", "Paneer/tofu/soy chunks with roti or rice, vegetables, and dal."]
    ];
    if (egg) base.splice(1, 0, ["Egg option", "2-4 eggs as omelet, boiled eggs, or egg bhurji after training or at breakfast."]);
    return base;
}

function postGymFoods() {
    const { protein } = getTargets();
    const target = Math.round(protein / 4);
    const foods = [
        ["Paneer rice bowl", `${target}g protein aim with paneer, rice, vegetables, and curd.`],
        ["Tofu dal bowl", `Tofu plus dal-rice gives protein, carbs, and minerals for recovery.`],
        ["Sprouts and curd", `Sprouts chaat with curd works when appetite is low after gym.`],
        ["Soy chunks meal", `Soy chunks with roti or rice is the highest-protein strict vegetarian option.`]
    ];
    if (state.profile.dietType === "vegEgg") {
        foods.unshift(["Egg recovery plate", `2-4 eggs with toast, banana, and curd after gym.`]);
    }
    return foods;
}

function recommendedWorkout() {
    const trained = trainedMusclesThisWeek();
    const left = MUSCLES.filter((muscle) => !trained.has(muscle));
    const fatigue = fatigueScore();

    if (fatigue >= 75) {
        return {
            title: "Recovery day",
            text: "Do mobility, walking, stretching, and light core. Keep protein normal and sleep earlier."
        };
    }

    if (!left.length) {
        return {
            title: "Balanced week",
            text: "All major muscles are covered. Repeat the weakest muscle or take an active recovery day."
        };
    }

    const next = left.slice(0, 3);
    return {
        title: `Train ${next.join(", ")}`,
        text: "Use 3-4 exercises, 3-4 sets each, and stop 1-2 reps before failure if fatigue is medium."
    };
}

function renderProfile() {
    Object.entries(state.profile).forEach(([key, value]) => {
        const field = $(key);
        if (field) field.value = value;
    });
}

function renderMusclePicker() {
    $("musclePicker").innerHTML = MUSCLES.map((muscle) => `
        <label class="muscle-option">
            <input type="checkbox" value="${muscle}">
            <span>${muscle}</span>
        </label>
    `).join("");
}

function renderTargets() {
    const { protein, calories, bmi } = getTargets();
    const fatigue = fatigueScore();
    const trained = trainedMusclesThisWeek();
    const leftCount = MUSCLES.length - trained.size;

    $("proteinTarget").textContent = `${protein} g`;
    $("proteinNote").textContent = `${proteinMultiplier(state.profile.goal).toFixed(1)} g/kg target`;
    $("calorieTarget").textContent = `${calories}`;
    $("calorieNote").textContent = `BMI ${bmi}, adjust with progress`;
    $("fatigueScore").textContent = `${fatigue}%`;
    $("fatigueNote").textContent = fatigueLabel(fatigue);
    $("muscleLeftCount").textContent = leftCount;
    $("muscleLeftNote").textContent = leftCount ? "Cover remaining groups" : "All covered";
}

function renderMealTimeline() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const meals = mealPlan();
    const next = meals.find((item) => parseTime(item.sortTime) >= currentMinutes) || meals[0];
    $("nextMealChip").textContent = `Next: ${next.time}`;
    $("mealTimeline").innerHTML = meals.map((item) => `
        <article class="timeline-item">
            <div class="time">${item.time}</div>
            <div>
                <h3>${item.title}</h3>
                <p>${item.text}</p>
            </div>
        </article>
    `).join("");
}

function renderRecovery() {
    const plan = recoveryPlan();
    const readiness = Number(plan[0][1].replace("%", ""));
    $("restChip").textContent = readiness >= 70 ? "Ready" : "Recover";
    $("recoveryPlan").innerHTML = plan.map(([title, value, text]) => `
        <article class="recovery-item">
            <div class="recovery-score">${value}</div>
            <div>
                <h3>${title}</h3>
                <p>${text}</p>
            </div>
        </article>
    `).join("");

    $("shoppingList").innerHTML = shoppingItems().map((item) => `
        <article class="food-item">
            <h3>${item}</h3>
            <p>Keep available for vegetarian protein, carbs, and recovery meals.</p>
        </article>
    `).join("");
}

function renderDiet() {
    $("dietChip").textContent = state.profile.dietType === "vegEgg" ? "Vegetarian + eggs" : "Strict vegetarian";
    $("dietPlan").innerHTML = dietFoods().map(([title, text]) => `
        <article class="food-item">
            <h3>${title}</h3>
            <p>${text}</p>
        </article>
    `).join("");

    $("postGymFood").innerHTML = postGymFoods().map(([title, text]) => `
        <article class="food-item">
            <h3>${title}</h3>
            <p>${text}</p>
        </article>
    `).join("");
}

function renderMuscleStatus() {
    const trained = trainedMusclesThisWeek();
    $("muscleStatus").innerHTML = MUSCLES.map((muscle) => {
        const className = trained.has(muscle) ? "trained" : "left";
        const label = trained.has(muscle) ? "Trained" : "Left";
        return `
            <div class="muscle-item">
                <span class="muscle-name">${muscle}</span>
                <span class="${className}">${label}</span>
            </div>
        `;
    }).join("");

    const recommendation = recommendedWorkout();
    $("workoutRecommendation").innerHTML = `
        <h3>${recommendation.title}</h3>
        <p>${recommendation.text}</p>
    `;
}

function renderWorkoutForm() {
    const log = state.logs[todayKey()];
    const checkboxes = document.querySelectorAll("#musclePicker input");
    checkboxes.forEach((box) => {
        box.checked = log ? (log.muscles || []).includes(box.value) : false;
    });
    $("workoutType").value = log?.workoutType || "strength";
    $("effort").value = log?.effort || 6;
    $("effortValue").textContent = `${$("effort").value} / 10`;
    $("sleep").value = log?.sleep || 7;
    $("soreness").value = log?.soreness ?? 3;
    $("sorenessValue").textContent = `${$("soreness").value} / 10`;
    $("notes").value = log?.notes || "";
    $("logStatus").textContent = log ? "Saved today" : "Not logged";
}

function renderHistory() {
    const logs = weeklyLogs().sort((a, b) => b.date.localeCompare(a.date));
    const workoutDays = logs.filter((log) => log.workoutType !== "rest").length;
    const completion = Math.round((trainedMusclesThisWeek().size / MUSCLES.length) * 100);
    $("weekBar").style.width = `${completion}%`;

    if (!logs.length) {
        $("history").innerHTML = `<p class="empty">No gym logs saved this week.</p>`;
        return;
    }

    $("history").innerHTML = logs.map((log) => `
        <article class="history-item">
            <h3>${log.date} - ${log.workoutType} - Effort ${log.effort}/10</h3>
            <p>${(log.muscles || []).join(", ") || "No muscles selected"}${log.notes ? ` - ${log.notes}` : ""}</p>
        </article>
    `).join("");

    $("postGymChip").textContent = workoutDays >= 4 ? "Prioritize recovery" : "After workout";
}

function applyPanelOrder() {
    const content = document.querySelector(".content");
    const panels = Array.from(content.querySelectorAll(".movable-panel"));
    const order = state.panelOrder || defaults.panelOrder;
    order.forEach((name) => {
        const panel = panels.find((item) => item.dataset.panel === name);
        if (panel) content.appendChild(panel);
    });
}

function renderAll() {
    $("todayLabel").textContent = formatDateLabel();
    renderProfile();
    renderTargets();
    renderMealTimeline();
    renderDiet();
    renderRecovery();
    renderMuscleStatus();
    renderWorkoutForm();
    renderHistory();
}

function readProfile() {
    state.profile = {
        weight: Number($("weight").value),
        height: Number($("height").value),
        age: Number($("age").value),
        waist: Number($("waist").value || 0),
        goal: $("goal").value,
        dietType: $("dietType").value,
        gymStart: $("gymStart").value,
        gymDuration: Number($("gymDuration").value)
    };
}

function initEvents() {
    $("profileForm").addEventListener("submit", (event) => {
        event.preventDefault();
        readProfile();
        saveState();
        renderAll();
    });

    $("workoutForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const muscles = Array.from(document.querySelectorAll("#musclePicker input:checked")).map((box) => box.value);
        state.logs[todayKey()] = {
            workoutType: $("workoutType").value,
            muscles,
            effort: Number($("effort").value),
            sleep: Number($("sleep").value || 0),
            soreness: Number($("soreness").value || 0),
            notes: $("notes").value.trim()
        };
        saveState();
        renderAll();
    });

    $("effort").addEventListener("input", () => {
        $("effortValue").textContent = `${$("effort").value} / 10`;
    });

    $("soreness").addEventListener("input", () => {
        $("sorenessValue").textContent = `${$("soreness").value} / 10`;
    });

    $("clearTodayBtn").addEventListener("click", () => {
        delete state.logs[todayKey()];
        saveState();
        renderAll();
    });

    $("resetBtn").addEventListener("click", () => {
        if (!confirm("Reset profile and all gym logs?")) return;
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, structuredClone(defaults));
        renderAll();
    });

    $("suggestWorkoutBtn").addEventListener("click", () => {
        const suggestion = recommendedWorkout();
        $("workoutRecommendation").innerHTML = `
            <h3>${suggestion.title}</h3>
            <p>${suggestion.text}</p>
        `;
    });

    $("copyGroceriesBtn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(shoppingItems().join(", "));
        $("copyGroceriesBtn").textContent = "Copied";
        setTimeout(() => $("copyGroceriesBtn").textContent = "Copy", 1200);
    });

    $("exportBtn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        $("exportBtn").textContent = "Copied";
        setTimeout(() => $("exportBtn").textContent = "Copy backup", 1200);
    });

    $("importBtn").addEventListener("click", () => {
        const pasted = prompt("Paste your VegFit backup JSON:");
        if (!pasted) return;
        try {
            Object.assign(state, { ...structuredClone(defaults), ...JSON.parse(pasted) });
            saveState();
            applyPanelOrder();
            renderAll();
        } catch {
            alert("That backup could not be imported.");
        }
    });

    $("sharePlanBtn").addEventListener("click", async () => {
        const shareUrl = `${window.location.href.split("#")[0]}#data=${encodeState()}`;
        if (navigator.share) {
            await navigator.share({ title: "VegFit Planner", text: "Open this to import my VegFit plan.", url: shareUrl });
        } else {
            await navigator.clipboard.writeText(shareUrl);
            $("sharePlanBtn").textContent = "Link copied";
            setTimeout(() => $("sharePlanBtn").textContent = "Share to phone", 1200);
        }
    });

    document.querySelectorAll(".movable-panel").forEach((panel) => {
        panel.addEventListener("dragstart", () => panel.classList.add("dragging"));
        panel.addEventListener("dragend", () => {
            panel.classList.remove("dragging");
            state.panelOrder = Array.from(document.querySelectorAll(".movable-panel")).map((item) => item.dataset.panel);
            saveState();
        });
    });

    document.querySelector(".content").addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = document.querySelector(".dragging");
        const after = getDragAfterElement(event.clientY);
        if (!dragging) return;
        if (after == null) document.querySelector(".content").appendChild(dragging);
        else document.querySelector(".content").insertBefore(dragging, after);
    });
}

function getDragAfterElement(y) {
    const panels = [...document.querySelectorAll(".movable-panel:not(.dragging)")];
    return panels.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

renderMusclePicker();
applySharedStateFromHash();
applyPanelOrder();
initEvents();
renderAll();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

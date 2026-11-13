const money = amount =>
    "₹" + Number(amount).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });

if (!localStorage.getItem("monthlyBudget")) {
    localStorage.setItem("monthlyBudget", "5000");
}

// --- Page Switching (Tab Navigation) ---
function switchPage(event, pageId, linkElement) {
    if (event) event.preventDefault();

    document.querySelectorAll(".content-section").forEach(section => {
        section.style.display = "none";
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = "block";
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });
    if (linkElement) {
        linkElement.classList.add("active");
    }
}

function getTransactions() {
    return JSON.parse(localStorage.getItem("transactions") || "[]");
}

function getThisMonthExpenses() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return getTransactions().filter(t =>
        t.type === "Expense" &&
        t.date &&
        t.date.slice(0, 7) === currentMonth
    );
}

function getCategorySpending(category) {
    return getThisMonthExpenses()
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
}

// --- Modal Controls ---
function setTodayDate() {
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
}

function openModal() {
    setTodayDate();
    document.getElementById("transactionModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("transactionModal").style.display = "none";
}

window.addEventListener("click", function (event) {
    const modal = document.getElementById("transactionModal");
    if (event.target === modal) {
        closeModal();
    }
});

function setType(type, button) {
    document.getElementById("type").value = type;
    document.querySelectorAll(".type-selection button")
        .forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
}

// --- Add Transaction Submit ---
document.getElementById("transactionForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const transaction = {
        id: Date.now(),
        type: document.getElementById("type").value,
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        date: document.getElementById("date").value,
        payment: document.getElementById("payment").value,
        title: document.getElementById("title").value,
        description: document.getElementById("description").value
    };

    if (isNaN(transaction.amount) || transaction.amount <= 0) return;

    const transactions = getTransactions();
    transactions.unshift(transaction);
    localStorage.setItem("transactions", JSON.stringify(transactions));

    refreshAll();

    const msg = document.getElementById("message");
    msg.style.display = "block";

    document.getElementById("transactionForm").reset();
    setTodayDate();
    document.getElementById("type").value = "Expense";
    document.querySelectorAll(".type-selection button")
        .forEach(btn => btn.classList.remove("active"));
    document.querySelector(".type-selection button").classList.add("active");

    setTimeout(() => {
        msg.style.display = "none";
        closeModal();
    }, 750);
});

function deleteTransaction(id) {
    const updated = getTransactions().filter(t => t.id !== id);
    localStorage.setItem("transactions", JSON.stringify(updated));
    refreshAll();
}

// --- Budget, Savings & Category Forms ---
document.getElementById("budgetForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const budget = Number(document.getElementById("monthlyBudget").value);
    if (budget <= 0) return;

    localStorage.setItem("monthlyBudget", budget);
    this.reset();
    showMessage("budgetMessage", "✓ Monthly budget saved successfully!");
    refreshAll();
});

document.getElementById("savingsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const goal = {
        name: document.getElementById("goalTitle").value,
        target: Number(document.getElementById("goalAmount").value),
        saved: Number(document.getElementById("savedAmount").value)
    };

    if (goal.target <= 0 || goal.saved < 0) return;

    localStorage.setItem("savingsGoal", JSON.stringify(goal));
    this.reset();
    showMessage("savingsMessage", "✓ Savings goal updated successfully!");
    updateSavings();
});

document.getElementById("categoryForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("categoryName").value;
    const limit = Number(document.getElementById("categoryLimit").value);

    if (!name || limit <= 0) return;

    let categories = JSON.parse(localStorage.getItem("categoryBudgets") || "{}");
    categories[name] = limit;
    localStorage.setItem("categoryBudgets", JSON.stringify(categories));

    this.reset();
    updateCategories();
});

function deleteCategoryBudget(name) {
    let categories = JSON.parse(localStorage.getItem("categoryBudgets") || "{}");
    delete categories[name];
    localStorage.setItem("categoryBudgets", JSON.stringify(categories));
    updateCategories();
}

function showMessage(id, message) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.style.display = "block";
    setTimeout(() => {
        element.style.display = "none";
    }, 3000);
}

// --- Render All Sections ---
function updateDashboardAndBudget() {
    const transactions = getTransactions();

    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
        if (t.type === "Income" || t.type === "Refund") {
            totalIncome += Number(t.amount);
        } else {
            totalExpenses += Number(t.amount);
        }
    });

    document.getElementById("balance").textContent = money(totalIncome - totalExpenses);
    document.getElementById("income").textContent = money(totalIncome);
    document.getElementById("expenses").textContent = money(totalExpenses);

    const budget = Number(localStorage.getItem("monthlyBudget") || 0);
    const monthSpent = getThisMonthExpenses().reduce((sum, t) => sum + Number(t.amount), 0);
    const remaining = budget - monthSpent;
    const percentage = budget > 0 ? (monthSpent / budget) * 100 : 0;

    // Dashboard mini budget bar
    document.getElementById("dashBudgetProgress").style.width = Math.min(percentage, 100) + "%";
    document.getElementById("dashBudgetText").textContent = `${money(monthSpent)} spent of ${money(budget)} (${percentage.toFixed(1)}%)`;

    // Full Budget page
    document.getElementById("totalBudget").textContent = money(budget);
    document.getElementById("totalSpent").textContent = money(monthSpent);

    const remainingEl = document.getElementById("remaining");
    remainingEl.textContent = money(remaining);
    remainingEl.style.color = remaining < 0 ? "#f87171" : "#34d399";

    document.getElementById("budgetProgress").style.width = Math.min(percentage, 100) + "%";
    document.getElementById("budgetPercentage").textContent = percentage.toFixed(1) + "% of your budget used";

    const alert = document.getElementById("budgetAlert");
    if (budget > 0 && percentage >= 100) {
        alert.style.display = "block";
        alert.style.borderColor = "#f87171";
        alert.style.color = "#f87171";
        alert.textContent = "⚠ Budget exceeded! You have spent more than your monthly limit.";
    } else if (budget > 0 && percentage >= 80) {
        alert.style.display = "block";
        alert.style.borderColor = "#f59e0b";
        alert.style.color = "#fbbf24";
        alert.textContent = "⚠ Warning! You have used more than 80% of your monthly budget.";
    } else {
        alert.style.display = "none";
    }

    // Transactions list
    const listContainer = document.getElementById("transactionList");
    if (transactions.length === 0) {
        listContainer.innerHTML = `<p class="empty-state">No transactions added yet.</p>`;
    } else {
        listContainer.innerHTML = transactions.map(t => {
            const isPositive = t.type === "Income" || t.type === "Refund";
            const sign = isPositive ? "+" : "-";
            const color = isPositive ? "#34d399" : "#f87171";

            return `
                <div class="transaction-item">
                    <div>
                        <strong style="color: #f1f5f9;">${t.title}</strong>
                        <span style="font-size: 0.75rem; background: #1e293b; color: #c084fc; padding: 2px 8px; border-radius: 6px; margin-left: 8px;">${t.type}</span>
                        <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">
                            ${t.category} • ${t.payment} • ${t.date}
                            ${t.description ? ` — <em>${t.description}</em>` : ""}
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span style="color: ${color}; font-weight: 700; font-size: 1.05rem;">
                            ${sign}${money(t.amount)}
                        </span>
                        <button type="button" onclick="deleteTransaction(${t.id})" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 1rem;" title="Delete">✕</button>
                    </div>
                </div>
            `;
        }).join("");
    }
}

function updateSavings() {
    const goal = JSON.parse(localStorage.getItem("savingsGoal") || '{"name":"Emergency Fund / Laptop","target":10000,"saved":0}');
    const percentage = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;

    document.getElementById("goalName").textContent = goal.name;
    document.getElementById("goalProgressText").textContent = `${money(goal.saved)} / ${money(goal.target)}`;
    document.getElementById("savingsProgress").style.width = percentage + "%";
    document.getElementById("savingsPercentage").textContent = percentage.toFixed(1) + "% completed";
}

function updateCategories() {
    const categories = JSON.parse(localStorage.getItem("categoryBudgets") || "{}");
    const list = document.getElementById("categoryList");
    list.innerHTML = "";

    const keys = Object.keys(categories);
    if (keys.length === 0) {
        list.innerHTML = `<p class="empty-state">No category limits set yet. Use the form above to set one.</p>`;
        return;
    }

    keys.forEach(name => {
        const limit = Number(categories[name]);
        const spent = getCategorySpending(name);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;

        let warning = "Within your budget";
        let statusColor = "#34d399";
        let barColor = "linear-gradient(90deg, #8b5cf6, #c084fc)";

        if (percentage >= 100) {
            warning = "⚠ Budget exceeded!";
            statusColor = "#f87171";
            barColor = "#f87171";
        } else if (percentage >= 80) {
            warning = "⚠ Almost at your limit!";
            statusColor = "#fbbf24";
            barColor = "#f59e0b";
        }

        const item = document.createElement("div");
        item.className = "category";
        item.innerHTML = `
            <div class="category-top">
                <strong>${name}</strong>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>${money(limit)}</span>
                    <button type="button" onclick="deleteCategoryBudget('${name}')" style="background: none; border: none; color: #64748b; cursor: pointer;" title="Remove limit">✕</button>
                </div>
            </div>
            <small>${money(spent)} spent • ${percentage.toFixed(1)}% used</small>
            <div class="progress">
                <div class="progress-bar" style="width: ${Math.min(percentage, 100)}%; background: ${barColor};"></div>
            </div>
            <small style="color: ${statusColor}; font-weight: 500;">${warning}</small>
        `;
        list.appendChild(item);
    });
}

function refreshAll() {
    updateDashboardAndBudget();
    updateSavings();
    updateCategories();
}

setTodayDate();
refreshAll();
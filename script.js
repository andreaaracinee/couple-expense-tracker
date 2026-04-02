const SUPABASE_URL = "yoururl";
const SUPABASE_KEY = "yourpublicapikey";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

//tab navi
const tabs = document.querySelectorAll(".side-link");
const sections = document.querySelectorAll("main section");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    sections.forEach(sec => sec.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

//global variables
let expenses = [];

const typeSelect = document.getElementById("type");
const personSelect = document.getElementById("person");
const categorySelect = document.getElementById("category");

const expenseTableView = document.getElementById("expenseTableView");
const expenseForm = document.getElementById("expenseForm");

const toggleExpenseForm = document.getElementById("toggleExpenseForm");
const backButton = document.getElementById("backButton");
const saveExpense = document.getElementById("saveExpense");

const expenseCategories = ["Housing", "Food", "Transportation", "Entertainment", "Utilities", "Healthcare", "Education", "Other"];
const incomeCategories = ["Paycheck", "Bonus", "Gift", "Investment", "Other"];

//populate dropdowns
function populateType() {
  typeSelect.innerHTML = `
    <option value="expense">Expense</option>
    <option value="income">Income</option>
  `;
}

function populatePerson() {
  personSelect.innerHTML = `
    <option value="Me">Me</option>
    <option value="Partner">Partner</option>
    <option value="Both">Both</option>
  `;
}

function updateCategories() {
  const categories = typeSelect.value === "income" ? incomeCategories : expenseCategories;
  categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

populateType();
populatePerson();
updateCategories();
typeSelect.addEventListener("change", updateCategories);

//toggle between table view and form view
toggleExpenseForm.addEventListener("click", () => {
  expenseTableView.classList.add("hidden");
  expenseForm.classList.remove("hidden");
});

backButton.addEventListener("click", () => {
  expenseForm.classList.add("hidden");
  expenseTableView.classList.remove("hidden");
});

//save expense
saveExpense.addEventListener("click", async (e) => {
  e.preventDefault();

  const name = document.getElementById("expenseName").value.trim();
  const type = typeSelect.value;
  const person = personSelect.value;
  const date = document.getElementById("expenseDate").value; // YYYY-MM-DD
  const amount = parseFloat(document.getElementById("amount").value);
  const category = categorySelect.value;
  const description = document.getElementById("description").value.trim();

  if (!name || !amount || !date) {
    alert("Please fill in all required fields (Name, Date, Amount).");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("expenses")
      .insert([{
        name,      // <-- use your actual column
        type,
        person,
        date,      // YYYY-MM-DD string
        amount,    // numeric
        category,
        description
      }])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No data returned from insert.");

    expenses.unshift(data[0]);

    renderExpenses();
    updateDashboard();
    updateChart();

    expenseForm.classList.add("hidden");
    expenseTableView.classList.remove("hidden");

    clearForm();

    console.log("Expense saved successfully:", data[0]);

  } catch (err) {
    console.error("Supabase insert error:", err);
    alert("Failed to save expense. Check console for details.");
  }
});

//clear form after saving
function clearForm() {
  document.getElementById("expenseName").value = "";
  document.getElementById("expenseDate").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("description").value = "";
}

//delete expense
async function deleteExpense(id) {
  try {
    if (!id) throw new Error("Invalid expense ID");

    // Convert id to number to be safe
    const numericId = Number(id);

    const { data, error } = await supabaseClient
      .from("expenses")
      .delete()
      .eq("id", numericId); // remove .select() for simplicity

    if (error) throw error;

    // Remove locally only if delete succeeded
    expenses = expenses.filter(e => e.id !== numericId);

    renderExpenses();
    updateDashboard();
    updateChart();

    console.log("Expense deleted successfully:", numericId);

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete expense. See console for details.");
  }
}

//render expenses in table and recent transactions
function renderExpenses() {
  const tbody = document.getElementById("expenseTable");
  const recent = document.getElementById("recentTransactions");

  tbody.innerHTML = "";
  recent.innerHTML = "";

  expenses.forEach(exp => {
    // Make sure exp.id exists
    if (!exp.id) {
      console.warn("Expense missing ID, skipping:", exp);
      return;
    }

    tbody.innerHTML += `
      <tr>
        <td>${exp.date}</td>
        <td>${exp.name}</td>
        <td>$${parseFloat(exp.amount).toFixed(2)}</td>
        <td>${exp.type}</td>
        <td>${exp.category}</td>
        <td>${exp.person}</td>
        <td><button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button></td>
      </tr>
    `;

    recent.innerHTML += `
      <tr>
        <td>${exp.date}</td>
        <td>${exp.name}</td>
        <td>${exp.type}</td>
        <td>${exp.category}</td>
        <td>${exp.person}</td>
        <td>$${parseFloat(exp.amount).toFixed(2)}</td>
      </tr>
    `;
  });
}

//dashboards

function getFilteredExpenses() {
  const month = document.getElementById("monthFilter").value;
  const person = document.getElementById("personFilter").value;

  return expenses.filter(exp => {
    const expMonth = exp.date.split("-")[1];

    const monthMatch = month === "All" || expMonth === month;
    const personMatch = person === "All" || exp.person === person;

    return monthMatch && personMatch;
  });
}

function updateDashboard() {
  const filtered = getFilteredExpenses();

  const income = filtered.filter(e => e.type === "income").reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const expense = filtered.filter(e => e.type === "expense").reduce((sum, e) => sum + parseFloat(e.amount), 0);

  document.getElementById("incomeTotal").textContent = `$${income.toFixed(2)}`;
  document.getElementById("expenseTotal").textContent = `$${expense.toFixed(2)}`;
}

//expense & income charts
//pinky bc my gf likes pink
function pinkPalette(count) {
  const palette = [
    "#ffb6d9",
    "#ff9ecf",
    "#ff85c2",
    "#ff6eb5",
    "#ff57aa",
    "#ff409f",
    "#ff2a94",
    "#ff1488"
  ];

  let colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }

  return colors;
}

let expenseChart;
let incomeChart;

function updateChart() {
  const filtered = getFilteredExpenses();

  // Expense totals
  const expenseTotals = {};
  filtered
    .filter(e => e.type === "expense")
    .forEach(exp => {
      expenseTotals[exp.category] = (expenseTotals[exp.category] || 0) + parseFloat(exp.amount);
    });

  // Income totals
  const incomeTotals = {};
  filtered
    .filter(e => e.type === "income")
    .forEach(exp => {
      incomeTotals[exp.category] = (incomeTotals[exp.category] || 0) + parseFloat(exp.amount);
    });

  const expenseLabels = Object.keys(expenseTotals);
  const expenseData = Object.values(expenseTotals);

  const incomeLabels = Object.keys(incomeTotals);
  const incomeData = Object.values(incomeTotals);

  if (expenseChart) expenseChart.destroy();
  if (incomeChart) incomeChart.destroy();

  expenseChart = new Chart(document.getElementById("expenseChart"), {
    type: "bar",
    data: {
      labels: expenseLabels,
      datasets: [{
        data: expenseData,
        backgroundColor: pinkPalette(expenseLabels.length)
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      }
    }
  });

  incomeChart = new Chart(document.getElementById("incomeChart"), {
    type: "bar",
    data: {
      labels: incomeLabels,
      datasets: [{
        data: incomeData,
        backgroundColor: pinkPalette(incomeLabels.length)
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      }
    }
  });
}

//load all expenses

document.getElementById("monthFilter").addEventListener("change", () => {
  updateDashboard();
  updateChart();
});

document.getElementById("personFilter").addEventListener("change", () => {
  updateDashboard();
  updateChart();
});

async function loadExpenses() {
  try {
    const { data, error } = await supabaseClient
      .from("expenses")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    expenses = data || [];
    renderExpenses();
    updateDashboard();
    updateChart();

  } catch (err) {
    console.error("Failed to load expenses:", err);
  }
}

//load expenses on page load
loadExpenses();
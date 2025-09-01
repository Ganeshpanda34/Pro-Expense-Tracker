
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize variables
            let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
            let categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
            let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 2500;
            let editingId = null;
            let categoryChart = null;
            let timeChart = null;
            let currentTheme = localStorage.getItem('theme') || 'light';
            let sortColumn = 'date';
            let sortDirection = 'desc';
            
            // DOM Elements
            const expenseForm = document.getElementById('expense-form');
            const expenseList = document.getElementById('expense-list');
            const totalExpensesEl = document.getElementById('total-expenses');
            const remainingBudgetEl = document.getElementById('remaining-budget');
            const monthlyBudgetEl = document.getElementById('monthly-budget');
            const searchInput = document.getElementById('search-input');
            const updateBtn = document.getElementById('update-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            const clearAllBtn = document.getElementById('clear-all-btn');
            const emptyState = document.getElementById('empty-state');
            const themeToggle = document.getElementById('theme-toggle');
            const budgetInput = document.getElementById('budget-input');
            const setBudgetBtn = document.getElementById('set-budget-btn');
            const exportBtn = document.getElementById('export-btn');
            const filterCategory = document.getElementById('filter-category');
            const filterDateFrom = document.getElementById('filter-date-from');
            const filterDateTo = document.getElementById('filter-date-to');
            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            const categoryBudgetsContainer = document.getElementById('category-budgets');
            
            // Statistics elements
            const dailyAverageEl = document.getElementById('daily-average');
            const highestExpenseEl = document.getElementById('highest-expense');
            const totalTransactionsEl = document.getElementById('total-transactions');
            const topCategoryEl = document.getElementById('top-category');
            
            // Set theme
            if (currentTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
            }
            
            // Set budget input value
            budgetInput.value = monthlyBudget;
            
            // Set today's date as default
            document.getElementById('date').valueAsDate = new Date();
            
            // Initialize the app
            renderExpenses();
            updateSummary();
            updateStatistics();
            renderCategoryBudgets();
            initializeCharts();
            
            // Sorting functionality
            document.querySelectorAll('th[data-sort]').forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.dataset.sort;
                    if (sortColumn === column) {
                        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortColumn = column;
                        // Default sort direction based on column type
                        sortDirection = (column === 'description' || column === 'category') ? 'asc' : 'desc';
                    }
                    renderExpenses();
                });
            });

            // Theme toggle
            themeToggle.addEventListener('click', function() {
                currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', currentTheme);
                localStorage.setItem('theme', currentTheme);
                
                if (currentTheme === 'dark') {
                    themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
                } else {
                    themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
                }
                
                // Update charts with new theme
                updateChartsTheme();
            });
            
            // Form submission
            expenseForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const date = document.getElementById('date').value;
                const category = document.getElementById('category').value;
                const amount = parseFloat(document.getElementById('amount').value);
                const description = document.getElementById('description').value;
                
                if (editingId !== null) {
                    // Update existing expense
                    const index = expenses.findIndex(exp => exp.id === editingId);
                    if (index !== -1) {
                        expenses[index] = { ...expenses[index], date, category, amount, description };
                        showToast('Expense updated successfully!', 'success');
                    }
                    resetForm();
                } else {
                    // Add new expense
                    const newExpense = {
                        id: Date.now(),
                        date,
                        category,
                        amount,
                        description
                    };
                    
                    expenses.push(newExpense);
                    showToast('Expense added successfully!', 'success');
                    expenseForm.reset();
                    document.getElementById('date').valueAsDate = new Date();
                    
                    // Reset filters to show the new expense
                    resetFilters();
                }
                
                saveToLocalStorage();
                renderExpenses();
                updateSummary(true); // Pass flag to show alert on add/update
                updateStatistics();
                updateCharts();
            });
            
            // Function to reset filters
            function resetFilters() {
                searchInput.value = '';
                filterCategory.value = 'all';
                filterDateFrom.value = '';
                filterDateTo.value = '';
            }
            
            // Update button
            updateBtn.addEventListener('click', function() {
                expenseForm.dispatchEvent(new Event('submit'));
            });
            
            // Cancel button
            cancelBtn.addEventListener('click', resetForm);
            
            // Clear all button
            clearAllBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
                    expenses = [];
                    saveToLocalStorage();
                    renderExpenses();
                    updateSummary();
                    updateStatistics();
                    updateCharts();
                    showToast('All expenses cleared!', 'danger');
                }
            });
            
            // Set budget button
            setBudgetBtn.addEventListener('click', function() {
                const newBudget = parseFloat(budgetInput.value);
                if (!isNaN(newBudget) && newBudget > 0) {
                    monthlyBudget = newBudget;
                    localStorage.setItem('monthlyBudget', monthlyBudget);
                    updateSummary();
                    showToast('Monthly budget updated successfully!', 'success');
                } else {
                    showToast('Please enter a valid budget amount!', 'danger');
                }
            });
            
            // Export button
            exportBtn.addEventListener('click', function() {
                exportToCSV();
            });
            
            // Apply filters button
            applyFiltersBtn.addEventListener('click', function() {
                renderExpenses();
            });
            
            // Search functionality
            searchInput.addEventListener('input', function() {
                renderExpenses();
            });
            
            // Function to render expenses
            function renderExpenses() {
                expenseList.innerHTML = '';
                
                let filteredExpenses = [...expenses];
                
                // Apply search filter
                const searchTerm = searchInput.value.toLowerCase();
                if (searchTerm) {
                    filteredExpenses = filteredExpenses.filter(expense => 
                        expense.description.toLowerCase().includes(searchTerm) || 
                        expense.category.toLowerCase().includes(searchTerm)
                    );
                }
                
                // Apply category filter
                const categoryFilter = filterCategory.value;
                if (categoryFilter !== 'all') {
                    filteredExpenses = filteredExpenses.filter(expense => expense.category === categoryFilter);
                }
                
                // Apply date filters
                const dateFrom = filterDateFrom.value;
                const dateTo = filterDateTo.value;
                
                if (dateFrom) {
                    filteredExpenses = filteredExpenses.filter(expense => expense.date >= dateFrom);
                }
                
                if (dateTo) {
                    filteredExpenses = filteredExpenses.filter(expense => expense.date <= dateTo);
                }
                
                if (filteredExpenses.length === 0) {
                    emptyState.style.display = 'block';
                    return;
                } else {
                    emptyState.style.display = 'none';
                }
                
                // Update header UI for sorting
                document.querySelectorAll('th[data-sort]').forEach(th => {
                    th.classList.remove('sorted', 'asc', 'desc');
                    if (th.dataset.sort === sortColumn) {
                        th.classList.add('sorted', sortDirection);
                    }
                });

                // Sort expenses
                filteredExpenses.sort((a, b) => {
                    let valA = a[sortColumn];
                    let valB = b[sortColumn];

                    // Handle different data types
                    if (sortColumn === 'amount') {
                        valA = parseFloat(valA);
                        valB = parseFloat(valB);
                    } else if (sortColumn === 'date') {
                        valA = new Date(valA);
                        valB = new Date(valB);
                    } else { // string comparison for description and category
                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    }

                    if (valA < valB) {
                        return sortDirection === 'asc' ? -1 : 1;
                    }
                    if (valA > valB) {
                        return sortDirection === 'asc' ? 1 : -1;
                    }
                    return 0;
                });
                
                filteredExpenses.forEach(expense => {
                    const row = document.createElement('tr');
                    
                    // Format date
                    const dateObj = new Date(expense.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${expense.description}</td>
                        <td><span class="category-badge category-${expense.category}"><i class="${getCategoryIcon(expense.category)}"></i> ${getCategoryName(expense.category)}</span></td>
                        <td>$${expense.amount.toFixed(2)}</td>
                        <td class="action-buttons">
                            <button class="btn btn-sm btn-outline-primary" onclick="editExpense(${expense.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    expenseList.appendChild(row);
                });
            }
            
            // Function to update summary
            function updateSummary(showAlertOnOverBudget = false) {
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const remaining = monthlyBudget - total;
                
                totalExpensesEl.textContent = `$${total.toFixed(2)}`;
                monthlyBudgetEl.textContent = `$${monthlyBudget.toFixed(2)}`;
                remainingBudgetEl.textContent = `$${remaining.toFixed(2)}`;

                // Change color based on remaining budget
                if (remaining < 0) {
                    if (showAlertOnOverBudget) {
                        showToast('Out of budget!', 'danger');
                    }
                    remainingBudgetEl.style.color = 'var(--danger-color)';
                } else {
                    if (remaining < monthlyBudget * 0.2) {
                        remainingBudgetEl.style.color = '#ffbe0b';
                    } else {
                        remainingBudgetEl.style.color = 'var(--primary-color)';
                    }
                }
            }
            
            // Function to update statistics
            function updateStatistics() {
                // Total transactions
                totalTransactionsEl.textContent = expenses.length;
                
                if (expenses.length === 0) {
                    dailyAverageEl.textContent = '$0.00';
                    highestExpenseEl.textContent = '$0.00';
                    topCategoryEl.textContent = 'None';
                    return;
                }
                
                // Daily average
                const dates = [...new Set(expenses.map(expense => expense.date))];
                const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                const dailyAverage = total / dates.length;
                dailyAverageEl.textContent = `$${dailyAverage.toFixed(2)}`;
                
                // Highest expense
                const highestExpense = Math.max(...expenses.map(expense => expense.amount));
                highestExpenseEl.textContent = `$${highestExpense.toFixed(2)}`;
                
                // Top category
                const categoryTotals = {};
                expenses.forEach(expense => {
                    if (!categoryTotals[expense.category]) {
                        categoryTotals[expense.category] = 0;
                    }
                    categoryTotals[expense.category] += expense.amount;
                });
                
                const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
                    categoryTotals[a] > categoryTotals[b] ? a : b, Object.keys(categoryTotals)[0] || 'None');
                
                topCategoryEl.textContent = getCategoryName(topCategory);
            }
            
            // Function to render category budgets
            function renderCategoryBudgets() {
                categoryBudgetsContainer.innerHTML = '';
                
                const categories = [
                    { id: 'food', name: 'Food & Dining' },
                    { id: 'transport', name: 'Transportation' },
                    { id: 'entertainment', name: 'Entertainment' },
                    { id: 'utilities', name: 'Utilities' },
                    { id: 'healthcare', name: 'Healthcare' },
                    { id: 'shopping', name: 'Shopping' },
                    { id: 'education', name: 'Education' },
                    { id: 'other', name: 'Other' }
                ];
                
                categories.forEach(category => {
                    const budget = categoryBudgets[category.id] || 0;
                    const spent = expenses
                        .filter(expense => expense.category === category.id)
                        .reduce((sum, expense) => sum + expense.amount, 0);
                    
                    const percentage = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                    
                    const budgetItem = document.createElement('div');
                    budgetItem.className = 'mb-3';
                    budgetItem.innerHTML = `
                        <div class="budget-label">
                            <span>${category.name}</span>
                            <span>$${spent.toFixed(2)} / $${budget.toFixed(2)}</span>
                        </div>
                        <div class="progress budget-progress">
                            <div class="progress-bar ${percentage > 90 ? 'bg-danger' : percentage > 75 ? 'bg-warning' : 'bg-success'}" 
                                role="progressbar" style="width: ${percentage}%" 
                                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <div class="input-group input-group-sm mt-2">
                            <span class="input-group-text">$</span>
                            <input type="number" class="form-control" id="budget-${category.id}" 
                                value="${budget}" step="10" min="0" placeholder="0">
                            <button class="btn btn-outline-secondary set-budget-btn" data-category="${category.id}">
                                Set
                            </button>
                        </div>
                    `;
                    
                    categoryBudgetsContainer.appendChild(budgetItem);
                });
                
                // Add event listeners to set budget buttons
                document.querySelectorAll('.set-budget-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const categoryId = this.getAttribute('data-category');
                        const input = document.getElementById(`budget-${categoryId}`);
                        const budget = parseFloat(input.value);
                        
                        if (!isNaN(budget) && budget >= 0) {
                            categoryBudgets[categoryId] = budget;
                            localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
                            renderCategoryBudgets();
                            showToast(`${getCategoryName(categoryId)} budget updated!`, 'success');
                        } else {
                            showToast('Please enter a valid budget amount!', 'danger');
                        }
                    });
                });
            }
            
            // Function to initialize charts
            function initializeCharts() {
                // Category chart
                const categoryCtx = document.getElementById('categoryChart').getContext('2d');
                categoryChart = new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                '#ffbe0b',
                                '#fb5607',
                                '#ff006e',
                                '#8338ec',
                                '#3a86ff',
                                '#06d6a0',
                                '#118ab2',
                                '#6a4c93'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: currentTheme === 'dark' ? '#f8f9fa' : '#212529'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = '$' + context.raw.toFixed(2);
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Time chart
                const timeCtx = document.getElementById('timeChart').getContext('2d');
                timeChart = new Chart(timeCtx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Daily Expenses',
                            data: [],
                            borderColor: '#4361ee',
                            backgroundColor: 'rgba(67, 97, 238, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: currentTheme === 'dark' ? '#f8f9fa' : '#212529'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Expenses: $${context.raw.toFixed(2)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: currentTheme === 'dark' ? '#f8f9fa' : '#212529',
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                },
                                grid: {
                                    color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: currentTheme === 'dark' ? '#f8f9fa' : '#212529'
                                },
                                grid: {
                                    color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }
                    }
                });
                
                updateCharts();
            }
            
            // Function to update charts
            function updateCharts() {
                // Update category chart
                const categoryTotals = {};
                expenses.forEach(expense => {
                    if (!categoryTotals[expense.category]) {
                        categoryTotals[expense.category] = 0;
                    }
                    categoryTotals[expense.category] += expense.amount;
                });
                
                const categoryLabels = Object.keys(categoryTotals).map(category => getCategoryName(category));
                const categoryData = Object.values(categoryTotals);
                
                categoryChart.data.labels = categoryLabels;
                categoryChart.data.datasets[0].data = categoryData;
                categoryChart.update();
                
                // Update time chart
                const dailyTotals = {};
                expenses.forEach(expense => {
                    if (!dailyTotals[expense.date]) {
                        dailyTotals[expense.date] = 0;
                    }
                    dailyTotals[expense.date] += expense.amount;
                });
                
                // Sort dates
                const sortedDates = Object.keys(dailyTotals).sort();
                const last7Days = sortedDates.slice(-7);
                
                // If we have less than 7 days, fill with empty days
                if (last7Days.length < 7) {
                    const today = new Date();
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        const dateStr = date.toISOString().split('T')[0];
                        if (!last7Days.includes(dateStr)) {
                            last7Days.push(dateStr);
                        }
                    }
                    last7Days.sort();
                }
                
                const timeLabels = last7Days.map(date => {
                    const dateObj = new Date(date);
                    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                
                const timeData = last7Days.map(date => dailyTotals[date] || 0);
                
                timeChart.data.labels = timeLabels;
                timeChart.data.datasets[0].data = timeData;
                timeChart.update();
            }
            
            // Function to update charts theme
            function updateChartsTheme() {
                const textColor = currentTheme === 'dark' ? '#f8f9fa' : '#212529';
                const gridColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                
                // Update category chart
                categoryChart.options.plugins.legend.labels.color = textColor;
                categoryChart.update();
                
                // Update time chart
                timeChart.options.plugins.legend.labels.color = textColor;
                timeChart.options.scales.y.ticks.color = textColor;
                timeChart.options.scales.y.grid.color = gridColor;
                timeChart.options.scales.x.ticks.color = textColor;
                timeChart.options.scales.x.grid.color = gridColor;
                timeChart.update();
            }
            
            // Function to export to CSV
            function exportToCSV() {
                if (expenses.length === 0) {
                    showToast('No expenses to export!', 'danger');
                    return;
                }
                
                let csv = 'Date,Description,Category,Amount\n';
                
                expenses.forEach(expense => {
                    const date = new Date(expense.date).toLocaleDateString();
                    const description = `"${expense.description.replace(/"/g, '""')}"`;
                    const category = getCategoryName(expense.category);
                    const amount = expense.amount.toFixed(2);
                    
                    csv += `${date},${description},${category},${amount}\n`;
                });
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('hidden', '');
                a.setAttribute('href', url);
                a.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showToast('Expenses exported successfully!', 'success');
            }
            
            // Function to save to localStorage
            function saveToLocalStorage() {
                try {
                    localStorage.setItem('expenses', JSON.stringify(expenses));
                } catch (e) {
                    console.error('Error saving to localStorage', e);
                    showToast('Error saving data. Please try again.', 'danger');
                }
            }
            
            // Function to edit expense
            window.editExpense = function(id) {
                const expense = expenses.find(exp => exp.id === id);
                if (expense) {
                    document.getElementById('date').value = expense.date;
                    document.getElementById('category').value = expense.category;
                    document.getElementById('amount').value = expense.amount;
                    document.getElementById('description').value = expense.description;
                    
                    editingId = id;
                    updateBtn.style.display = 'inline-block';
                    cancelBtn.style.display = 'inline-block';
                    
                    // Scroll to form
                    document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
            
            // Function to delete expense
            window.deleteExpense = function(id) {
                if (confirm('Are you sure you want to delete this expense?')) {
                    expenses = expenses.filter(expense => expense.id !== id);
                    saveToLocalStorage();
                    renderExpenses();
                    updateSummary();
                    updateStatistics();
                    updateCharts();
                    showToast('Expense deleted successfully!', 'danger');
                }
            };
            
            // Function to reset form
            function resetForm() {
                expenseForm.reset();
                document.getElementById('date').valueAsDate = new Date();
                editingId = null;
                updateBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
            
            // Function to get category name
            function getCategoryName(category) {
                const categories = {
                    food: 'Food & Dining',
                    transport: 'Transportation',
                    entertainment: 'Entertainment',
                    utilities: 'Utilities',
                    healthcare: 'Healthcare',
                    shopping: 'Shopping',
                    education: 'Education',
                    other: 'Other'
                };
                return categories[category] || category;
            }
            
            // Function to get category icon
            function getCategoryIcon(category) {
                const icons = {
                    food: 'bi bi-cup-hot',
                    transport: 'bi bi-car-front',
                    entertainment: 'bi bi-controller',
                    utilities: 'bi bi-lightning',
                    healthcare: 'bi bi-heart-pulse',
                    shopping: 'bi bi-bag',
                    education: 'bi bi-book',
                    other: 'bi bi-three-dots'
                };
                return icons[category] || 'bi bi-tag';
            }
            
            // Function to show toast notification
            function showToast(message, type) {
                const toastContainer = document.querySelector('.toast-container');
                const toastId = 'toast-' + Date.now();
                
                const toastHTML = `
                    <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="d-flex">
                            <div class="toast-body">
                                ${message}
                            </div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                    </div>
                `;
                
                toastContainer.insertAdjacentHTML('beforeend', toastHTML);
                
                const toastElement = document.getElementById(toastId);
                const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
                toast.show();
                
                toastElement.addEventListener('hidden.bs.toast', function() {
                    toastElement.remove();
                });
            }
        });
  
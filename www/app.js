const { NativeBiometric } = window.Capacitor ? window.Capacitor.Plugins : {};
const { Filesystem, Directory, Encoding } = window.Capacitor ? window.Capacitor.Plugins : {};
const { Share } = window.Capacitor ? window.Capacitor.Plugins : {}; const STORAGE_KEY = "wallet_app_v1";
const DEFAULT_CATEGORIES = ["طعام", "مواصلات", "سكن", "فواتير", "تسوق", "راتب", "عمل إضافي", "ادخار"];

const defaultState = {
  transactions: [],
  loans: [],
  wallets: [],
  settings: {
    passwordHash: "",
    salt: "",
    profileName: "",
    categories: [...DEFAULT_CATEGORIES],
    biometricEnabled: false,
    biometricCredentialId: ""
  }
};

let state = loadState();
let currentRecordFilters = null;
let currentStatsRange = null;
let editingCategoryIndex = null;

const el = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  authHint: document.getElementById("authHint"),
  setupForm: document.getElementById("setupForm"),
  setupName: document.getElementById("setupName"),
  loginForm: document.getElementById("loginForm"),
  setupPassword: document.getElementById("setupPassword"),
  setupConfirmPassword: document.getElementById("setupConfirmPassword"),
  loginPassword: document.getElementById("loginPassword"),
  biometricLoginBtn: document.getElementById("biometricLoginBtn"),

  tabs: Array.from(document.querySelectorAll(".tab-btn")),
  tabContents: Array.from(document.querySelectorAll(".tab-content")),

  totalBalance: document.getElementById("totalBalance"),
  dashboardWelcome: document.getElementById("dashboardWelcome"),
  walletsCardsContainer: document.getElementById("walletsCardsContainer"),

  transactionForm: document.getElementById("transactionForm"),
  transactionId: document.getElementById("transactionId"),
  txAmount: document.getElementById("txAmount"),
  txType: Array.from(document.querySelectorAll("input[name=\"txType\"]")),
  txCategory: document.getElementById("txCategory"),
  txWallet: document.getElementById("txWallet"),
  categoryForm: document.getElementById("categoryForm"),
  categoryName: document.getElementById("categoryName"),
  categorySubmitBtn: document.getElementById("categorySubmitBtn"),
  categoryCancelEditBtn: document.getElementById("categoryCancelEditBtn"),
  categoriesList: document.getElementById("categoriesList"),
  txPerson: document.getElementById("txPerson"),
  txDate: document.getElementById("txDate"),
  txDetails: document.getElementById("txDetails"),
  txSubmitBtn: document.getElementById("txSubmitBtn"),
  txCancelEditBtn: document.getElementById("txCancelEditBtn"),
  transactionsTableBody: document.getElementById("transactionsTableBody"),

  loanForm: document.getElementById("loanForm"),
  loanId: document.getElementById("loanId"),
  loanAmount: document.getElementById("loanAmount"),
  loanDirection: document.getElementById("loanDirection"),
  loanWallet: document.getElementById("loanWallet"),
  loanPerson: document.getElementById("loanPerson"),
  loanDate: document.getElementById("loanDate"),
  loanDetails: document.getElementById("loanDetails"),
  loanSettled: document.getElementById("loanSettled"),
  loanSubmitBtn: document.getElementById("loanSubmitBtn"),
  loanCancelEditBtn: document.getElementById("loanCancelEditBtn"),
  loansTableBody: document.getElementById("loansTableBody"),

  filtersForm: document.getElementById("filtersForm"),
  filterKeyword: document.getElementById("filterKeyword"),
  filterType: document.getElementById("filterType"),
  filterPerson: document.getElementById("filterPerson"),
  filterFromDate: document.getElementById("filterFromDate"),
  filterToDate: document.getElementById("filterToDate"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  recordsTableBody: document.getElementById("recordsTableBody"),

  statIncome: document.getElementById("statIncome"),
  statExpense: document.getElementById("statExpense"),
  statLoanToMe: document.getElementById("statLoanToMe"),
  statLoanFromMe: document.getElementById("statLoanFromMe"),
  statLoanEffect: document.getElementById("statLoanEffect"),
  statLoansCount: document.getElementById("statLoansCount"),
  statRecordsCount: document.getElementById("statRecordsCount"),
  statsFilterForm: document.getElementById("statsFilterForm"),
  statsFromDate: document.getElementById("statsFromDate"),
  statsToDate: document.getElementById("statsToDate"),
  statsResetBtn: document.getElementById("statsResetBtn"),
  incomeExpenseChart: document.getElementById("incomeExpenseChart"),
  categoryChart: document.getElementById("categoryChart"),

  reportForm: document.getElementById("reportForm"),
  reportFrom: document.getElementById("reportFrom"),
  reportTo: document.getElementById("reportTo"),
  reportResult: document.getElementById("reportResult"),

  walletsTableBody: document.getElementById("walletsTableBody"),
  walletForm: document.getElementById("walletForm"),
  walletId: document.getElementById("walletId"),
  walletName: document.getElementById("walletName"),
  walletBalance: document.getElementById("walletBalance"),
  walletSubmitBtn: document.getElementById("walletSubmitBtn"),
  walletCancelEditBtn: document.getElementById("walletCancelEditBtn"),

  previewWalletsBtn: document.getElementById("previewWalletsBtn"),
  profileForm: document.getElementById("profileForm"),
  profileName: document.getElementById("profileName"),
  changePasswordForm: document.getElementById("changePasswordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  newPasswordConfirm: document.getElementById("newPasswordConfirm"),
  registerBiometricBtn: document.getElementById("registerBiometricBtn"),
  removeBiometricBtn: document.getElementById("removeBiometricBtn"),

  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  exportBackupBtn: document.getElementById("exportBackupBtn"),
  importBackupBtn: document.getElementById("importBackupBtn"),
  importBackupFile: document.getElementById("importBackupFile"),

  logoutBtn: document.getElementById("logoutBtn"),
  toast: document.getElementById("toast")
};

boot();

function boot() {
  bindEvents();
  setDefaultDateTimes();
  setDefaultReportRange();
  setDefaultStatsRange();
  initAuthMode();
}

function bindEvents() {
  el.setupForm.addEventListener("submit", onSetupPassword);
  el.loginForm.addEventListener("submit", onLoginPassword);
  el.biometricLoginBtn.addEventListener("click", onBiometricLogin);

  el.tabs.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  el.transactionForm.addEventListener("submit", onSaveTransaction);
  el.txCancelEditBtn.addEventListener("click", resetTransactionForm);
  el.transactionsTableBody.addEventListener("click", onTransactionTableClick);

  el.loanForm.addEventListener("submit", onSaveLoan);
  el.loanCancelEditBtn.addEventListener("click", resetLoanForm);
  el.loansTableBody.addEventListener("click", onLoanTableClick);

  el.filtersForm.addEventListener("submit", onApplyFilters);
  el.clearFiltersBtn.addEventListener("click", clearFilters);
  el.statsFilterForm.addEventListener("submit", onApplyStatsRange);
  el.statsResetBtn.addEventListener("click", onResetStatsRange);

  el.reportForm.addEventListener("submit", onGenerateReport);

  el.walletForm.addEventListener("submit", onSaveWallet);
  el.walletCancelEditBtn.addEventListener("click", resetWalletForm);
  el.walletsTableBody.addEventListener("click", onWalletTableClick);

  if (el.previewWalletsBtn) el.previewWalletsBtn.addEventListener("click", showWalletsPreview);
  el.profileForm.addEventListener("submit", onSaveProfileName);
  el.categoryForm.addEventListener("submit", onSaveCategory);
  el.categoryCancelEditBtn.addEventListener("click", resetCategoryForm);
  el.categoriesList.addEventListener("click", onCategoryListClick);
  el.changePasswordForm.addEventListener("submit", onChangePassword);
  el.registerBiometricBtn.addEventListener("click", onRegisterBiometric);
  el.removeBiometricBtn.addEventListener("click", onRemoveBiometric);

  el.exportBtn.addEventListener("click", onExportCsv);
  el.importFile.addEventListener("change", onImportCsv);
  el.exportBackupBtn.addEventListener("click", onExportJsonBackup);
  el.importBackupBtn.addEventListener("click", () => el.importBackupFile.click());
  el.importBackupFile.addEventListener("change", onImportJsonBackup);

  el.logoutBtn.addEventListener("click", logout);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
      settings: {
        passwordHash: parsed?.settings?.passwordHash || "",
        salt: parsed?.settings?.salt || "",
        profileName: parsed?.settings?.profileName || "",
        categories: normalizeCategories(parsed?.settings?.categories),
        biometricEnabled: Boolean(parsed?.settings?.biometricEnabled),
        biometricCredentialId: parsed?.settings?.biometricCredentialId || ""
      }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initAuthMode() {
  el.authSection.classList.remove("hidden");
  el.appSection.classList.add("hidden");

  const hasPassword = Boolean(state.settings.passwordHash);
  el.setupForm.classList.toggle("hidden", hasPassword);
  el.loginForm.classList.toggle("hidden", !hasPassword);
  el.biometricLoginBtn.classList.toggle("hidden", !state.settings.biometricEnabled);

  if (hasPassword) {
    el.authHint.textContent = `مرحبًا ${getDisplayName()}، أدخل كلمة المرور أو استخدم البصمة للدخول`;
    // فوكس تلقائي على خانة تسجيل الدخول
    setTimeout(() => {
      if (el.loginPassword) el.loginPassword.focus();
    }, 50);
  } else {
    el.authHint.textContent = "أول استخدام: أنشئ كلمة مرور لتأمين التطبيق";
    // فوكس تلقائي على خانة الاسم عند أول إعداد
    setTimeout(() => {
      if (el.setupName) el.setupName.focus();
    }, 50);
  }
}


async function onSetupPassword(event) {
  event.preventDefault();
  const profileName = cleanText(el.setupName.value);
  const password = el.setupPassword.value.trim();
  const confirm = el.setupConfirmPassword.value.trim();

  if (profileName.length < 2) {
    showToast("اكتب اسمًا صحيحًا (حرفان على الأقل)");
    return;
  }

  if (password.length < 4) {
    showToast("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
    return;
  }

  if (password !== confirm) {
    showToast("تأكيد كلمة المرور غير مطابق");
    return;
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  state.settings.salt = salt;
  state.settings.passwordHash = passwordHash;
  state.settings.profileName = profileName;
  saveState();

  el.setupForm.reset();
  showToast("تم تفعيل الحماية");
  initAuthMode();
}

async function onLoginPassword(event) {
  event.preventDefault();
  const password = el.loginPassword.value;
  const matched = await verifyPassword(password);

  if (!matched) {
    showToast("كلمة المرور غير صحيحة");
    return;
  }

  unlockApp();
  el.loginForm.reset();
}

async function verifyPassword(password) {
  if (!state.settings.passwordHash || !state.settings.salt) return false;
  const checkHash = await hashPassword(password, state.settings.salt);
  return checkHash === state.settings.passwordHash;
}

function unlockApp() {
  el.authSection.classList.add("hidden");
  el.appSection.classList.remove("hidden");
  updateWelcomeTexts();
  activateTab("transactionsTab");
  renderAll();
}

function logout() {
  initAuthMode();
  showToast("تم تسجيل الخروج");
}

function activateTab(tabId) {
  el.tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  el.tabContents.forEach((section) => {
    section.classList.toggle("hidden", section.id !== tabId);
  });
}

function setDefaultDateTimes() {
  el.txDate.value = getNowLocalDateTimeValue();
  el.loanDate.value = getNowLocalDateTimeValue();
}

function setDefaultReportRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  el.reportFrom.value = toDateInputValue(from);
  el.reportTo.value = toDateInputValue(today);
}

function setDefaultStatsRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  currentStatsRange = {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(today)
  };
  el.statsFromDate.value = currentStatsRange.fromDate;
  el.statsToDate.value = currentStatsRange.toDate;
}

function onApplyStatsRange(event) {
  event.preventDefault();
  const fromDate = el.statsFromDate.value;
  const toDate = el.statsToDate.value;
  if (!fromDate || !toDate) {
    showToast("حدد فترة الإحصائيات");
    return;
  }
  if (new Date(`${fromDate}T00:00:00`).getTime() > new Date(`${toDate}T23:59:59`).getTime()) {
    showToast("بداية الفترة يجب أن تكون قبل النهاية");
    return;
  }
  currentStatsRange = { fromDate, toDate };
  renderStats();
}

function onResetStatsRange() {
  setDefaultStatsRange();
  renderStats();
}

function applyLoanWalletImpact(loan, revert = false) {
  if (!loan || !loan.walletId) return;
  const wallet = state.wallets.find(w => w.id === loan.walletId);
  if (!wallet) return;

  const multiplier = revert ? -1 : 1;
  const amount = Number(loan.amount || 0);

  if (!loan.settled) {
    if (loan.direction === "from_me") {
      wallet.balance -= amount * multiplier;
    } else if (loan.direction === "to_me") {
      wallet.balance += amount * multiplier;
    }
  }
}

function onSaveTransaction(event) {
  event.preventDefault();

  const id = el.transactionId.value;
  const amount = Number(el.txAmount.value);
  const type = el.txType.find((input) => input.checked)?.value || "";
  const category = cleanText(el.txCategory.value);
  const walletId = el.txWallet ? el.txWallet.value : "";
  const person = cleanText(el.txPerson.value);
  const dateTime = el.txDate.value;
  const details = cleanText(el.txDetails.value);

  if (!walletId) {
    showToast("يرجى اختيار المحفظة أولاً");
    return;
  }

  if (!amount || amount <= 0 || !type || !category || !dateTime) {
    showToast("املأ كل البيانات المطلوبة للمعاملة");
    return;
  }

  const wallet = state.wallets.find(w => w.id === walletId);
  if (wallet) {
    if (id) {
      const oldTx = state.transactions.find(t => t.id === id);
      if (oldTx && oldTx.walletId) {
        const oldWallet = state.wallets.find(w => w.id === oldTx.walletId);
        if (oldWallet) {
          if (oldTx.type === "income") oldWallet.balance -= oldTx.amount;
          if (oldTx.type === "expense") oldWallet.balance += oldTx.amount;
        }
      }
    }
    if (type === "income") wallet.balance += amount;
    if (type === "expense") wallet.balance -= amount;
  }

  const payload = {
    id: id || generateId(),
    amount,
    type,
    category,
    walletId,
    person,
    dateTime,
    details,
    updatedAt: new Date().toISOString()
  };

  if (id) {
    const idx = state.transactions.findIndex((tx) => tx.id === id);
    if (idx !== -1) {
      payload.createdAt = state.transactions[idx].createdAt;
      state.transactions[idx] = payload;
      showToast("تم تحديث المعاملة");
    }
  } else {
    payload.createdAt = new Date().toISOString();
    state.transactions.push(payload);
    showToast("تمت إضافة المعاملة");
  }

  saveState();
  resetTransactionForm();
  renderAll();
}

function resetTransactionForm() {
  el.transactionId.value = "";
  el.transactionForm.reset();
  el.txDate.value = getNowLocalDateTimeValue();

  // لضبط خيار الصرف كخيار افتراضي:
  const expRadio = document.getElementById('typeExpense');
  if (expRadio) expRadio.checked = true;

  el.txSubmitBtn.textContent = "حفظ المعاملة";
  renderWalletsDropdown();
}

function onTransactionTableClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const id = actionButton.dataset.id;
  const action = actionButton.dataset.action;
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;

  if (action === "edit") {
    el.transactionId.value = tx.id;
    el.txAmount.value = tx.amount;
    el.txType.forEach((input) => { input.checked = input.value === tx.type; });
    el.txCategory.value = tx.category;
    if (el.txWallet) el.txWallet.value = tx.walletId || "";
    el.txPerson.value = tx.person || "";
    el.txDate.value = tx.dateTime;
    el.txDetails.value = tx.details || "";
    el.txSubmitBtn.textContent = "تحديث المعاملة";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete") {
    if (!confirm("حذف هذه المعاملة نهائيًا؟")) return;

    if (tx.walletId) {
      const wallet = state.wallets.find(w => w.id === tx.walletId);
      if (wallet) {
        if (tx.type === "income") wallet.balance -= tx.amount;
        if (tx.type === "expense") wallet.balance += tx.amount;
      }
    }

    state.transactions = state.transactions.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("تم حذف المعاملة");
  }
}

function onSaveLoan(event) {
  event.preventDefault();

  const id = el.loanId.value;
  const amount = Number(el.loanAmount.value);
  const direction = document.querySelector('input[name="loanDirection"]:checked')?.value || 'from_me';
  const walletId = el.loanWallet ? el.loanWallet.value : "";
  const person = cleanText(el.loanPerson.value);
  const dateTime = el.loanDate.value;
  const details = cleanText(el.loanDetails.value);
  const settled = Boolean(el.loanSettled.checked);

  if (!walletId) {
    showToast("يرجى اختيار المحفظة لتنفيذ حركة السلفة عليها");
    return;
  }

  if (!amount || amount <= 0 || !direction || !person || !dateTime) {
    showToast("املأ كل البيانات المطلوبة للسلفة");
    return;
  }

  if (id) {
    const oldLoan = state.loans.find(l => l.id === id);
    if (oldLoan) {
      applyLoanWalletImpact(oldLoan, true);
    }
  }

  const payload = {
    id: id || generateId(),
    amount,
    direction,
    walletId,
    person,
    dateTime,
    details,
    settled,
    updatedAt: new Date().toISOString()
  };

  applyLoanWalletImpact(payload, false);

  if (id) {
    const idx = state.loans.findIndex((loan) => loan.id === id);
    if (idx !== -1) {
      payload.createdAt = state.loans[idx].createdAt;
      state.loans[idx] = payload;
      showToast("تم تحديث السلفة");
    }
  } else {
    payload.createdAt = new Date().toISOString();
    state.loans.push(payload);
    showToast("تمت إضافة السلفة");
  }

  saveState();
  resetLoanForm();
  renderAll();
}

function resetLoanForm() {
  el.loanId.value = "";
  el.loanForm.reset();
  el.loanDate.value = getNowLocalDateTimeValue();
  el.loanSubmitBtn.textContent = "حفظ السلفة";
  renderWalletsDropdown();
}

function onLoanTableClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const id = actionButton.dataset.id;
  const action = actionButton.dataset.action;
  const loan = state.loans.find((item) => item.id === id);
  if (!loan) return;

  if (action === "edit") {
    el.loanId.value = loan.id;
    el.loanAmount.value = loan.amount;
    if (loan.direction === 'from_me') {
      const elFrom = document.getElementById('loanFromMe');
      if (elFrom) elFrom.checked = true;
    } else {
      const elTo = document.getElementById('loanToMe');
      if (elTo) elTo.checked = true;
    }
    if (el.loanWallet) el.loanWallet.value = loan.walletId || "";
    el.loanPerson.value = loan.person;
    el.loanDate.value = loan.dateTime;
    el.loanDetails.value = loan.details || "";
    el.loanSettled.checked = Boolean(loan.settled);
    el.loanSubmitBtn.textContent = "تحديث السلفة";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "toggle") {
    applyLoanWalletImpact(loan, true);
    loan.settled = !loan.settled;
    applyLoanWalletImpact(loan, false);

    loan.updatedAt = new Date().toISOString();
    saveState();
    renderAll();
    showToast(loan.settled ? "تم تسوية السلفة" : "تم إعادة فتح السلفة");
  }

  if (action === "delete") {
    if (!confirm("حذف هذه السلفة نهائيًا؟")) return;
    applyLoanWalletImpact(loan, true);
    state.loans = state.loans.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("تم حذف السلفة");
  }
}

function computeTotalWalletsBalance() {
  if (!Array.isArray(state.wallets)) return 0;
  return state.wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
}

function computeTotals() {
  const income = state.transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const expense = state.transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const loanEffect = state.loans.reduce((sum, loan) => {
    if (loan.settled) return sum;
    return sum + (loan.direction === "to_me" ? Number(loan.amount || 0) : -Number(loan.amount || 0));
  }, 0);

  const balance = computeTotalWalletsBalance();

  return { income, expense, loanEffect, balance };
}

function renderAll() {
  const totals = computeTotals();
  renderWalletsCards();
  renderWalletsDropdown();
  renderTransactionCategories();
  renderCategoriesList();
  updateWelcomeTexts();
  renderTransactionsTable();
  renderLoansTable();
  renderRecordsTable(currentRecordFilters);
  renderWalletsTable();
  if (!document.getElementById("statsTab").classList.contains("hidden")) {
    renderStats();
  }
}

function renderWalletsCards() {
  if (!el.walletsCardsContainer) return;

  if (!Array.isArray(state.wallets) || state.wallets.length === 0) {
    el.walletsCardsContainer.innerHTML = `
      <div class="empty-wallets-card">
        لا توجد محافظ. <button type="button" class="btn btn-primary" onclick="activateTab('settingsTab')">+ أضف محفظة من الإعدادات</button>
      </div>
    `;
    return;
  }

  const cardsHtml = state.wallets.map(w => `
    <div class="wallet-card-mini">
      <span class="wallet-name-mini">${escapeHtml(w.name)}:</span>
      <span class="wallet-balance-mini">${formatMoney(w.balance)}</span>
    </div>
  `).join("");

  el.walletsCardsContainer.innerHTML = cardsHtml;
}

function renderWalletsDropdown() {
  const walletOptions = (!Array.isArray(state.wallets) || state.wallets.length === 0)
    ? '<option value="">لا توجد محافظ (أضف محفظة أولاً)</option>'
    : state.wallets.map(w => `<option value="${w.id}">${escapeHtml(w.name)} (${formatMoney(w.balance)})</option>`).join("");

  if (el.txWallet) {
    el.txWallet.innerHTML = walletOptions;
    if (state.wallets.length > 0 && !el.txWallet.value) el.txWallet.value = state.wallets[0].id;
  }

  if (el.loanWallet) {
    el.loanWallet.innerHTML = walletOptions;
    if (state.wallets.length > 0 && !el.loanWallet.value) el.loanWallet.value = state.wallets[0].id;
  }
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [...DEFAULT_CATEGORIES];
  const normalized = categories
    .map((category) => cleanText(category))
    .filter(Boolean)
    .slice(0, 40);
  return normalized.length ? [...new Set(normalized)] : [...DEFAULT_CATEGORIES];
}

function renderTransactionCategories(selectedCategory = el.txCategory?.value || "") {
  if (!el.txCategory) return;
  const categories = normalizeCategories(state.settings.categories);
  state.settings.categories = categories;
  const hasSelectedCategory = selectedCategory && !categories.includes(selectedCategory);
  const options = [
    '<option value="">اختر التصنيف</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ];

  if (hasSelectedCategory) {
    options.push(`<option value="${escapeHtml(selectedCategory)}">${escapeHtml(selectedCategory)} (تصنيف محفوظ)</option>`);
  }

  el.txCategory.innerHTML = options.join("");
  el.txCategory.value = selectedCategory;
}

function renderCategoriesList() {
  if (!el.categoriesList) return;
  const categories = normalizeCategories(state.settings.categories);
  state.settings.categories = categories;
  el.categoriesList.innerHTML = categories.map((category, index) => `
    <div class="category-item">
      <span class="category-order">${index + 1}</span>
      <strong>${escapeHtml(category)}</strong>
      <div class="category-actions">
        <button type="button" class="icon-btn" data-category-action="up" data-index="${index}" title="تحريك للأعلى" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="icon-btn" data-category-action="down" data-index="${index}" title="تحريك للأسفل" ${index === categories.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="icon-btn" data-category-action="edit" data-index="${index}">تعديل</button>
        <button type="button" class="icon-btn icon-btn-danger" data-category-action="delete" data-index="${index}">حذف</button>
      </div>
    </div>
  `).join("");
}

function onSaveCategory(event) {
  event.preventDefault();
  const categoryName = cleanText(el.categoryName.value);
  const categories = normalizeCategories(state.settings.categories);

  if (!categoryName) {
    showToast("اكتب اسم التصنيف");
    return;
  }

  const duplicateIndex = categories.findIndex((category) => category.localeCompare(categoryName, "ar", { sensitivity: "accent" }) === 0);
  if (duplicateIndex !== -1 && duplicateIndex !== editingCategoryIndex) {
    showToast("هذا التصنيف موجود بالفعل");
    return;
  }

  if (editingCategoryIndex === null) {
    categories.push(categoryName);
    showToast("تمت إضافة التصنيف");
  } else {
    categories[editingCategoryIndex] = categoryName;
    showToast("تم تحديث التصنيف");
  }

  state.settings.categories = categories;
  saveState();
  resetCategoryForm();
  renderTransactionCategories();
  renderCategoriesList();
}

function onCategoryListClick(event) {
  const button = event.target.closest("button[data-category-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  const action = button.dataset.categoryAction;
  const categories = normalizeCategories(state.settings.categories);
  if (!Number.isInteger(index) || !categories[index]) return;

  if (action === "edit") {
    editingCategoryIndex = index;
    el.categoryName.value = categories[index];
    el.categorySubmitBtn.textContent = "حفظ التعديل";
    el.categoryCancelEditBtn.classList.remove("hidden");
    el.categoryName.focus();
    return;
  }

  if (action === "delete") {
    if (categories.length === 1) {
      showToast("يجب الاحتفاظ بتصنيف واحد على الأقل");
      return;
    }
    if (!confirm(`حذف تصنيف "${categories[index]}"؟`)) return;
    categories.splice(index, 1);
    showToast("تم حذف التصنيف");
  }

  if (action === "up" && index > 0) {
    [categories[index - 1], categories[index]] = [categories[index], categories[index - 1]];
  }

  if (action === "down" && index < categories.length - 1) {
    [categories[index], categories[index + 1]] = [categories[index + 1], categories[index]];
  }

  state.settings.categories = categories;
  saveState();
  renderTransactionCategories();
  renderCategoriesList();
}

function resetCategoryForm() {
  editingCategoryIndex = null;
  el.categoryForm.reset();
  el.categorySubmitBtn.textContent = "إضافة التصنيف";
  el.categoryCancelEditBtn.classList.add("hidden");
}

function onSaveProfileName(event) {
  event.preventDefault();
  const profileName = cleanText(el.profileName.value);
  if (profileName.length < 2) {
    showToast("الاسم يجب أن يكون حرفين على الأقل");
    return;
  }
  state.settings.profileName = profileName;
  saveState();
  updateWelcomeTexts();
  initAuthMode();
  showToast("تم حفظ الاسم");
}

function updateWelcomeTexts() {
  if (!el.dashboardWelcome) return;
  const name = getDisplayName();
  el.dashboardWelcome.textContent = `مرحبًا ${name}، إدارة المعاملات والسلف والتقارير بشكل محلي وآمن`;
  if (el.profileName && document.activeElement !== el.profileName) {
    el.profileName.value = state.settings.profileName || "";
  }
}

function getDisplayName() {
  return cleanText(state?.settings?.profileName) || "بك";
}

function renderTransactionsTable() {
  const rows = [...state.transactions].sort(sortByDateDesc).map((tx) => {
    const badgeClass = tx.type === "income" ? "badge-income" : "badge-expense";
    const typeText = tx.type === "income" ? "استلام" : "صرف";
    const wallet = state.wallets.find(w => w.id === tx.walletId);
    const walletName = wallet ? wallet.name : "غير محددة";
    return `
      <tr>
        <td data-label="النوع"><span class="badge ${badgeClass}">${typeText}</span></td>
        <td data-label="المبلغ">${formatMoney(tx.amount)}</td>
        <td data-label="التصنيف">${escapeHtml(tx.category)}</td>
        <td data-label="المحفظة">${escapeHtml(walletName)}</td>
        <td data-label="الشخص">${escapeHtml(tx.person || "-")}</td>
        <td data-label="الوقت">${formatDateTime(tx.dateTime)}</td>
        <td data-label="التفاصيل">${escapeHtml(tx.details || "-")}</td>
        <td data-label="إجراء">
          <button class="btn" data-action="edit" data-id="${tx.id}">تعديل</button>
          <button class="btn" data-action="delete" data-id="${tx.id}">حذف</button>
        </td>
      </tr>`;
  });

  el.transactionsTableBody.innerHTML = rows.join("") || `<tr><td colspan="8">لا توجد معاملات بعد</td></tr>`;
}

function renderLoansTable() {
  const rows = [...state.loans].sort(sortByDateDesc).map((loan) => {
    const typeText = loan.direction === "to_me" ? "سلفة إلي" : "سلفة مني";
    const status = loan.settled ? "تم الرد" : "غير مردودة";
    const wallet = state.wallets.find(w => w.id === loan.walletId);
    const walletName = wallet ? wallet.name : "غير محددة";

    return `
      <tr>
        <td data-label="النوع"><span class="badge badge-loan">${typeText}</span></td>
        <td data-label="المبلغ">${formatMoney(loan.amount)}</td>
        <td data-label="المحفظة">${escapeHtml(walletName)}</td>
        <td data-label="الشخص">${escapeHtml(loan.person)}</td>
        <td data-label="الوقت">${formatDateTime(loan.dateTime)}</td>
        <td data-label="الحالة">${status}</td>
        <td data-label="التفاصيل">${escapeHtml(loan.details || "-")}</td>
        <td data-label="إجراء">
          <button class="btn" data-action="edit" data-id="${loan.id}">تعديل</button>
          <button class="btn" data-action="toggle" data-id="${loan.id}">${loan.settled ? "إلغاء الرد" : "تم الرد"}</button>
          <button class="btn" data-action="delete" data-id="${loan.id}">حذف</button>
        </td>
      </tr>`;
  });

  el.loansTableBody.innerHTML = rows.join("") || `<tr><td colspan="8">لا توجد سلف بعد</td></tr>`;
}

function getUnifiedRecords() {
  const txRecords = state.transactions.map((tx) => ({
    source: "transaction",
    id: tx.id,
    type: tx.type,
    typeLabel: tx.type === "income" ? "استلام" : "صرف",
    amount: Number(tx.amount || 0),
    categoryOrPerson: tx.category,
    person: tx.person || "",
    details: tx.details || "",
    dateTime: tx.dateTime,
    status: "-"
  }));

  const loanRecords = state.loans.map((loan) => ({
    source: "loan",
    id: loan.id,
    type: loan.direction,
    typeLabel: loan.direction === "to_me" ? "سلفة إلي" : "سلفة مني",
    amount: Number(loan.amount || 0),
    categoryOrPerson: loan.person,
    person: loan.person,
    details: loan.details || "",
    dateTime: loan.dateTime,
    status: loan.settled ? "تم الرد" : "غير مردودة"
  }));

  return [...txRecords, ...loanRecords].sort(sortByDateDesc);
}

function onApplyFilters(event) {
  event.preventDefault();
  currentRecordFilters = {
    keyword: cleanText(el.filterKeyword.value),
    type: el.filterType.value,
    person: cleanText(el.filterPerson.value),
    fromDate: el.filterFromDate.value,
    toDate: el.filterToDate.value
  };
  renderRecordsTable(currentRecordFilters);
}

function clearFilters() {
  el.filtersForm.reset();
  currentRecordFilters = null;
  renderRecordsTable(null);
}

function renderRecordsTable(filters) {
  let records = getUnifiedRecords();

  if (filters) {
    const keyword = (filters.keyword || "").toLowerCase();
    const person = (filters.person || "").toLowerCase();

    if (keyword) {
      records = records.filter((rec) => {
        const joined = [rec.typeLabel, rec.categoryOrPerson, rec.person, rec.details]
          .join(" ")
          .toLowerCase();
        return joined.includes(keyword);
      });
    }

    if (filters.type && filters.type !== "all") {
      records = records.filter((rec) => rec.type === filters.type);
    }

    if (person) {
      records = records.filter((rec) => (rec.person || "").toLowerCase().includes(person));
    }

    if (filters.fromDate) {
      const from = new Date(`${filters.fromDate}T00:00:00`).getTime();
      records = records.filter((rec) => new Date(rec.dateTime).getTime() >= from);
    }

    if (filters.toDate) {
      const to = new Date(`${filters.toDate}T23:59:59`).getTime();
      records = records.filter((rec) => new Date(rec.dateTime).getTime() <= to);
    }
  }

  const rows = records.map((rec) => `
    <tr>
      <td data-label="السجل">${rec.source === "transaction" ? "معاملة" : "سلفة"}</td>
      <td data-label="النوع">${rec.typeLabel}</td>
      <td data-label="المبلغ">${formatMoney(rec.amount)}</td>
      <td data-label="التصنيف / الشخص">${escapeHtml(rec.categoryOrPerson || "-")}</td>
      <td data-label="الوقت">${formatDateTime(rec.dateTime)}</td>
      <td data-label="الحالة">${escapeHtml(rec.status)}</td>
      <td data-label="التفاصيل">${escapeHtml(rec.details || "-")}</td>
    </tr>
  `);

  el.recordsTableBody.innerHTML = rows.join("") || `<tr><td colspan="7">لا توجد نتائج مطابقة</td></tr>`;
}

function renderStats() {
  const { transactions, loans } = getStatsRangeData();
  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const expense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const loanToMe = loans
    .filter((loan) => loan.direction === "to_me")
    .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const loanFromMe = loans
    .filter((loan) => loan.direction === "from_me")
    .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const loanEffect = loans.reduce((sum, loan) => {
    if (loan.settled) return sum;
    return sum + (loan.direction === "to_me" ? Number(loan.amount || 0) : -Number(loan.amount || 0));
  }, 0);

  el.statIncome.textContent = formatMoney(income);
  el.statExpense.textContent = formatMoney(expense);
  el.statLoanToMe.textContent = formatMoney(loanToMe);
  el.statLoanFromMe.textContent = formatMoney(loanFromMe);
  el.statLoanEffect.textContent = formatMoney(loanEffect);
  el.statLoansCount.textContent = String(loans.length);
  el.statRecordsCount.textContent = String(transactions.length + loans.length);

  drawIncomeExpenseChart(el.incomeExpenseChart, income, expense);
  drawCategoryChart(el.categoryChart, summarizeCategoriesByType(transactions));
}

function getStatsRangeData() {
  if (!currentStatsRange?.fromDate || !currentStatsRange?.toDate) {
    return { transactions: state.transactions, loans: state.loans };
  }
  const from = new Date(`${currentStatsRange.fromDate}T00:00:00`).getTime();
  const to = new Date(`${currentStatsRange.toDate}T23:59:59`).getTime();
  const transactions = state.transactions.filter((tx) => {
    const time = new Date(tx.dateTime).getTime();
    return time >= from && time <= to;
  });
  const loans = state.loans.filter((loan) => {
    const time = new Date(loan.dateTime).getTime();
    return time >= from && time <= to;
  });
  return { transactions, loans };
}

function summarizeCategoriesByType(transactions) {
  const incomeMap = new Map();
  const expenseMap = new Map();

  transactions.forEach((tx) => {
    const key = tx.category || "غير مصنف";
    const target = tx.type === "income" ? incomeMap : expenseMap;
    const prev = target.get(key) || 0;
    target.set(key, prev + Number(tx.amount || 0));
  });

  const toSortedList = (map) => Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    income: toSortedList(incomeMap),
    expense: toSortedList(expenseMap)
  };
}

function drawIncomeExpenseChart(canvas, income, expense) {
  const { ctx, w, h } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#9db0c3";
  ctx.font = "14px Alexandria, Cairo, sans-serif";
  ctx.fillText("استلام", 95, h - 18);
  ctx.fillText("صرف", w - 135, h - 18);

  const max = Math.max(income, expense, 1);
  const barMaxHeight = h - 70;
  const incomeHeight = (income / max) * barMaxHeight;
  const expenseHeight = (expense / max) * barMaxHeight;

  const barWidth = 90;
  const incomeX = 70;
  const expenseX = w - 160;

  ctx.fillStyle = "#10b981";
  ctx.fillRect(incomeX, h - 40 - incomeHeight, barWidth, incomeHeight);

  ctx.fillStyle = "#ef4444";
  ctx.fillRect(expenseX, h - 40 - expenseHeight, barWidth, expenseHeight);

  ctx.fillStyle = "#d9e9f8";
  ctx.font = "12px Alexandria, Cairo, sans-serif";
  ctx.fillText(formatMoney(income), incomeX, h - 45 - incomeHeight);
  ctx.fillText(formatMoney(expense), expenseX, h - 45 - expenseHeight);
}

function drawCategoryChart(canvas, categoriesByType) {
  const { ctx, w, h } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const incomeCategories = categoriesByType?.income || [];
  const expenseCategories = categoriesByType?.expense || [];

  if (!incomeCategories.length && !expenseCategories.length) {
    ctx.fillStyle = "#9db0c3";
    ctx.font = "14px Alexandria, Cairo, sans-serif";
    ctx.fillText("لا توجد بيانات كافية للرسم", 120, 120);
    return;
  }

  const half = Math.floor(w / 2);
  const radius = Math.max(32, Math.min(56, Math.floor(Math.min(half, h) * 0.24)));
  const centerY = Math.floor(h * 0.37);
  const legendTop = Math.floor(h * 0.68);
  const incomeCenterX = Math.floor(half * 0.5);
  const expenseCenterX = Math.floor(half * 1.5);

  drawSingleDonut(
    ctx,
    incomeCategories,
    incomeCenterX,
    centerY,
    radius,
    "تصنيفات الاستلام",
    ["#22c55e", "#38bdf8", "#84cc16", "#14b8a6", "#a3e635"],
    legendTop,
    Math.max(10, incomeCenterX - radius - 20)
  );

  drawSingleDonut(
    ctx,
    expenseCategories,
    expenseCenterX,
    centerY,
    radius,
    "تصنيفات الصرف",
    ["#ef4444", "#f97316", "#eab308", "#fb7185", "#f43f5e"],
    legendTop,
    Math.max(half + 10, expenseCenterX - radius - 20)
  );
}

function drawSingleDonut(ctx, categories, cx, cy, radius, title, colors, legendTop, legendX) {
  const total = categories.reduce((sum, c) => sum + c.total, 0);
  ctx.fillStyle = "#9db0c3";
  ctx.font = "12px Alexandria, Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, cx, cy - radius - 12);

  if (!categories.length || total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(157, 176, 195, 0.35)";
    ctx.lineWidth = Math.max(10, Math.floor(radius * 0.32));
    ctx.stroke();
    ctx.fillStyle = "#9db0c3";
    ctx.fillText("0", cx, cy + 4);
    ctx.textAlign = "start";
    return;
  }

  let start = -Math.PI / 2;
  categories.forEach((item, index) => {
    const angle = (item.total / total) * Math.PI * 2;
    const end = start + angle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start = end;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(16, Math.floor(radius * 0.56)), 0, Math.PI * 2);
  ctx.fillStyle = "#111b26";
  ctx.fill();
  ctx.fillStyle = "#d9e9f8";
  ctx.font = "11px Alexandria, Cairo, sans-serif";
  ctx.fillText(formatMoney(total), cx, cy + 4);

  ctx.textAlign = "start";
  ctx.font = "11px Alexandria, Cairo, sans-serif";
  categories.slice(0, 3).forEach((item, index) => {
    const y = legendTop + index * 16;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(legendX, y - 8, 9, 9);
    ctx.fillStyle = "#d9e9f8";
    ctx.fillText(`${item.name}: ${formatMoney(item.total)}`, legendX + 14, y);
  });
}

function prepareCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = Math.max(260, Math.floor(canvas.clientWidth || 400));
  const cssHeight = canvas.id === "categoryChart" ? 290 : 250;
  const nextWidth = Math.floor(cssWidth * ratio);
  const nextHeight = Math.floor(cssHeight * ratio);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: cssWidth, h: cssHeight };
}

function onGenerateReport(event) {
  event.preventDefault();

  const from = el.reportFrom.value;
  const to = el.reportTo.value;
  if (!from || !to) {
    showToast("حدد تاريخ البداية والنهاية");
    return;
  }

  const fromTs = new Date(`${from}T00:00:00`).getTime();
  const toTs = new Date(`${to}T23:59:59`).getTime();
  if (fromTs > toTs) {
    showToast("تاريخ البداية يجب أن يكون قبل النهاية");
    return;
  }

  const periodTx = state.transactions.filter((tx) => {
    const t = new Date(tx.dateTime).getTime();
    return t >= fromTs && t <= toTs;
  });

  const periodLoans = state.loans.filter((loan) => {
    const t = new Date(loan.dateTime).getTime();
    return t >= fromTs && t <= toTs;
  });

  const income = periodTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const expense = periodTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const loansToMeList = periodLoans.filter((l) => l.direction === "to_me");
  const loansFromMeList = periodLoans.filter((l) => l.direction === "from_me");
  const loansToMe = loansToMeList.reduce((s, l) => s + Number(l.amount || 0), 0);
  const loansFromMe = loansFromMeList.reduce((s, l) => s + Number(l.amount || 0), 0);
  const unsettledToMe = loansToMeList
    .filter((l) => !l.settled)
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const unsettledFromMe = loansFromMeList
    .filter((l) => !l.settled)
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const unsettledLoanEffect = periodLoans.reduce((s, l) => {
    if (l.settled) return s;
    return s + (l.direction === "to_me" ? Number(l.amount || 0) : -Number(l.amount || 0));
  }, 0);

  const netWithoutLoans = income - expense;
  const netWithLoanEffect = netWithoutLoans + unsettledLoanEffect;

  const lines = [
    `<h4>تقرير من ${escapeHtml(from)} إلى ${escapeHtml(to)}</h4>`,
    `<p>إجمالي الاستلام: <strong>${formatMoney(income)}</strong></p>`,
    `<p>إجمالي الصرف: <strong>${formatMoney(expense)}</strong></p>`,
    `<p>الفرق (استلام - صرف): <strong>${formatMoney(netWithoutLoans)}</strong></p>`,
    `<p>السلف إليّ: <strong>${formatMoney(loansToMe)}</strong> | العدد: <strong>${loansToMeList.length}</strong></p>`,
    `<p>السلف منّي: <strong>${formatMoney(loansFromMe)}</strong> | العدد: <strong>${loansFromMeList.length}</strong></p>`,
    `<p>غير المردود (إليّ): <strong>${formatMoney(unsettledToMe)}</strong></p>`,
    `<p>غير المردود (منّي): <strong>${formatMoney(unsettledFromMe)}</strong></p>`,
    `<p>أثر السلف غير المردودة خلال الفترة: <strong>${formatMoney(unsettledLoanEffect)}</strong></p>`,
    `<p>الصافي النهائي مع أثر السلف: <strong>${formatMoney(netWithLoanEffect)}</strong></p>`,
    `<p>عدد المعاملات: <strong>${periodTx.length}</strong> | عدد السلف: <strong>${periodLoans.length}</strong></p>`
  ];

  el.reportResult.innerHTML = lines.join("\n");
  el.reportResult.classList.remove("hidden");
}

async function onChangePassword(event) {
  event.preventDefault();
  const current = el.currentPassword.value;
  const next = el.newPassword.value.trim();
  const confirm = el.newPasswordConfirm.value.trim();

  const ok = await verifyPassword(current);
  if (!ok) {
    showToast("كلمة المرور الحالية غير صحيحة");
    return;
  }

  if (next.length < 4) {
    showToast("كلمة المرور الجديدة قصيرة");
    return;
  }

  if (next !== confirm) {
    showToast("تأكيد كلمة المرور الجديدة غير مطابق");
    return;
  }

  const salt = generateSalt();
  state.settings.salt = salt;
  state.settings.passwordHash = await hashPassword(next, salt);
  saveState();
  el.changePasswordForm.reset();
  showToast("تم تغيير كلمة المرور");
}

// 1. دالة تسجيل/تفعيل البصمة
async function onRegisterBiometric() {
  try {
    // التأكد إن الجهاز فيه بصمة ومتفعلة
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) {
      showToast("البصمة غير متاحة على هذا الجهاز");
      return;
    }

    // إظهار نافذة البصمة لتأكيد هوية المستخدم أول مرة
    await NativeBiometric.verifyIdentity({
      reason: "تأكيد البصمة لتفعيل الدخول السريع",
      title: "تفعيل البصمة",
      subtitle: "استخدم بصمة الاصبع أو الوجه",
      description: "يرجى اللمس للمتابعة"
    });

    // حفظ حالة التفعيل في الـ state
    state.settings.biometricEnabled = true;
    saveState();
    initAuthMode();
    showToast("تم تفعيل البصمة بنجاح");
  } catch (err) {
    showToast("فشلت عملية تفعيل البصمة");
  }
}

// 2. دالة الدخول بالبصمة
async function onBiometricLogin() {
  if (!state.settings.biometricEnabled) {
    showToast("البصمة غير مفعلة");
    return;
  }

  try {
    // إظهار نافذة البصمة الخاصة بالاندرويد
    await NativeBiometric.verifyIdentity({
      reason: "تسجيل الدخول للمحفظة",
      title: "تسجيل الدخول",
      subtitle: "المحفظة الذكية",
      description: "يرجى مسح البصمة للدخول"
    });

    // لو البصمة صحيحة هيعدي السطر اللي فوق ويدخل هنا تلقائياً
    unlockApp();
    showToast("تم الدخول بنجاح");
  } catch (err) {
    showToast("فشل التحقق من البصمة");
  }
}

// 3. دالة إلغاء البصمة
function onRemoveBiometric() {
  if (!state.settings.biometricEnabled) {
    showToast("البصمة غير مفعلة بالفعل");
    return;
  }

  state.settings.biometricEnabled = false;
  saveState();
  initAuthMode();
  showToast("تم إيقاف تفعيل البصمة بنجاح");
}

function onSaveWallet(event) {
  event.preventDefault();
  const id = el.walletId.value;
  const name = cleanText(el.walletName.value);
  const balance = Number(el.walletBalance.value);

  if (!name) {
    showToast("اكتب اسم المحفظة");
    return;
  }

  if (id) {
    const wallet = state.wallets.find(w => w.id === id);
    if (wallet) {
      wallet.name = name;
      wallet.balance = balance;
      showToast("تم تحديث المحفظة");
    }
  } else {
    state.wallets.push({
      id: generateId(),
      name,
      balance
    });
    showToast("تمت إضافة المحفظة");
  }

  saveState();
  resetWalletForm();
  renderAll();
}

function resetWalletForm() {
  el.walletId.value = "";
  el.walletForm.reset();
  el.walletSubmitBtn.textContent = "حفظ المحفظة";
  el.walletCancelEditBtn.classList.add("hidden");
}

function onWalletTableClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const wallet = state.wallets.find(w => w.id === id);
  if (!wallet) return;

  if (action === "edit") {
    el.walletId.value = wallet.id;
    el.walletName.value = wallet.name;
    el.walletBalance.value = wallet.balance;
    el.walletSubmitBtn.textContent = "تحديث المحفظة";
    el.walletCancelEditBtn.classList.remove("hidden");
  }

  if (action === "delete") {
    if (!confirm(`حذف محفظة "${wallet.name}"؟`)) return;
    state.wallets = state.wallets.filter(w => w.id !== id);
    saveState();
    renderAll();
    showToast("تم حذف المحفظة");
  }
}

function renderWalletsTable() {
  if (!el.walletsTableBody) return;
  const rows = state.wallets.map(w => `
    <tr>
      <td>${escapeHtml(w.name)}</td>
      <td>${formatMoney(w.balance)}</td>
      <td>
        <button class="btn" data-action="edit" data-id="${w.id}">تعديل</button>
        <button class="btn" data-action="delete" data-id="${w.id}">حذف</button>
      </td>
    </tr>
  `).join("");

  el.walletsTableBody.innerHTML = rows || `<tr><td colspan="3">لا توجد محافظ معرفة بعد</td></tr>`;
}

function onExportCsv() {
  const records = getUnifiedRecords();
  if (!records.length) {
    showToast("لا توجد بيانات للتصدير");
    return;
  }

  let csv = "المصدر,النوع,المبلغ,التصنيف_أو_الشخص,الشخص,التاريخ,الحالة,التفاصيل\n";
  records.forEach((r) => {
    const row = [
      r.source === "transaction" ? "معاملة" : "سلفة",
      r.typeLabel,
      r.amount,
      `"${(r.categoryOrPerson || "").replace(/"/g, '""')}"`,
      `"${(r.person || "").replace(/"/g, '""')}"`,
      r.dateTime,
      r.status,
      `"${(r.details || "").replace(/"/g, '""')}"`
    ];
    csv += row.join(",") + "\n";
  });

  downloadFile("wallet_export.csv", "text/csv;charset=utf-8;", csv);
  showToast("تم تصدير ملف CSV");
}

function onImportCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast("الملف لا يحتوي بيانات");
        return;
      }

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
        if (parts.length >= 6) {
          const source = parts[0];
          const typeLabel = parts[1];
          const amount = Number(parts[2]);
          const catOrPerson = parts[3];
          const person = parts[4];
          const dateTime = parts[5];
          const details = parts[7] || "";

          if (amount > 0 && dateTime) {
            if (source === "سلفة") {
              state.loans.push({
                id: generateId(),
                amount,
                direction: typeLabel === "سلفة إلي" ? "to_me" : "from_me",
                walletId: state.wallets[0]?.id || "",
                person: person || catOrPerson || "غير محدد",
                dateTime,
                details,
                settled: parts[6] === "تم الرد",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            } else {
              state.transactions.push({
                id: generateId(),
                amount,
                type: typeLabel === "استلام" ? "income" : "expense",
                category: catOrPerson || "عام",
                walletId: state.wallets[0]?.id || "",
                person,
                dateTime,
                details,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
            importedCount++;
          }
        }
      }

      saveState();
      renderAll();
      showToast(`تم استيراد ${importedCount} سجل بنجاح`);
    } catch {
      showToast("فشل استيراد CSV، تأكد من تنسيق الملف");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function onExportJsonBackup() {
  const data = JSON.stringify(state, null, 2);
  downloadFile("wallet_backup.json", "application/json", data);
  showToast("تم تصدير النسخة الاحتياطية JSON");
}

function onImportJsonBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && typeof parsed === "object") {
        state = {
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          loans: Array.isArray(parsed.loans) ? parsed.loans : [],
          wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
          settings: {
            passwordHash: parsed?.settings?.passwordHash || "",
            salt: parsed?.settings?.salt || "",
            profileName: parsed?.settings?.profileName || "",
            categories: normalizeCategories(parsed?.settings?.categories),
            biometricEnabled: Boolean(parsed?.settings?.biometricEnabled),
            biometricCredentialId: parsed?.settings?.biometricCredentialId || ""
          }
        };
        saveState();
        initAuthMode();
        renderAll();
        showToast("تم استعادة النسخة الاحتياطية بنجاح");
      }
    } catch {
      showToast("ملف JSON غير صالح");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function downloadFile(filename, type, content) {
  // لو شغال على أندرويد (تطبيق Capacitor)
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      // 1. كتابة الملف في مجلد Cache/Documents الخاص بالتطبيق
      const result = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 2. فتح قائمة المشاركة لإنزال الملف أو حفظه في الموبايل
      await Share.share({
        title: 'تصدير بيانات المحفظة',
        text: `ملف ${filename}`,
        url: result.uri,
        dialogTitle: 'حفظ الملف أو مشاركته'
      });

      showToast("تم جاهزية الملف للتصدير");
    } catch (err) {
      console.error("Export Error:", err);
      showToast("فشل تصدير الملف على الجهاز");
    }
  } else {
    // لو شغال على متصفح عادي (Web Browser)
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}


function showWalletsPreview() {
  const content = state.wallets.map(w => `${w.name}: ${formatMoney(w.balance)}`).join("\n");
  alert(content || "لا توجد محافظ بعد");
}

function generateId() {
  return "id_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
}

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password + salt),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bufferFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ج.م";
}

function formatDateTime(dt) {
  if (!dt) return "-";
  const date = new Date(dt);
  if (isNaN(date.getTime())) return dt;
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function sortByDateDesc(a, b) {
  return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
}

function cleanText(txt) {
  return typeof txt === "string" ? txt.trim() : "";
}

function getNowLocalDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toDateInputValue(dateObj) {
  const offset = dateObj.getTimezoneOffset();
  const local = new Date(dateObj.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  setTimeout(() => {
    el.toast.classList.add("hidden");
  }, 3000);
}


// دالة لتحديث الرصيد ورسم المحافظ داخل التوست
function updateBalanceToastUI() {
  const totalBalanceEl = document.getElementById('totalBalance');
  const walletsContainerEl = document.getElementById('walletsContainer');

  if (!walletsContainerEl) return;

  // 1. حساب وإظهار إجمالي الرصيد الكلي
  // (تأكد من استخدام المتغير أو الدالة الخاصة بحساب الرصيد عندك مثل calculateTotalBalance)
  let totalBalance = 0;
  if (typeof state !== 'undefined' && state.wallets) {
    totalBalance = state.wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
  }

  if (totalBalanceEl) {
    totalBalanceEl.textContent = `${totalBalance.toLocaleString('ar-EG')} ج.م`;
  }

  // 2. رسم المحافظ داخل التوست
  walletsContainerEl.innerHTML = '';

  if (!state || !state.wallets || state.wallets.length === 0) {
    walletsContainerEl.innerHTML = `<div class="empty-wallets-card">لا توجد محافظ مسجلة حتى الآن</div>`;
    return;
  }

  // عمل Loop على كل محفظة وإنشاء الكارت الخاص بها
  state.wallets.forEach(wallet => {
    const walletItem = document.createElement('div');
    walletItem.className = 'toast-wallet-item';
    walletItem.innerHTML = `
      <span class="toast-wallet-name">${wallet.name}</span>
      <strong class="toast-wallet-balance">${Number(wallet.balance || 0).toLocaleString('ar-EG')} ج.م</strong>
    `;
    walletsContainerEl.appendChild(walletItem);
  });
}

const openToastBtn = document.getElementById('openBalanceToastBtn');
const closeToastBtn = document.getElementById('closeBalanceToastBtn');
const balanceToastModal = document.getElementById('balanceToastModal');

if (openToastBtn && balanceToastModal) {
  openToastBtn.addEventListener('click', () => {
    // تحديث البيانات أول ما نضغط على الزرار
    updateBalanceToastUI();
    balanceToastModal.classList.remove('hidden');
  });
}

if (closeToastBtn && balanceToastModal) {
  closeToastBtn.addEventListener('click', () => {
    balanceToastModal.classList.add('hidden');
  });
}

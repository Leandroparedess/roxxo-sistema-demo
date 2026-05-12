const STORAGE_KEY = "control-boliche-v1";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialState = () => ({
  nightOpen: true,
  nightNumber: 1,
  openedAt: new Date().toISOString(),
  openedBy: "Encargado",
  currentView: "dashboard",
  boxes: [
    "Ingreso",
    "Barra 1",
    "Barra 2",
    "Barra 3",
    "Barra 4",
    "Barra 5",
    "Barra 6",
    "VIP",
    "Caja central",
  ].map((name, index) => ({
    id: uid(),
    name,
    operator: index === 0 ? "Porteria" : "",
    initialCash: index === 0 ? 50000 : 30000,
    status: "open",
    openedAt: new Date().toISOString(),
    closedAt: null,
    closeNote: "",
  })),
  products: [
    ["Cerveza lata", "Bebidas", 2500, 180],
    ["Fernet vaso", "Tragos", 4500, 120],
    ["Vodka con energizante", "Tragos", 5200, 90],
    ["Agua", "Bebidas", 1500, 160],
    ["Gaseosa", "Bebidas", 1800, 120],
    ["Energizante", "Bebidas", 3000, 80],
    ["Combo Fernet", "Combos", 18000, 40],
    ["Papas", "Comida", 3500, 60],
  ].map(([name, category, price, stock]) => ({
    id: uid(),
    name,
    category,
    price,
    stock,
    minStock: Math.ceil(stock * 0.15),
  })),
  entryTypes: [
    { id: uid(), name: "Precinto general", price: 5000, consumption: 0, accessCount: 1, wristband: true },
    { id: uid(), name: "VIP", price: 12000, consumption: 3000, accessCount: 1, wristband: true },
    { id: uid(), name: "Puerta", price: 7000, consumption: 0, accessCount: 1, wristband: true },
    { id: uid(), name: "Cortesia", price: 0, consumption: 0, accessCount: 1, wristband: true },
  ],
  wristbands: [
    { id: uid(), name: "General", color: "Verde", initial: 500, delivered: 500, sold: 0, used: 0, courtesy: 0, broken: 0 },
    { id: uid(), name: "VIP", color: "Dorado", initial: 120, delivered: 120, sold: 0, used: 0, courtesy: 0, broken: 0 },
    { id: uid(), name: "Puerta", color: "Azul", initial: 250, delivered: 250, sold: 0, used: 0, courtesy: 0, broken: 0 },
  ],
  entrySales: [],
  sales: [],
  tickets: [],
  promoters: [
    { id: uid(), name: "RRPP Principal", phone: "", active: true },
    { id: uid(), name: "Cumpleanos", phone: "", active: true },
  ],
  vipCards: [
    { id: uid(), code: "VIP-001", holder: "Mesa 1", balance: 50000, active: true },
    { id: uid(), code: "VIP-002", holder: "Gerencia", balance: 100000, active: true },
  ],
  stockLocations: ["Deposito", "Barra 1", "Barra 2", "VIP"],
  stockTransfers: [],
  stockBreakages: [],
  stockCounts: [],
  cashWithdrawals: [],
  cashCounts: [],
  moneyMovements: [],
  voidRequests: [],
  audits: [],
  controls: {
    alcoholEnabled: true,
    ticketKeyword: "",
    eventName: "ROXO",
    emergencyNote: "",
  },
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta", "QR", "Tarjeta VIP", "Invitacion"],
  tables: Array.from({ length: 24 }, (_, index) => ({
    id: uid(),
    number: index + 1,
    waiter: "",
    status: "free",
    items: [],
    payments: [],
  })),
  expenses: [],
  closedAt: null,
  closeSummary: "",
});

let state = loadState();
normalizeState();
let session = loadSession();

function loadSession() {
  const saved = localStorage.getItem(`${STORAGE_KEY}-session`);
  if (!saved) return { role: "" };
  try {
    return JSON.parse(saved);
  } catch {
    return { role: "" };
  }
}

function saveSession() {
  localStorage.setItem(`${STORAGE_KEY}-session`, JSON.stringify(session));
}

const roles = {
  admin: {
    name: "Administrador",
    startView: "home",
    views: ["home", "sell", "control", "close"],
  },
  bar: {
    name: "Caja bebidas",
    startView: "bar",
    views: ["bar"],
  },
  ingreso: {
    name: "Ingreso",
    startView: "ingreso",
    views: ["ingreso"],
  },
  puerta: {
    name: "Puerta",
    startView: "puerta",
    views: ["puerta"],
  },
  mesas: {
    name: "Mozos",
    startView: "mesas",
    views: ["mesas"],
  },
  deposito: {
    name: "Deposito",
    startView: "stock",
    views: ["stock"],
  },
};

let barCart = [];
let navHistory = [];

function normalizeState() {
  const base = initialState();
  state.promoters ||= base.promoters;
  state.vipCards ||= base.vipCards;
  state.stockLocations ||= base.stockLocations;
  state.stockTransfers ||= [];
  state.stockBreakages ||= [];
  state.stockCounts ||= [];
  state.cashWithdrawals ||= [];
  state.cashCounts ||= [];
  state.moneyMovements ||= [];
  state.voidRequests ||= [];
  state.tickets ||= [];
  state.audits ||= [];
  state.controls ||= { alcoholEnabled: true, ticketKeyword: "", eventName: "ROXO", emergencyNote: "" };
  state.paymentMethods ||= base.paymentMethods;
  state.wristbands ||= base.wristbands;
  state.nightNumber ||= 1;
  state.openedAt ||= new Date().toISOString();
  state.openedBy ||= "Encargado";
  state.closeSummary ||= "";
  state.boxes = state.boxes.map((box) => ({
    openedAt: null,
    closedAt: null,
    closeNote: "",
    ...box,
  }));
  state.entrySales ||= [];
  state.entryTypes = state.entryTypes.map((type) => ({
    consumption: 0,
    accessCount: 1,
    wristband: true,
    ...type,
  }));
  state.products = state.products.map((product) => {
    const locations = product.locations || {};
    const hasLocations = Object.values(locations).some((value) => Number(value) > 0);
    const deposito = Math.ceil(Number(product.stock || 0) * 0.55);
    const barra = Number(product.stock || 0) - deposito;
    return {
      ...product,
      locations: hasLocations
        ? locations
        : { Deposito: deposito, "Barra 1": barra, "Barra 2": 0, VIP: 0 },
    };
  });
}

function logAudit(area, detail) {
  state.audits.unshift({
    id: uid(),
    area,
    detail,
    role: roles[session?.role]?.name || "Sistema",
    createdAt: new Date().toISOString(),
  });
  state.audits = state.audits.slice(0, 400);
}

function nextTicketNumber() {
  return String(state.tickets.length + 1).padStart(6, "0");
}

function createTicket({ type, boxId, payment, items, source = "", status = "Cobrado" }) {
  const ticket = {
    id: uid(),
    number: nextTicketNumber(),
    type,
    boxId,
    payment,
    source,
    status,
    items: items.map((item) => ({ ...item })),
    total: total(items, (item) => item.qty * item.price),
    role: roles[session.role]?.name || "Sistema",
    createdAt: new Date().toISOString(),
  };
  state.tickets.unshift(ticket);
  return ticket;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialState();
  try {
    return JSON.parse(saved);
  } catch {
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function total(items, selector) {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

function formatDate(value) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function alert(message) {
  const area = document.querySelector("#alert-area");
  area.innerHTML = `<div class="alert">${message}</div>`;
  setTimeout(() => {
    area.innerHTML = "";
  }, 3200);
}

function render() {
  saveState();
  saveSession();
  if (!session.role) {
    renderRoleGate();
    return;
  }
  const role = roles[session.role];
  document.body.classList.toggle("seller-mode", session.role !== "admin");
  document.querySelector(".brand span").textContent = `Club Roxo - ${role.name}`;
  document.querySelector(".top-actions").innerHTML = `
    <button class="secondary-button nav-back" id="go-back" ${navHistory.length ? "" : "disabled"}>Atras</button>
    <button class="secondary-button" id="go-home">Inicio</button>
    <button class="secondary-button" id="switch-role">Cambiar usuario</button>
    ${session.role === "admin" ? `<button class="icon-button" id="reset-demo" title="Reiniciar datos">R</button><button class="primary-button" id="close-night">Cerrar noche</button>` : ""}
  `;
  document.querySelector("#go-back")?.addEventListener("click", goBack);
  document.querySelector("#go-home")?.addEventListener("click", () => navigateTo(roles[session.role]?.startView || "home"));
  document.querySelector("#switch-role").addEventListener("click", () => {
    session = { role: "" };
    render();
  });
  document.querySelector("#reset-demo")?.addEventListener("click", resetDemo);
  document.querySelector("#close-night")?.addEventListener("click", closeNight);
  const adminInternalViews = ["dashboard", "cajas", "ingreso", "puerta", "bar", "mesas", "vip", "rrpp", "stock", "gastos", "config", "reportes"];
  const canView = role.views.includes(state.currentView) || (session.role === "admin" && adminInternalViews.includes(state.currentView));
  if (!canView) state.currentView = role.startView;
  renderNav(role);
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });
  document.querySelector("#view-title").textContent = titles[state.currentView];
  document.querySelector("#view-root").innerHTML = `${systemStatusBar()}${views[state.currentView]()}`;
  bindViewEvents();
}

function systemStatusBar() {
  if (!session.role) return "";
  return `
    <div class="system-status">
      <span><strong>Marca</strong> ${state.controls?.eventName || "ROXO"}</span>
      <span><strong>Usuario</strong> ${roles[session.role]?.name || "-"}</span>
      <span><strong>Alcohol</strong> ${state.controls?.alcoholEnabled ? "Habilitado" : "Cortado"}</span>
      <span><strong>Comanda</strong> ${state.controls?.ticketKeyword || "Sin palabra"}</span>
    </div>
  `;
}

function renderRoleGate() {
  document.body.classList.remove("seller-mode");
  document.querySelector("#view-title").textContent = "Elegir usuario";
  document.querySelector(".brand span").textContent = "Club Roxo";
  document.querySelector(".top-actions").innerHTML = "";
  document.querySelector(".nav").innerHTML = "";
  document.querySelector("#alert-area").innerHTML = "";
  document.querySelector("#view-root").innerHTML = `
    <section class="role-gate">
      <div>
        <p class="eyebrow">Acceso por puesto</p>
        <h2>Entrar al sistema</h2>
        <p class="muted">Cada puesto ve solo las herramientas que necesita para trabajar rapido.</p>
      </div>
      <div class="role-grid">
        ${Object.entries(roles).map(([key, role]) => `
          <button class="role-card" data-role="${key}">
            <strong>${role.name}</strong>
            <span>${role.views.length === 1 ? "Vista unica" : `${role.views.length} modulos`}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      session.role = button.dataset.role;
      state.currentView = roles[session.role].startView;
      render();
    });
  });
}

function renderNav(role) {
  document.querySelector(".nav").innerHTML = role.views
    .map((view) => `<button class="nav-link" data-view="${view}">${titles[view]}</button>`)
    .join("");
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.view);
    });
  });
}

function navigateTo(view) {
  if (view && view !== state.currentView) navHistory.push(state.currentView);
  state.currentView = view;
  render();
}

function goBack() {
  const previous = navHistory.pop();
  if (!previous) return;
  state.currentView = previous;
  render();
}

function focusControlAction(target) {
  const map = {
    money: "#money-movement-form",
    void: "#void-form",
    cash: "#cash-count-form",
  };
  const element = document.querySelector(map[target]);
  if (!element) return;
  element.closest(".panel")?.classList.add("focus-panel");
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => element.closest(".panel")?.classList.remove("focus-panel"), 1800);
}

const titles = {
  home: "Inicio",
  sell: "Vender",
  analysis: "Analisis",
  dashboard: "Panel",
  control: "Control",
  cajas: "Cajas",
  ingreso: "Ingreso",
  puerta: "Puerta",
  bar: "Bar",
  mesas: "Mesas",
  vip: "VIP",
  rrpp: "RRPP",
  stock: "Stock",
  gastos: "Gastos",
  config: "Config",
  close: "Cierre",
  reportes: "Reportes",
};

function entryRevenue() {
  return total(state.entrySales, (sale) => sale.price * sale.qty);
}

function barRevenue() {
  return total(state.sales, (sale) => sale.price * sale.qty);
}

function tableRevenue() {
  return total(state.tables.flatMap((table) => table.payments), (pay) => pay.amount);
}

function expensesTotal() {
  return total(state.expenses, (expense) => expense.amount);
}

function boxMovements(boxId) {
  const entries = state.entrySales
    .filter((sale) => sale.boxId === boxId)
    .map((sale) => sale.price * sale.qty);
  const bar = state.sales
    .filter((sale) => sale.boxId === boxId)
    .map((sale) => sale.price * sale.qty);
  const tables = state.tables.flatMap((table) =>
    table.payments.filter((pay) => pay.boxId === boxId).map((pay) => pay.amount),
  );
  return [...entries, ...bar, ...tables];
}

function boxExpectedCash(box) {
  const sold = total(boxMovements(box.id), (value) => value);
  const withdrawals = total(state.cashWithdrawals.filter((item) => item.boxId === box.id), (item) => item.amount);
  const voids = total(
    state.voidRequests.filter((item) => item.boxId === box.id && item.status === "Aprobada"),
    (item) => Number(item.amount || 0),
  );
  return sold + Number(box.initialCash || 0) - withdrawals - voids;
}

function boxSalesTotal(boxId) {
  return total(boxMovements(boxId), (value) => value);
}

function isBoxOpen(boxId) {
  return state.nightOpen && findBox(boxId)?.status === "open";
}

function assertOpenBox(boxId) {
  if (!state.nightOpen) {
    alert("La jornada esta cerrada. Primero abri una nueva noche.");
    return false;
  }
  if (!isBoxOpen(boxId)) {
    alert("La caja seleccionada esta cerrada.");
    return false;
  }
  return true;
}

function saleLocation(boxId) {
  const boxName = findBox(boxId)?.name || "Barra 1";
  return state.stockLocations.includes(boxName) ? boxName : "Barra 1";
}

function consumeProduct(product, qty, locationName) {
  const location = state.stockLocations.includes(locationName) ? locationName : "Barra 1";
  product.locations ||= {};
  product.locations[location] ||= 0;
  if (product.locations[location] < qty) return false;
  product.locations[location] -= qty;
  product.stock -= qty;
  return true;
}

function syncProductStock(product) {
  product.stock = total(Object.values(product.locations || {}), (value) => Number(value || 0));
}

function isAlcoholProduct(product) {
  const text = `${product.name} ${product.category}`.toLowerCase();
  return ["cerveza", "fernet", "vodka", "tragos", "champagne", "whisky", "gin", "alcohol"].some((word) => text.includes(word));
}

function dashboardView() {
  const stockLow = state.products.filter((product) => product.stock <= product.minStock);
  const occupiedTables = state.tables.filter((table) => table.status === "occupied").length;
  const boxesWithDiff = state.boxes.filter((box) => Math.abs(Number(box.lastDifference || 0)) > 0);
  const pendingVoids = state.voidRequests.filter((item) => item.status === "Pendiente").length;
  return `
    <div class="metrics">
      ${metric("Estado", state.nightOpen ? "Abierta" : "Cerrada")}
      ${metric("Total vendido", money.format(entryRevenue() + barRevenue() + tableRevenue()))}
      ${metric("Ingreso", money.format(entryRevenue()))}
      ${metric("Bar y mesas", money.format(barRevenue() + tableRevenue()))}
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Alertas operativas</h2></div>
      <div class="ops-list">
        <div><strong>${stockLow.length}</strong><span>Productos bajo minimo</span></div>
        <div><strong>${boxesWithDiff.length}</strong><span>Cajas con diferencia</span></div>
        <div><strong>${pendingVoids}</strong><span>Anulaciones pendientes</span></div>
        <div><strong>${state.tickets.length}</strong><span>Tickets emitidos</span></div>
      </div>
    </section>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Actividad de cajas</h2>
            <p class="muted">${state.boxes.length} cajas configuradas</p>
          </div>
          <button class="primary-button" data-view-jump="cajas">Administrar</button>
        </div>
        <div class="grid-3">
          ${state.boxes.map(boxCard).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Operativa</h2>
            <p class="muted">${occupiedTables} mesas ocupadas, ${stockLow.length} productos bajos</p>
          </div>
        </div>
        ${stockLow.length ? lowStockTable(stockLow) : `<div class="empty">Sin alertas de stock.</div>`}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Resumen de entradas</h2>
          <p class="muted">Precintos, VIP, puerta y cortesias</p>
        </div>
        <button class="primary-button" data-view-jump="ingreso">Vender entrada</button>
      </div>
      ${entrySummaryTable()}
    </section>
  `;
}

function homeView() {
  const openBoxes = state.boxes.filter((box) => box.status === "open").length;
  const inside = total(state.entrySales.filter((sale) => sale.usedAt), (sale) => sale.qty);
  const alerts = state.products.filter((product) => product.stock <= product.minStock).length + state.voidRequests.filter((item) => item.status === "Pendiente").length;
  return `
    <section class="app-home">
      <div class="home-hero">
        <img class="home-logo" src="./assets/roxo-logo.jpeg" alt="ROXO Club" />
        <p class="eyebrow">ROXO</p>
        <h2>${state.nightOpen ? "Noche en curso" : "Noche cerrada"}</h2>
        <span>Jornada #${state.nightNumber} - ${state.openedBy || "Sin responsable"}</span>
      </div>
      <div class="home-metrics">
        <button class="home-stat" data-view-jump="sell"><strong>${money.format(entryRevenue() + barRevenue() + tableRevenue())}</strong><span>Vendido</span></button>
        <button class="home-stat" data-view-jump="puerta"><strong>${inside}</strong><span>Dentro</span></button>
        <button class="home-stat" data-view-jump="cajas"><strong>${openBoxes}</strong><span>Cajas</span></button>
        <button class="home-stat" data-view-jump="control"><strong>${alerts}</strong><span>Alertas</span></button>
      </div>
      <div class="action-grid">
        <button class="app-action primary" data-view-jump="sell"><strong>Vender</strong><span>Entrada, barra o mesa</span></button>
        <button class="app-action" data-view-jump="control"><strong>Controlar</strong><span>Cajas, anulaciones, dinero</span></button>
        <button class="app-action" data-view-jump="close"><strong>Cerrar</strong><span>Arqueo y cierre</span></button>
        <button class="app-action" data-view-jump="analysis"><strong>Ver numeros</strong><span>Analisis y reportes</span></button>
      </div>
    </section>
  `;
}

function periodItems(items, dateKey = "createdAt") {
  const mode = session.analysisMode || "today";
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = session.analysisDate || today;
  const selectedMonth = session.analysisMonth || today.slice(0, 7);
  return items.filter((item) => {
    const value = item[dateKey];
    if (!value) return false;
    const date = value.slice(0, 10);
    const month = value.slice(0, 7);
    if (mode === "date") return date === selectedDate;
    if (mode === "month") return month === selectedMonth;
    return date === today;
  });
}

function analysisView() {
  const entryItems = periodItems(state.entrySales);
  const saleItems = periodItems(state.sales);
  const tablePays = periodItems(state.tables.flatMap((table) => table.payments));
  const movements = periodItems(state.moneyMovements);
  const incomeMovements = movements.filter((item) => item.type === "Ingreso");
  const outcomeMovements = movements.filter((item) => item.type === "Salida");
  const salesTotal = total(entryItems, (item) => item.qty * item.price) + total(saleItems, (item) => item.qty * item.price) + total(tablePays, (item) => item.amount);
  const incomeTotal = total(incomeMovements, (item) => item.amount);
  const outcomeTotal = total(outcomeMovements, (item) => item.amount);
  const net = salesTotal + incomeTotal - outcomeTotal;
  return `
    <section class="analysis-head">
      <div>
        <h2>Panel de analisis</h2>
        <p>Reportes por dia, fecha o mes.</p>
      </div>
      <form id="analysis-filter" class="analysis-filter">
        <select name="mode">
          <option value="today" ${session.analysisMode === "today" || !session.analysisMode ? "selected" : ""}>Hoy</option>
          <option value="date" ${session.analysisMode === "date" ? "selected" : ""}>Fecha</option>
          <option value="month" ${session.analysisMode === "month" ? "selected" : ""}>Mes</option>
        </select>
        <input name="date" type="date" value="${session.analysisDate || new Date().toISOString().slice(0, 10)}" />
        <input name="month" type="month" value="${session.analysisMonth || new Date().toISOString().slice(0, 7)}" />
        <button class="primary-button">Aplicar</button>
      </form>
    </section>
    <div class="analytics-grid">
      ${metric("Ventas", money.format(salesTotal))}
      ${metric("Ingresos extra", money.format(incomeTotal))}
      ${metric("Salidas", money.format(outcomeTotal))}
      ${metric("Neto", money.format(net))}
    </div>
    <div class="grid-2">
      <section class="chart-card"><h2>Ventas por area</h2>${barChart([
        ["Entrada", total(entryItems, (item) => item.qty * item.price)],
        ["Barra", total(saleItems, (item) => item.qty * item.price)],
        ["Mesas", total(tablePays, (item) => item.amount)],
      ])}</section>
      <section class="chart-card"><h2>Dinero</h2>${barChart([
        ["Ventas", salesTotal],
        ["Ingresos", incomeTotal],
        ["Salidas", outcomeTotal],
        ["Neto", Math.max(net, 0)],
      ])}</section>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Movimientos de dinero</h2></div>${moneyMovementsTable(movements)}</section>
      <section class="panel"><div class="panel-head"><h2>Productos vendidos</h2></div>${topProductsTable()}</section>
    </div>
  `;
}

function barChart(rows) {
  const max = Math.max(...rows.map((row) => row[1]), 1);
  return `<div class="bar-chart">${rows.map(([label, value]) => `
    <div class="bar-row">
      <span>${label}</span>
      <div><i style="width:${Math.max((value / max) * 100, 3)}%"></i></div>
      <strong>${money.format(value)}</strong>
    </div>`).join("")}</div>`;
}

function sellView() {
  return `
    <section class="sell-tabs">
      <button class="sell-tab active" data-sell-tab="entry">Entrada</button>
      <button class="sell-tab" data-sell-tab="bar">Barra</button>
      <button class="sell-tab" data-sell-tab="table">Mesa</button>
    </section>
    <section class="sell-pane active" id="sell-entry">${entryQuickView()}</section>
    <section class="sell-pane" id="sell-bar">${barView()}</section>
    <section class="sell-pane" id="sell-table">${tablesQuickView()}</section>
  `;
}

function entryQuickView() {
  return `
    <section class="mobile-module">
      <div class="module-title"><h2>Entrada</h2><span>Precintos y puerta</span></div>
      <form id="entry-form" class="app-form">
        <label>Tipo<select name="typeId">${state.entryTypes.map((type) => `<option value="${type.id}">${type.name} - ${money.format(type.price)}</option>`).join("")}</select></label>
        <label>Cantidad<input name="qty" type="number" min="1" value="1" required /></label>
        <label>Caja<select name="boxId">${boxOptions("Ingreso")}</select></label>
        <label>Pago<select name="payment">${paymentOptions()}</select></label>
        <label>RRPP<select name="promoterId"><option value="">Sin RRPP</option>${state.promoters.map((promoter) => `<option value="${promoter.id}">${promoter.name}</option>`).join("")}</select></label>
        <label>Cliente<input name="guestName" placeholder="Opcional" /></label>
        <button class="primary-button full">Cobrar entrada</button>
      </form>
    </section>
    <section class="mobile-module compact-only">${wristbandsTable(false)}</section>
  `;
}

function tablesQuickView() {
  return `
    <section class="mobile-module">
      <div class="module-title"><h2>Mesas</h2><span>Consumos y cobros</span></div>
      <div class="mobile-list">
        ${state.tables.slice(0, 24).map((table) => {
          const owed = tableTotal(table) - total(table.payments, (payment) => payment.amount);
          return `<button class="mobile-row" data-open-table="${table.id}">
            <strong>Mesa ${table.number}</strong>
            <span>${table.status === "occupied" ? `Saldo ${money.format(owed)}` : "Libre"}</span>
          </button>`;
        }).join("")}
      </div>
    </section>
  `;
}

function closeView() {
  const openBoxes = state.boxes.filter((box) => box.status === "open");
  return `
    <section class="close-flow">
      <div class="flow-step ${openBoxes.length ? "current" : "done"}">
        <strong>1</strong>
        <div><h2>Cerrar cajas</h2><p>${openBoxes.length ? `${openBoxes.length} cajas abiertas` : "Todas las cajas cerradas"}</p></div>
        <button class="secondary-button" data-view-jump="cajas">Ver cajas</button>
      </div>
      <div class="flow-step">
        <strong>2</strong>
        <div><h2>Revisar precintos</h2><p>Vendidos, usados, cortesias y sobrantes</p></div>
        <button class="secondary-button" data-view-jump="ingreso">Ver</button>
      </div>
      <div class="flow-step">
        <strong>3</strong>
        <div><h2>Contar stock</h2><p>Comparar teorico contra contado</p></div>
        <button class="secondary-button" data-view-jump="stock">Ver</button>
      </div>
      <div class="flow-step ${!openBoxes.length ? "current" : ""}">
        <strong>4</strong>
        <div><h2>Cerrar noche</h2><p>${state.nightOpen ? "Genera cierre final" : "La noche ya esta cerrada"}</p></div>
        <button class="danger-button" id="close-night-full" ${openBoxes.length || !state.nightOpen ? "disabled" : ""}>Cerrar noche</button>
      </div>
    </section>
    <section class="mobile-module">
      <div class="module-title"><h2>Resumen</h2><span>Jornada #${state.nightNumber}</span></div>
      ${boxReportTable()}
    </section>
  `;
}

function metric(label, value) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`;
}

function boxCard(box) {
  const sold = total(boxMovements(box.id), (value) => value);
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${box.name}</h3>
          <p class="muted">${box.operator || "Sin operador"}</p>
        </div>
        <span class="status ${box.status === "closed" ? "warn" : ""}">${box.status === "open" ? "Abierta" : "Cerrada"}</span>
      </div>
      <strong>${money.format(sold)}</strong>
      <p class="muted">Inicial ${money.format(box.initialCash || 0)}</p>
    </article>
  `;
}

function cajasView() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Las 9 cajas</h2>
          <p class="muted">Apertura, operador, ventas y cierre por caja.</p>
        </div>
        <button class="primary-button" data-modal="box">Nueva caja</button>
      </div>
      <div class="grid-3">
        ${state.boxes.map((box) => {
          const sold = total(boxMovements(box.id), (value) => value);
          return `
            <article class="card">
              <div class="card-head">
                <div>
                  <h3>${box.name}</h3>
                  <p class="muted">${box.operator || "Sin operador"}</p>
                </div>
                <span class="status ${box.status === "closed" ? "warn" : ""}">${box.status === "open" ? "Abierta" : "Cerrada"}</span>
              </div>
              <p>Inicial: <strong>${money.format(box.initialCash || 0)}</strong></p>
              <p>Ventas: <strong>${money.format(sold)}</strong></p>
              <p>Rinde esperado: <strong>${money.format(boxExpectedCash(box))}</strong></p>
              <p>Diferencia: <strong>${box.lastCount === undefined ? "-" : money.format(box.lastDifference || 0)}</strong></p>
              <div class="inline-actions">
                <button class="secondary-button" data-edit-box="${box.id}">Editar</button>
                <button class="${box.status === "open" ? "danger-button" : "primary-button"}" data-box-flow="${box.id}">
                  ${box.status === "open" ? "Cerrar con arqueo" : "Abrir caja"}
                </button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function controlView() {
  const openBoxes = state.boxes.filter((box) => box.status === "open").length;
  const pendingVoids = state.voidRequests.filter((request) => request.status === "Pendiente").length;
  const stockLow = state.products.filter((product) => product.stock <= product.minStock).length;
  const wristbandLow = state.wristbands.filter((item) => wristbandAvailable(item) <= 20).length;
  const todayOut = total(periodItems(state.moneyMovements).filter((item) => item.type === "Salida"), (item) => item.amount);
  return `
    <section class="control-hero">
      <div>
        <p class="eyebrow">Jornada operativa ROXO</p>
        <h2>${state.nightOpen ? "Noche abierta" : "Noche cerrada"} #${state.nightNumber}</h2>
        <p class="muted">${formatDate(state.openedAt)} - ${openBoxes} cajas abiertas - ${pendingVoids} anulaciones pendientes</p>
      </div>
      <div class="inline-actions">
        <button class="${state.controls.alcoholEnabled ? "danger-button" : "primary-button"} big-action" id="toggle-alcohol">
          ${state.controls.alcoholEnabled ? "Cortar alcohol" : "Habilitar alcohol"}
        </button>
        ${state.nightOpen ? `<button class="danger-button big-action" id="close-night-full">Cerrar noche</button>` : `<button class="primary-button big-action" id="open-night-full">Abrir noche</button>`}
      </div>
    </section>

    <section class="alert-board">
      <button class="alert-tile" data-view-jump="cajas"><strong>${openBoxes}</strong><span>Cajas abiertas</span></button>
      <button class="alert-tile ${pendingVoids ? "warn" : ""}" data-view-jump="control"><strong>${pendingVoids}</strong><span>Anulaciones pendientes</span></button>
      <button class="alert-tile ${stockLow ? "warn" : ""}" data-view-jump="stock"><strong>${stockLow}</strong><span>Stock bajo</span></button>
      <button class="alert-tile ${wristbandLow ? "warn" : ""}" data-view-jump="ingreso"><strong>${wristbandLow}</strong><span>Precintos bajos</span></button>
      <button class="alert-tile" data-view-jump="analysis"><strong>${money.format(todayOut)}</strong><span>Salidas hoy</span></button>
    </section>

    <section class="quick-actions">
      <button data-action-shortcut="money">Salida de plata</button>
      <button data-action-shortcut="void">Pedir anulacion</button>
      <button data-action-shortcut="cash">Contar caja</button>
      <button data-view-jump="cajas">Abrir/cerrar caja</button>
    </section>

    <div class="compact-grid">
      <section class="panel compact-panel">
        <div class="panel-head"><h2>Apertura / cierre</h2></div>
        <form id="night-open-form" class="form-grid">
          <label>Responsable<input name="openedBy" value="${state.openedBy || ""}" /></label>
          <label>Nombre operativo<input name="eventName" value="${state.controls.eventName || "ROXO"}" /></label>
          <label class="full">Resumen cierre<textarea name="closeSummary" placeholder="Observaciones del cierre">${state.closeSummary || ""}</textarea></label>
          <button class="primary-button full">Guardar jornada</button>
        </form>
      </section>
      <section class="panel compact-panel">
        <div class="panel-head"><h2>Entrada / salida de dinero</h2></div>
        <form id="money-movement-form" class="form-grid">
          <label>Tipo<select name="type"><option>Salida</option><option>Ingreso</option></select></label>
          <label>Caja<select name="boxId">${boxOptions("Caja central")}</select></label>
          <label>Categoria
            <select name="category">
              ${["Proveedor", "Empleado", "Seguridad", "DJ", "Limpieza", "Mercaderia", "Retiro", "Ajuste", "Otro"].map((item) => `<option>${item}</option>`).join("")}
            </select>
          </label>
          <label>Monto<input name="amount" type="number" min="1" required /></label>
          <label>Medio<select name="payment">${paymentOptions()}</select></label>
          <label>Responsable<input name="person" placeholder="Nombre" /></label>
          <label class="full">Detalle<input name="detail" placeholder="Proveedor, concepto u observacion" /></label>
          <button class="primary-button full">Registrar movimiento</button>
        </form>
      </section>

      <section class="panel compact-panel">
        <div class="panel-head"><h2>Datos de evento</h2></div>
        <form id="night-control-form" class="form-grid">
          <label>Nombre de la noche<input name="eventName" value="${state.controls.eventName || ""}" /></label>
          <label>Palabra comanda<input name="ticketKeyword" value="${state.controls.ticketKeyword || ""}" placeholder="Ej: ROJO" /></label>
          <label class="full">Nota interna<textarea name="emergencyNote" placeholder="Indicaciones para encargados">${state.controls.emergencyNote || ""}</textarea></label>
          <button class="primary-button full">Guardar controles</button>
        </form>
      </section>

      <section class="panel compact-panel">
        <div class="panel-head"><h2>Retiro de efectivo</h2></div>
        <form id="withdrawal-form" class="form-grid">
          <label>Caja<select name="boxId">${boxOptions("Caja central")}</select></label>
          <label>Monto<input name="amount" type="number" min="1" required /></label>
          <label class="full">Motivo<input name="reason" placeholder="Retiro a tesoreria, cambio, proveedor" /></label>
          <button class="primary-button full">Registrar retiro</button>
        </form>
      </section>

      <section class="panel compact-panel">
        <div class="panel-head"><h2>Anulacion</h2></div>
        <form id="void-form" class="form-grid">
          <label>Area<select name="area"><option>Barra</option><option>Ingreso</option><option>Mesa</option><option>VIP</option></select></label>
          <label>Caja<select name="boxId">${boxOptions("Caja central")}</select></label>
          <label class="full">Ticket / comanda<select name="ticketId"><option value="">Sin ticket asociado</option>${state.tickets.map((ticket) => `<option value="${ticket.id}">#${ticket.number} - ${ticket.type} - ${money.format(ticket.total)}</option>`).join("")}</select></label>
          <label>Monto<input name="amount" type="number" min="0" /></label>
          <label class="full">Detalle<input name="detail" placeholder="Producto, codigo, mesa o motivo" required /></label>
          <button class="danger-button full">Solicitar anulacion</button>
        </form>
      </section>

      <section class="panel compact-panel">
        <div class="panel-head"><h2>Conteo de caja</h2></div>
        <form id="cash-count-form" class="form-grid">
          <label>Caja<select name="boxId">${boxOptions("Caja central")}</select></label>
          <label>Efectivo contado<input name="counted" type="number" min="0" required /></label>
          <button class="primary-button full">Guardar conteo</button>
        </form>
      </section>
    </div>

    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Retiros</h2></div>${withdrawalsTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Anulaciones</h2></div>${voidRequestsTable()}</section>
    </div>
  `;
}

function ingresoView() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Control de precintos</h2>
          <p class="muted">Entregados, vendidos, usados en puerta, cortesias y sobrantes.</p>
        </div>
        <button class="primary-button" data-modal="wristband">Nuevo precinto</button>
      </div>
      ${wristbandsTable(true)}
    </section>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Venta de entradas</h2>
            <p class="muted">Precintos, VIP, puerta y cortesias.</p>
          </div>
        </div>
        <form id="entry-form" class="form-grid">
          <label>Tipo
            <select name="typeId">${state.entryTypes.map((type) => `<option value="${type.id}">${type.name} - ${money.format(type.price)}</option>`).join("")}</select>
          </label>
          <label>Cantidad
            <input name="qty" type="number" min="1" value="1" required />
          </label>
          <label>Caja
            <select name="boxId">${boxOptions("Ingreso")}</select>
          </label>
          <label>Medio de pago
            <select name="payment">${paymentOptions()}</select>
          </label>
          <label>RRPP
            <select name="promoterId"><option value="">Sin RRPP</option>${state.promoters.map((promoter) => `<option value="${promoter.id}">${promoter.name}</option>`).join("")}</select>
          </label>
          <label>Nombre cliente
            <input name="guestName" placeholder="Opcional" />
          </label>
          <button class="primary-button full">Registrar ingreso</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Tipos de entrada</h2>
            <p class="muted">Valores editables para la noche.</p>
          </div>
          <button class="primary-button" data-modal="entry-type">Nuevo tipo</button>
        </div>
        <div class="split-list">
          ${state.entryTypes.map((type) => `
            <article class="card">
              <div class="card-head">
                <div><h3>${type.name}</h3><p>${money.format(type.price)}</p></div>
                <button class="secondary-button" data-edit-entry-type="${type.id}">Editar</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Ventas de ingreso</h2></div>
      ${entrySummaryTable()}
      ${entrySalesTable()}
    </section>
  `;
}

function puertaView() {
  const pending = state.entrySales.filter((sale) => !sale.usedAt);
  const used = state.entrySales.filter((sale) => sale.usedAt);
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Control de puerta</h2>
          <p class="muted">Validacion de entradas, precintos, VIP, cortesias y QR/codigo.</p>
        </div>
      </div>
      <form id="door-form" class="form-grid">
        <label class="full">Codigo de entrada
          <input name="code" placeholder="Ej: ENT-123456" required />
        </label>
        <button class="primary-button full">Validar ingreso</button>
      </form>
    </section>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head"><h2>Pendientes de ingresar</h2></div>
        ${doorTable(pending, true)}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Ingresados</h2></div>
        ${doorTable(used, false)}
      </section>
    </div>
  `;
}

function vipView() {
  return `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Tarjetas VIP / Cashless</h2>
            <p class="muted">Saldo para consumo en barra y mesas VIP.</p>
          </div>
          <button class="primary-button" data-modal="vip-card">Nueva tarjeta</button>
        </div>
        ${vipCardsTable()}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Recargar tarjeta</h2></div>
        <form id="vip-recharge-form" class="form-grid">
          <label>Tarjeta
            <select name="cardId">${state.vipCards.map((card) => `<option value="${card.id}">${card.code} - ${card.holder}</option>`).join("")}</select>
          </label>
          <label>Monto
            <input name="amount" type="number" min="1" required />
          </label>
          <label>Caja
            <select name="boxId">${boxOptions("VIP")}</select>
          </label>
          <label>Medio de pago
            <select name="payment">${paymentOptions()}</select>
          </label>
          <button class="primary-button full">Recargar</button>
        </form>
      </section>
    </div>
  `;
}

function rrppView() {
  return `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Relaciones Publicas</h2>
            <p class="muted">Ventas e invitaciones asociadas a cada RRPP.</p>
          </div>
          <button class="primary-button" data-modal="promoter">Nuevo RRPP</button>
        </div>
        ${promotersTable()}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Resumen por RRPP</h2></div>
        ${promoterSummaryTable()}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Invitaciones / entradas asociadas</h2></div>
      ${entrySalesTable()}
    </section>
  `;
}

function configView() {
  return `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div><h2>Datos maestros</h2><p class="muted">Alta rapida de recursos operativos.</p></div>
        </div>
        <div class="config-actions">
          <button class="primary-button" data-modal="product">Producto</button>
          <button class="primary-button" data-modal="box">Caja</button>
          <button class="primary-button" data-modal="entry-type">Tipo entrada</button>
          <button class="primary-button" data-modal="promoter">RRPP</button>
          <button class="primary-button" data-modal="vip-card">Tarjeta VIP</button>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Medios de pago y ubicaciones</h2></div>
        <form id="master-form" class="form-grid">
          <label class="full">Medios de pago
            <textarea name="paymentMethods">${state.paymentMethods.join("\n")}</textarea>
          </label>
          <label class="full">Ubicaciones de stock
            <textarea name="stockLocations">${state.stockLocations.join("\n")}</textarea>
          </label>
          <button class="primary-button full">Guardar configuracion</button>
        </form>
      </section>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Productos</h2></div>${topProductsTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Cajas</h2></div>${boxReportTable()}</section>
    </div>
  `;
}

function barView() {
  return `
    <section class="pos-shell">
      <div class="pos-products">
        <div class="panel-head">
          <div>
            <h2>Venta de bebidas</h2>
            <p class="muted">Tocar producto para agregar al pedido.</p>
          </div>
        </div>
        <div class="category-strip">
          ${["Todos", ...new Set(state.products.map((product) => product.category))].map((category, index) => `
            <button class="category-pill ${index === 0 ? "active" : ""}" data-category="${category}">${category}</button>
          `).join("")}
        </div>
        <div class="pos-grid">
          ${state.products.map((product) => `
            <button class="pos-product ${product.stock <= 0 || (!state.controls.alcoholEnabled && isAlcoholProduct(product)) ? "disabled" : ""}" data-pos-product="${product.id}" data-category-name="${product.category}" ${product.stock <= 0 || (!state.controls.alcoholEnabled && isAlcoholProduct(product)) ? "disabled" : ""}>
              <span>${product.name}</span>
              <strong>${money.format(product.price)}</strong>
              <small>${!state.controls.alcoholEnabled && isAlcoholProduct(product) ? "Alcohol cortado" : `${product.category} - Stock ${product.stock}`}</small>
            </button>
          `).join("")}
        </div>
      </div>
      <aside class="pos-ticket">
        <div>
          <p class="eyebrow">Pedido actual</p>
          <h2>${barCart.length ? `${total(barCart, (item) => item.qty)} items` : "Sin productos"}</h2>
        </div>
        <div class="ticket-items">
          ${barCart.length ? barCart.map((item) => `
            <div class="ticket-item">
              <div>
                <strong>${item.name}</strong>
                <span>${item.qty} x ${money.format(item.price)}</span>
              </div>
              <div class="ticket-actions">
                <button class="icon-button" data-cart-dec="${item.productId}">-</button>
                <button class="icon-button" data-cart-inc="${item.productId}">+</button>
              </div>
            </div>
          `).join("") : `<div class="empty">Toca un producto para empezar.</div>`}
        </div>
        <div class="ticket-total">
          <span>Total</span>
          <strong>${money.format(total(barCart, (item) => item.qty * item.price))}</strong>
        </div>
        <label>Caja
          <select id="quick-box">${boxOptions(selectedBox("Barra 1"))}</select>
        </label>
        <label>Medio de pago
          <select id="quick-payment">${paymentOptions(selectedPayment())}</select>
        </label>
        <label>Tarjeta VIP
          <select id="quick-vip-card"><option value="">Sin tarjeta</option>${state.vipCards.map((card) => `<option value="${card.id}">${card.code} - ${card.holder} (${money.format(card.balance)})</option>`).join("")}</select>
        </label>
        <div class="ticket-buttons">
          <button class="secondary-button" id="clear-cart" ${barCart.length ? "" : "disabled"}>Vaciar</button>
          <button class="primary-button" id="charge-cart" ${barCart.length ? "" : "disabled"}>Cobrar</button>
        </div>
      </aside>
    </section>
    ${session.role === "admin" ? `<div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Venta manual</h2>
            <p class="muted">Para cantidades mayores o casos puntuales.</p>
          </div>
        </div>
        <form id="bar-form" class="form-grid">
          <label>Producto
            <select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name} - ${money.format(product.price)} (${product.stock})</option>`).join("")}</select>
          </label>
          <label>Cantidad
            <input name="qty" type="number" min="1" value="1" required />
          </label>
          <label>Caja
            <select name="boxId">${boxOptions("Barra 1")}</select>
          </label>
          <label>Medio de pago
            <select name="payment">${paymentOptions()}</select>
          </label>
          <button class="primary-button full">Registrar venta</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Productos mas vendidos</h2>
            <p class="muted">Ranking de la noche.</p>
          </div>
        </div>
        ${topProductsTable()}
      </section>
    </div>` : ""}
    ${session.role === "admin" ? `<section class="panel">
      <div class="panel-head"><h2>Ventas de bar</h2></div>
      ${barSalesTable()}
    </section>` : ""}
  `;
}

function mesasView() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Control de mesas</h2>
          <p class="muted">Abrir mesa, cargar consumo, asignar mozo y cobrar.</p>
        </div>
        <button class="primary-button" data-modal="table">Agregar mesa</button>
      </div>
      <div class="grid-3">
        ${state.tables.map((table) => {
          const owed = tableTotal(table) - total(table.payments, (payment) => payment.amount);
          return `
            <article class="card">
              <div class="card-head">
                <div>
                  <h3>Mesa ${table.number}</h3>
                  <p class="muted">${table.waiter || "Sin mozo"}</p>
                </div>
                <span class="status ${table.status === "occupied" ? "warn" : ""}">${table.status === "occupied" ? "Ocupada" : "Libre"}</span>
              </div>
              <p>Total: <strong>${money.format(tableTotal(table))}</strong></p>
              <p>Saldo: <strong>${money.format(owed)}</strong></p>
              <div class="inline-actions">
                <button class="secondary-button" data-open-table="${table.id}">Abrir</button>
                <button class="primary-button" data-add-table-item="${table.id}">Consumo</button>
                <button class="secondary-button" data-pay-table="${table.id}">Cobrar</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function stockView() {
  return `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Transferir mercaderia</h2>
            <p class="muted">Mover stock entre deposito y barras.</p>
          </div>
        </div>
        <form id="transfer-form" class="form-grid">
          <label>Producto<select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("")}</select></label>
          <label>Cantidad<input name="qty" type="number" min="1" required /></label>
          <label>Origen<select name="from">${state.stockLocations.map((location) => `<option>${location}</option>`).join("")}</select></label>
          <label>Destino<select name="to">${state.stockLocations.map((location) => `<option ${location === "Barra 1" ? "selected" : ""}>${location}</option>`).join("")}</select></label>
          <button class="primary-button full">Transferir</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Roturas y faltantes</h2>
            <p class="muted">Registra mercaderia rota, perdida o diferencia de conteo.</p>
          </div>
        </div>
        <form id="breakage-form" class="form-grid">
          <label>Producto<select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("")}</select></label>
          <label>Cantidad<input name="qty" type="number" min="1" required /></label>
          <label>Ubicacion<select name="location">${state.stockLocations.map((location) => `<option>${location}</option>`).join("")}</select></label>
          <label>Motivo<input name="reason" placeholder="Rotura, faltante, ajuste" /></label>
          <button class="danger-button full">Registrar baja</button>
        </form>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Conteo real de stock</h2>
          <p class="muted">Compara stock teorico contra conteo fisico.</p>
        </div>
      </div>
      <form id="stock-count-form" class="form-grid">
        <label>Producto<select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("")}</select></label>
        <label>Ubicacion<select name="location">${state.stockLocations.map((location) => `<option>${location}</option>`).join("")}</select></label>
        <label>Cantidad contada<input name="counted" type="number" min="0" required /></label>
        <label>Observacion<input name="note" placeholder="Opcional" /></label>
        <button class="primary-button full">Guardar conteo</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Stock de productos</h2>
          <p class="muted">Bebidas, tragos, combos, comida y reposiciones.</p>
        </div>
        <button class="primary-button" data-modal="product">Nuevo producto</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Categoria</th><th>Precio</th><th>Stock</th><th>Ubicaciones</th><th>Minimo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${state.products.map((product) => `
              <tr>
                <td><strong>${product.name}</strong></td>
                <td>${product.category}</td>
                <td>${money.format(product.price)}</td>
                <td>${product.stock}</td>
                <td>${stockLocationBadges(product)}</td>
                <td>${product.minStock}</td>
                <td><span class="status ${product.stock <= product.minStock ? "danger" : ""}">${product.stock <= product.minStock ? "Bajo" : "OK"}</span></td>
                <td class="inline-actions">
                  <button class="secondary-button" data-edit-product="${product.id}">Editar</button>
                  <button class="primary-button" data-restock-product="${product.id}">Reponer</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Transferencias</h2></div>${stockTransfersTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Roturas / faltantes</h2></div>${stockBreakagesTable()}</section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Conteos de stock</h2></div>${stockCountsTable()}</section>
  `;
}

function gastosView() {
  return `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Cargar gasto</h2>
            <p class="muted">Empleados, seguridad, cajeros, mozos, proveedores y extras.</p>
          </div>
        </div>
        <form id="expense-form" class="form-grid">
          <label>Categoria
            <select name="category">
              ${["Empleados", "Seguridad", "Cajero", "Mozos", "DJ", "Limpieza", "Proveedor", "Mantenimiento", "Extra"].map((category) => `<option>${category}</option>`).join("")}
            </select>
          </label>
          <label>Monto
            <input name="amount" type="number" min="0" required />
          </label>
          <label>Responsable
            <input name="person" placeholder="Nombre" />
          </label>
          <label>Estado
            <select name="status"><option>Pagado</option><option>Pendiente</option></select>
          </label>
          <label class="full">Detalle
            <textarea name="detail" placeholder="Concepto del gasto"></textarea>
          </label>
          <button class="primary-button full">Guardar gasto</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Gastos por categoria</h2></div>
        ${expenseSummaryTable()}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Listado de gastos</h2></div>
      ${expensesTable()}
    </section>
  `;
}

function reportesView() {
  const gross = entryRevenue() + barRevenue() + tableRevenue();
  const net = gross - expensesTotal();
  return `
    <div class="metrics">
      ${metric("Jornada", `#${state.nightNumber}`)}
      ${metric("Bruto", money.format(gross))}
      ${metric("Gastos", money.format(expensesTotal()))}
      ${metric("Neto estimado", money.format(net))}
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Resumen de jornada</h2></div>
      <div class="system-status">
        <span><strong>Estado</strong> ${state.nightOpen ? "Abierta" : "Cerrada"}</span>
        <span><strong>Apertura</strong> ${formatDate(state.openedAt)}</span>
        <span><strong>Cierre</strong> ${state.closedAt ? formatDate(state.closedAt) : "-"}</span>
        <span><strong>Responsable</strong> ${state.openedBy || "-"}</span>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Cierre por caja</h2>
          <p class="muted">Incluye ventas de ingreso, bar y cobros de mesa.</p>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" id="export-report">Exportar CSV</button>
          <button class="secondary-button" id="print-report">Imprimir</button>
        </div>
      </div>
      ${boxReportTable()}
    </section>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Tickets / comandas</h2></div>${ticketsTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Arqueos</h2></div>${cashCountsTable()}</section>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Entradas</h2></div>${entrySummaryTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Productos</h2></div>${topProductsTable()}</section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Precintos</h2></div>${wristbandsTable(false)}</section>
    <div class="grid-2">
      <section class="panel"><div class="panel-head"><h2>Stock por ubicacion</h2></div>${stockReportTable()}</section>
      <section class="panel"><div class="panel-head"><h2>Auditoria</h2></div>${auditTable()}</section>
    </div>
  `;
}

const views = {
  home: homeView,
  sell: sellView,
  analysis: analysisView,
  dashboard: dashboardView,
  control: controlView,
  cajas: cajasView,
  ingreso: ingresoView,
  puerta: puertaView,
  bar: barView,
  mesas: mesasView,
  vip: vipView,
  rrpp: rrppView,
  stock: stockView,
  gastos: gastosView,
  config: configView,
  close: closeView,
  reportes: reportesView,
};

function paymentOptions(selected = "Efectivo") {
  return state.paymentMethods
    .map((value) => `<option ${value === selected ? "selected" : ""}>${value}</option>`)
    .join("");
}

function boxOptions(preferred) {
  return state.boxes
    .map((box) => `<option value="${box.id}" ${box.name === preferred || box.id === preferred ? "selected" : ""}>${box.name}</option>`)
    .join("");
}

function selectedBox(preferredName) {
  return session.quickBoxId || state.boxes.find((box) => box.name === preferredName)?.id || state.boxes[0]?.id || "";
}

function selectedPayment() {
  return session.quickPayment || "Efectivo";
}

function tableTotal(table) {
  return total(table.items, (item) => item.price * item.qty);
}

function entrySummaryTable() {
  const rows = state.entryTypes.map((type) => {
    const qty = total(state.entrySales.filter((sale) => sale.typeId === type.id), (sale) => sale.qty);
    return `<tr><td>${type.name}</td><td>${qty}</td><td>${money.format(qty * type.price)}</td></tr>`;
  });
  return `<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Cantidad</th><th>Total</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function wristbandsTable(withActions = false) {
  if (!state.wristbands.length) return `<div class="empty">No hay precintos cargados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Precinto</th><th>Color</th><th>Inicial</th><th>Entregados</th><th>Vendidos</th><th>Cortesias</th><th>Usados</th><th>Rotos</th><th>Sobrante</th><th></th></tr></thead>
        <tbody>
          ${state.wristbands.map((item) => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td>${item.color}</td>
              <td>${item.initial}</td>
              <td>${item.delivered}</td>
              <td>${item.sold}</td>
              <td>${item.courtesy}</td>
              <td>${item.used}</td>
              <td>${item.broken}</td>
              <td>${wristbandAvailable(item)}</td>
              <td class="inline-actions">${withActions ? `<button class="secondary-button" data-edit-wristband="${item.id}">Editar</button><button class="danger-button" data-break-wristband="${item.id}">Rotura</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function entrySalesTable() {
  if (!state.entrySales.length) return `<div class="empty">Todavia no hay ventas de ingreso.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Tipo</th><th>Cantidad</th><th>Caja</th><th>Pago</th><th>Total</th></tr></thead>
        <tbody>
          ${state.entrySales.slice().reverse().map((sale) => `
            <tr>
              <td>${formatDate(sale.createdAt)}</td>
              <td>${findEntryType(sale.typeId)?.name || "Entrada"}</td>
              <td>${sale.qty}</td>
              <td>${findBox(sale.boxId)?.name || "-"}</td>
              <td>${sale.payment}</td>
              <td>${money.format(sale.price * sale.qty)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function doorTable(entries, canValidate) {
  if (!entries.length) return `<div class="empty">Sin entradas para mostrar.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Codigo</th><th>Tipo</th><th>Cliente</th><th>Cant.</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${entries.slice(0, 80).map((sale) => `
            <tr>
              <td><strong>${sale.code || "-"}</strong></td>
              <td>${findEntryType(sale.typeId)?.name || "Entrada"}</td>
              <td>${sale.guestName || "-"}</td>
              <td>${sale.qty}</td>
              <td>${sale.usedAt ? `Ingresado ${formatDate(sale.usedAt)}` : "Pendiente"}</td>
              <td>${canValidate ? `<button class="primary-button" data-validate-entry="${sale.id}">Validar</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function vipCardsTable() {
  if (!state.vipCards.length) return `<div class="empty">No hay tarjetas VIP cargadas.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Codigo</th><th>Titular</th><th>Saldo</th><th>Estado</th></tr></thead>
        <tbody>
          ${state.vipCards.map((card) => `
            <tr>
              <td><strong>${card.code}</strong></td>
              <td>${card.holder}</td>
              <td>${money.format(card.balance || 0)}</td>
              <td><span class="status ${card.active ? "" : "warn"}">${card.active ? "Activa" : "Bloqueada"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function promotersTable() {
  if (!state.promoters.length) return `<div class="empty">No hay RRPP cargados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Telefono</th><th>Estado</th></tr></thead>
        <tbody>
          ${state.promoters.map((promoter) => `
            <tr>
              <td><strong>${promoter.name}</strong></td>
              <td>${promoter.phone || "-"}</td>
              <td><span class="status ${promoter.active ? "" : "warn"}">${promoter.active ? "Activo" : "Pausado"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function promoterSummaryTable() {
  if (!state.promoters.length) return `<div class="empty">No hay datos.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>RRPP</th><th>Entradas</th><th>Facturado</th></tr></thead>
        <tbody>
          ${state.promoters.map((promoter) => {
            const entries = state.entrySales.filter((sale) => sale.promoterId === promoter.id);
            return `<tr><td>${promoter.name}</td><td>${total(entries, (sale) => sale.qty)}</td><td>${money.format(total(entries, (sale) => sale.qty * sale.price))}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function barSalesTable() {
  if (!state.sales.length) return `<div class="empty">Todavia no hay ventas de bar.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Producto</th><th>Cantidad</th><th>Caja</th><th>Pago</th><th>Total</th></tr></thead>
        <tbody>
          ${state.sales.slice().reverse().map((sale) => `
            <tr>
              <td>${formatDate(sale.createdAt)}</td>
              <td>${sale.productName}</td>
              <td>${sale.qty}</td>
              <td>${findBox(sale.boxId)?.name || "-"}</td>
              <td>${sale.payment}</td>
              <td>${money.format(sale.price * sale.qty)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function topProductsTable() {
  const grouped = state.products.map((product) => {
    const sold = total(state.sales.filter((sale) => sale.productId === product.id), (sale) => sale.qty);
    const tableSold = total(state.tables.flatMap((table) => table.items).filter((item) => item.productId === product.id), (item) => item.qty);
    return { ...product, sold: sold + tableSold };
  }).sort((a, b) => b.sold - a.sold);
  return `<div class="table-wrap"><table><thead><tr><th>Producto</th><th>Vendidos</th><th>Stock</th><th>Total</th></tr></thead><tbody>${grouped.map((product) => `<tr><td>${product.name}</td><td>${product.sold}</td><td>${product.stock}</td><td>${money.format(product.sold * product.price)}</td></tr>`).join("")}</tbody></table></div>`;
}

function lowStockTable(products) {
  return `<div class="table-wrap"><table><thead><tr><th>Producto</th><th>Stock</th><th>Minimo</th></tr></thead><tbody>${products.map((product) => `<tr><td>${product.name}</td><td>${product.stock}</td><td>${product.minStock}</td></tr>`).join("")}</tbody></table></div>`;
}

function stockLocationBadges(product) {
  return state.stockLocations
    .map((location) => `<span class="mini-badge">${location}: ${product.locations?.[location] || 0}</span>`)
    .join(" ");
}

function stockTransfersTable() {
  if (!state.stockTransfers.length) return `<div class="empty">Sin transferencias registradas.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Producto</th><th>Cant.</th><th>Movimiento</th></tr></thead>
        <tbody>${state.stockTransfers.slice(0, 20).map((move) => `<tr><td>${formatDate(move.createdAt)}</td><td>${move.productName}</td><td>${move.qty}</td><td>${move.from} -> ${move.to}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function stockBreakagesTable() {
  if (!state.stockBreakages.length) return `<div class="empty">Sin bajas registradas.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Producto</th><th>Cant.</th><th>Ubicacion</th><th>Motivo</th></tr></thead>
        <tbody>${state.stockBreakages.slice(0, 20).map((move) => `<tr><td>${formatDate(move.createdAt)}</td><td>${move.productName}</td><td>${move.qty}</td><td>${move.location}</td><td>${move.reason || "-"}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function stockCountsTable() {
  if (!state.stockCounts.length) return `<div class="empty">Sin conteos de stock.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Producto</th><th>Ubicacion</th><th>Teorico</th><th>Contado</th><th>Diferencia</th></tr></thead>
        <tbody>${state.stockCounts.slice(0, 30).map((count) => `<tr><td>${formatDate(count.createdAt)}</td><td>${count.productName}</td><td>${count.location}</td><td>${count.theoretical}</td><td>${count.counted}</td><td>${count.difference}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function expenseSummaryTable() {
  const categories = [...new Set(state.expenses.map((expense) => expense.category))];
  if (!categories.length) return `<div class="empty">Todavia no hay gastos.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Total</th></tr></thead><tbody>${categories.map((category) => `<tr><td>${category}</td><td>${money.format(total(state.expenses.filter((expense) => expense.category === category), (expense) => expense.amount))}</td></tr>`).join("")}</tbody></table></div>`;
}

function expensesTable() {
  if (!state.expenses.length) return `<div class="empty">Todavia no hay gastos cargados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Categoria</th><th>Detalle</th><th>Responsable</th><th>Estado</th><th>Monto</th></tr></thead>
        <tbody>
          ${state.expenses.slice().reverse().map((expense) => `
            <tr>
              <td>${formatDate(expense.createdAt)}</td>
              <td>${expense.category}</td>
              <td>${expense.detail || "-"}</td>
              <td>${expense.person || "-"}</td>
              <td>${expense.status}</td>
              <td>${money.format(expense.amount)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function withdrawalsTable() {
  if (!state.cashWithdrawals.length) return `<div class="empty">Sin retiros registrados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Caja</th><th>Monto</th><th>Motivo</th></tr></thead>
        <tbody>
          ${state.cashWithdrawals.slice(0, 20).map((item) => `
            <tr><td>${formatDate(item.createdAt)}</td><td>${findBox(item.boxId)?.name || "-"}</td><td>${money.format(item.amount)}</td><td>${item.reason || "-"}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function moneyMovementsTable(items = state.moneyMovements) {
  if (!items.length) return `<div class="empty">Sin movimientos de dinero.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Tipo</th><th>Categoria</th><th>Caja</th><th>Monto</th><th>Detalle</th></tr></thead>
        <tbody>
          ${items.slice(0, 40).map((item) => `
            <tr>
              <td>${formatDate(item.createdAt)}</td>
              <td><span class="status ${item.type === "Salida" ? "warn" : ""}">${item.type}</span></td>
              <td>${item.category}</td>
              <td>${findBox(item.boxId)?.name || "-"}</td>
              <td>${money.format(item.amount)}</td>
              <td>${item.detail || item.person || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function ticketsTable() {
  if (!state.tickets.length) return `<div class="empty">Sin tickets emitidos.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nro</th><th>Hora</th><th>Tipo</th><th>Caja</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>
          ${state.tickets.slice(0, 40).map((ticket) => `
            <tr><td><strong>${ticket.number}</strong></td><td>${formatDate(ticket.createdAt)}</td><td>${ticket.type}</td><td>${findBox(ticket.boxId)?.name || "-"}</td><td>${ticket.payment}</td><td>${money.format(ticket.total)}</td><td>${ticket.status}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function cashCountsTable() {
  if (!state.cashCounts.length) return `<div class="empty">Sin arqueos guardados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Caja</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
        <tbody>
          ${state.cashCounts.slice(0, 30).map((count) => `
            <tr><td>${formatDate(count.createdAt)}</td><td>${findBox(count.boxId)?.name || "-"}</td><td>${money.format(count.expected)}</td><td>${money.format(count.counted)}</td><td>${money.format(count.difference)}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function voidRequestsTable() {
  if (!state.voidRequests.length) return `<div class="empty">Sin anulaciones solicitadas.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Area</th><th>Caja</th><th>Ticket</th><th>Detalle</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${state.voidRequests.slice(0, 20).map((item) => `
            <tr>
              <td>${formatDate(item.createdAt)}</td>
              <td>${item.area}</td>
              <td>${findBox(item.boxId)?.name || "-"}</td>
              <td>${item.ticketId ? `#${state.tickets.find((ticket) => ticket.id === item.ticketId)?.number || "-"}` : "-"}</td>
              <td>${item.detail}</td>
              <td>${money.format(item.amount || 0)}</td>
              <td><span class="status ${item.status === "Aprobada" ? "" : item.status === "Rechazada" ? "danger" : "warn"}">${item.status}</span></td>
              <td class="inline-actions">
                ${item.status === "Pendiente" ? `<button class="primary-button" data-approve-void="${item.id}">Aprobar</button><button class="danger-button" data-reject-void="${item.id}">Rechazar</button>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function boxReportTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Caja</th><th>Operador</th><th>Inicial</th><th>Ventas</th><th>Rinde esperado</th><th>Diferencia</th><th>Estado</th><th>Obs.</th></tr></thead>
        <tbody>
          ${state.boxes.map((box) => {
            const sold = total(boxMovements(box.id), (value) => value);
            const expected = boxExpectedCash(box);
            return `<tr><td>${box.name}</td><td>${box.operator || "-"}</td><td>${money.format(box.initialCash || 0)}</td><td>${money.format(sold)}</td><td>${money.format(expected)}</td><td>${box.lastCount === undefined ? "-" : money.format(box.lastDifference || 0)}</td><td>${box.status === "open" ? "Abierta" : "Cerrada"}</td><td>${box.closeNote || "-"}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function stockReportTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Ubicacion</th><th>Unidades</th></tr></thead>
        <tbody>
          ${state.stockLocations.map((location) => {
            const qty = total(state.products, (product) => Number(product.locations?.[location] || 0));
            return `<tr><td>${location}</td><td>${qty}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function auditTable() {
  if (!state.audits.length) return `<div class="empty">Sin movimientos auditados.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Hora</th><th>Area</th><th>Usuario</th><th>Detalle</th></tr></thead>
        <tbody>
          ${state.audits.slice(0, 30).map((audit) => `<tr><td>${formatDate(audit.createdAt)}</td><td>${audit.area}</td><td>${audit.role}</td><td>${audit.detail}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function findBox(id) {
  return state.boxes.find((box) => box.id === id);
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

function findEntryType(id) {
  return state.entryTypes.find((type) => type.id === id);
}

function findWristbandForEntry(type) {
  const name = type?.name?.toLowerCase() || "";
  if (name.includes("vip")) return state.wristbands.find((item) => item.name.toLowerCase().includes("vip"));
  if (name.includes("puerta")) return state.wristbands.find((item) => item.name.toLowerCase().includes("puerta"));
  return state.wristbands.find((item) => item.name.toLowerCase().includes("general")) || state.wristbands[0];
}

function wristbandAvailable(wristband) {
  return Number(wristband.delivered || 0) - Number(wristband.sold || 0) - Number(wristband.courtesy || 0) - Number(wristband.broken || 0);
}

function markWristbandUsed(sale) {
  if (sale.wristbandMarked) return;
  const type = findEntryType(sale.typeId);
  const wristband = type?.wristband ? findWristbandForEntry(type) : null;
  if (!wristband) return;
  wristband.used += Number(sale.qty || 0);
  sale.wristbandMarked = true;
}

function bindViewEvents() {
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.viewJump);
    });
  });

  document.querySelector("#fab-action")?.addEventListener("click", () => {
    if (!session.role) return;
    const menu = document.querySelector("#fab-menu");
    if (menu) menu.hidden = !menu.hidden;
  });

  document.querySelectorAll("[data-fab-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.fabTarget;
      document.querySelector("#fab-menu").hidden = true;
      navigateTo("control");
      setTimeout(() => focusControlAction(target), 0);
    });
  });

  document.querySelectorAll("[data-action-shortcut]").forEach((button) => {
    button.addEventListener("click", () => focusControlAction(button.dataset.actionShortcut));
  });

  document.querySelector("#analysis-filter")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    session.analysisMode = data.mode;
    session.analysisDate = data.date;
    session.analysisMonth = data.month;
    saveSession();
    render();
  });

  document.querySelectorAll("[data-sell-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.sellTab;
      document.querySelectorAll("[data-sell-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".sell-pane").forEach((pane) => pane.classList.toggle("active", pane.id === `sell-${tab}`));
    });
  });

  document.querySelector("#entry-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const type = findEntryType(data.typeId);
    const qty = Number(data.qty);
    if (!assertOpenBox(data.boxId)) return;
    const wristband = type.wristband ? findWristbandForEntry(type) : null;
    if (wristband && wristbandAvailable(wristband) < qty) {
      alert(`No hay precintos suficientes de ${wristband.name}.`);
      return;
    }
    if (wristband) {
      if (Number(type.price) === 0 || data.payment === "Invitacion") wristband.courtesy += qty;
      else wristband.sold += qty;
    }
    state.entrySales.push({
      id: uid(),
      code: `ENT-${Math.floor(100000 + Math.random() * 900000)}`,
      typeId: type.id,
      qty,
      price: Number(type.price),
      consumption: Number(type.consumption || 0),
      accessCount: Number(type.accessCount || 1),
      boxId: data.boxId,
      payment: data.payment,
      promoterId: data.promoterId,
      guestName: data.guestName,
      createdAt: new Date().toISOString(),
    });
    logAudit("Ingreso", `Venta de ${qty} ${type.name}${wristband ? ` con precinto ${wristband.name}` : ""}`);
    alert("Entrada registrada.");
    render();
  });

  document.querySelector("#night-control-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.controls.eventName = data.eventName;
    state.controls.ticketKeyword = data.ticketKeyword;
    state.controls.emergencyNote = data.emergencyNote;
    logAudit("Control", "Controles de noche actualizados");
    alert("Controles guardados.");
    render();
  });

  document.querySelector("#night-open-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.openedBy = data.openedBy;
    state.controls.eventName = data.eventName;
    state.closeSummary = data.closeSummary;
    logAudit("Jornada", "Datos de apertura/cierre actualizados");
    alert("Jornada guardada.");
    render();
  });

  document.querySelector("#open-night-full")?.addEventListener("click", () => {
    openNight();
  });

  document.querySelector("#close-night-full")?.addEventListener("click", () => {
    closeNight();
  });

  document.querySelector("#toggle-alcohol")?.addEventListener("click", () => {
    state.controls.alcoholEnabled = !state.controls.alcoholEnabled;
    logAudit("Control", state.controls.alcoholEnabled ? "Alcohol habilitado" : "Alcohol cortado");
    alert(state.controls.alcoholEnabled ? "Venta de alcohol habilitada." : "Venta de alcohol cortada.");
    render();
  });

  document.querySelector("#withdrawal-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.cashWithdrawals.unshift({
      id: uid(),
      boxId: data.boxId,
      amount: Number(data.amount),
      reason: data.reason,
      createdAt: new Date().toISOString(),
    });
    logAudit("Caja", `Retiro ${money.format(Number(data.amount))} de ${findBox(data.boxId)?.name || "caja"}`);
    alert("Retiro registrado.");
    render();
  });

  document.querySelector("#money-movement-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const movement = {
      id: uid(),
      type: data.type,
      boxId: data.boxId,
      category: data.category,
      amount: Number(data.amount),
      payment: data.payment,
      person: data.person,
      detail: data.detail,
      createdAt: new Date().toISOString(),
    };
    state.moneyMovements.unshift(movement);
    if (movement.type === "Salida") {
      state.cashWithdrawals.unshift({
        id: uid(),
        boxId: movement.boxId,
        amount: movement.amount,
        reason: `${movement.category}: ${movement.detail || ""}`,
        createdAt: movement.createdAt,
      });
    }
    logAudit("Dinero", `${movement.type} ${money.format(movement.amount)} - ${movement.category}`);
    alert("Movimiento registrado.");
    render();
  });

  document.querySelector("#void-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.voidRequests.unshift({
      id: uid(),
      area: data.area,
      boxId: data.boxId,
      ticketId: data.ticketId,
      amount: Number(data.amount || 0),
      detail: data.detail,
      status: "Pendiente",
      createdAt: new Date().toISOString(),
    });
    logAudit("Anulacion", `${data.area}: ${data.detail}`);
    alert("Anulacion solicitada.");
    render();
  });

  document.querySelector("#cash-count-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const box = findBox(data.boxId);
    const expected = (box?.initialCash || 0) + total(boxMovements(data.boxId), (value) => value) - total(state.cashWithdrawals.filter((item) => item.boxId === data.boxId), (item) => item.amount);
    box.lastCount = Number(data.counted);
    box.lastDifference = Number(data.counted) - expected;
    state.cashCounts.unshift({
      id: uid(),
      boxId: data.boxId,
      expected,
      counted: Number(data.counted),
      difference: box.lastDifference,
      createdAt: new Date().toISOString(),
    });
    logAudit("Caja", `Conteo ${box?.name || ""}: diferencia ${money.format(box.lastDifference)}`);
    alert(`Conteo guardado. Diferencia: ${money.format(box.lastDifference)}.`);
    render();
  });

  document.querySelectorAll("[data-approve-void]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = state.voidRequests.find((item) => item.id === button.dataset.approveVoid);
      if (!request) return;
      request.status = "Aprobada";
      request.resolvedAt = new Date().toISOString();
      const ticket = state.tickets.find((item) => item.id === request.ticketId);
      if (ticket) {
        ticket.status = "Anulado";
        if (!request.amount) request.amount = ticket.total;
        if (!request.boxId) request.boxId = ticket.boxId;
      }
      logAudit("Anulacion", `Aprobada: ${request.detail}`);
      alert("Anulacion aprobada.");
      render();
    });
  });

  document.querySelectorAll("[data-reject-void]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = state.voidRequests.find((item) => item.id === button.dataset.rejectVoid);
      if (!request) return;
      request.status = "Rechazada";
      request.resolvedAt = new Date().toISOString();
      logAudit("Anulacion", `Rechazada: ${request.detail}`);
      alert("Anulacion rechazada.");
      render();
    });
  });

  document.querySelector("#door-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const sale = state.entrySales.find((entry) => entry.code?.toUpperCase() === data.code.trim().toUpperCase());
    if (!sale) {
      alert("Codigo no encontrado.");
      return;
    }
    if (sale.usedAt) {
      alert("Esa entrada ya fue utilizada.");
      return;
    }
    sale.usedAt = new Date().toISOString();
    markWristbandUsed(sale);
    logAudit("Puerta", `Ingreso validado ${sale.code}`);
    alert(`Ingreso validado: ${sale.code}.`);
    render();
  });

  document.querySelectorAll("[data-validate-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const sale = state.entrySales.find((entry) => entry.id === button.dataset.validateEntry);
      if (!sale || sale.usedAt) return;
      sale.usedAt = new Date().toISOString();
      markWristbandUsed(sale);
      logAudit("Puerta", `Ingreso validado ${sale.code}`);
      alert(`Ingreso validado: ${sale.code}.`);
      render();
    });
  });

  document.querySelector("#bar-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const product = findProduct(data.productId);
    const qty = Number(data.qty);
    if (!assertOpenBox(data.boxId)) return;
    const location = saleLocation(data.boxId);
    if (!consumeProduct(product, qty, location)) {
      alert(`No hay stock suficiente en ${location}.`);
      return;
    }
    state.sales.push({
      id: uid(),
      productId: product.id,
      productName: product.name,
      qty,
      price: Number(product.price),
      boxId: data.boxId,
      payment: data.payment,
      createdAt: new Date().toISOString(),
    });
    const ticket = createTicket({
      type: "Barra",
      boxId: data.boxId,
      payment: data.payment,
      source: "Venta manual",
      items: [{ productId: product.id, name: product.name, qty, price: Number(product.price) }],
    });
    logAudit("Barra", `Venta ${qty} ${product.name} desde ${location}`);
    alert(`Venta registrada. Ticket ${ticket.number}.`);
    render();
  });

  document.querySelector("#quick-box")?.addEventListener("change", (event) => {
    session.quickBoxId = event.target.value;
    saveSession();
  });

  document.querySelector("#quick-payment")?.addEventListener("change", (event) => {
    session.quickPayment = event.target.value;
    saveSession();
  });

  document.querySelectorAll("[data-pos-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = findProduct(button.dataset.posProduct);
      if (!product || product.stock <= 0) {
        alert("Ese producto no tiene stock.");
        return;
      }
      if (!state.controls.alcoholEnabled && isAlcoholProduct(product)) {
        alert("La venta de alcohol esta cortada.");
        return;
      }
      addToBarCart(product.id, 1);
      render();
    });
  });

  document.querySelectorAll("[data-cart-inc]").forEach((button) => {
    button.addEventListener("click", () => {
      addToBarCart(button.dataset.cartInc, 1);
      render();
    });
  });

  document.querySelectorAll("[data-cart-dec]").forEach((button) => {
    button.addEventListener("click", () => {
      addToBarCart(button.dataset.cartDec, -1);
      render();
    });
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-category-name]").forEach((item) => {
        item.hidden = category !== "Todos" && item.dataset.categoryName !== category;
      });
    });
  });

  document.querySelector("#clear-cart")?.addEventListener("click", () => {
    barCart = [];
    render();
  });

  document.querySelector("#charge-cart")?.addEventListener("click", () => {
    if (!barCart.length) return;
    const missing = barCart.find((item) => {
      const product = findProduct(item.productId);
      return !product || product.stock < item.qty;
    });
    if (missing) {
      alert(`No hay stock suficiente de ${missing.name}.`);
      return;
    }
    const boxId = document.querySelector("#quick-box")?.value || selectedBox("Barra 1");
    if (!assertOpenBox(boxId)) return;
    const payment = document.querySelector("#quick-payment")?.value || selectedPayment();
    const vipCardId = document.querySelector("#quick-vip-card")?.value;
    const cartTotal = total(barCart, (item) => item.qty * item.price);
    if (payment === "Tarjeta VIP") {
      const card = state.vipCards.find((item) => item.id === vipCardId);
      if (!card) {
        alert("Elegi una tarjeta VIP para cobrar.");
        return;
      }
      if (!card.active || card.balance < cartTotal) {
        alert("La tarjeta VIP no tiene saldo suficiente.");
        return;
      }
      card.balance -= cartTotal;
      logAudit("VIP", `Consumo ${card.code} por ${money.format(cartTotal)}`);
    }
    session.quickBoxId = boxId;
    session.quickPayment = payment;
    const location = saleLocation(boxId);
    const outOfLocation = barCart.find((item) => {
      const product = findProduct(item.productId);
      return !product || (product.locations?.[location] || 0) < item.qty;
    });
    if (outOfLocation) {
      alert(`No hay stock suficiente de ${outOfLocation.name} en ${location}.`);
      return;
    }
    barCart.forEach((item) => {
      const product = findProduct(item.productId);
      consumeProduct(product, item.qty, location);
      state.sales.push({
        id: uid(),
        productId: product.id,
        productName: product.name,
        qty: item.qty,
        price: Number(product.price),
        boxId,
        payment,
        createdAt: new Date().toISOString(),
      });
    });
    const ticket = createTicket({
      type: "Barra",
      boxId,
      payment,
      source: "POS",
      items: barCart.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price })),
    });
    const charged = money.format(cartTotal);
    logAudit("Barra", `Venta POS ${charged} desde ${location} ticket ${ticket.number}`);
    barCart = [];
    alert(`Venta cobrada: ${charged}. Ticket ${ticket.number}.`);
    render();
  });

  document.querySelector("#expense-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.expenses.push({
      id: uid(),
      category: data.category,
      amount: Number(data.amount),
      person: data.person,
      status: data.status,
      detail: data.detail,
      createdAt: new Date().toISOString(),
    });
    alert("Gasto guardado.");
    render();
  });

  document.querySelector("#vip-recharge-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const card = state.vipCards.find((item) => item.id === data.cardId);
    if (!card) return;
    const amount = Number(data.amount);
    card.balance += amount;
    state.sales.push({
      id: uid(),
      productId: "vip-recharge",
      productName: `Recarga ${card.code}`,
      qty: 1,
      price: amount,
      boxId: data.boxId,
      payment: data.payment,
      createdAt: new Date().toISOString(),
    });
    logAudit("VIP", `Recarga ${card.code} por ${money.format(amount)}`);
    alert("Tarjeta recargada.");
    render();
  });

  document.querySelector("#master-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.paymentMethods = data.paymentMethods.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    state.stockLocations = data.stockLocations.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    state.products.forEach((product) => {
      product.locations ||= {};
      state.stockLocations.forEach((location) => {
        product.locations[location] ||= 0;
      });
      syncProductStock(product);
    });
    logAudit("Config", "Datos maestros actualizados");
    alert("Configuracion guardada.");
    render();
  });

  document.querySelector("#transfer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const product = findProduct(data.productId);
    const qty = Number(data.qty);
    if (!product) return;
    product.locations ||= {};
    product.locations[data.from] ||= 0;
    product.locations[data.to] ||= 0;
    if (data.from === data.to) {
      alert("Origen y destino no pueden ser iguales.");
      return;
    }
    if (product.locations[data.from] < qty) {
      alert(`No hay stock suficiente en ${data.from}.`);
      return;
    }
    product.locations[data.from] -= qty;
    product.locations[data.to] += qty;
    syncProductStock(product);
    state.stockTransfers.unshift({
      id: uid(),
      productId: product.id,
      productName: product.name,
      qty,
      from: data.from,
      to: data.to,
      createdAt: new Date().toISOString(),
    });
    logAudit("Stock", `Transferencia ${qty} ${product.name}: ${data.from} -> ${data.to}`);
    alert("Transferencia registrada.");
    render();
  });

  document.querySelector("#breakage-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const product = findProduct(data.productId);
    const qty = Number(data.qty);
    if (!product) return;
    if (!consumeProduct(product, qty, data.location)) {
      alert(`No hay stock suficiente en ${data.location}.`);
      return;
    }
    state.stockBreakages.unshift({
      id: uid(),
      productId: product.id,
      productName: product.name,
      qty,
      location: data.location,
      reason: data.reason,
      createdAt: new Date().toISOString(),
    });
    logAudit("Stock", `Baja ${qty} ${product.name} en ${data.location}`);
    alert("Baja registrada.");
    render();
  });

  document.querySelector("#stock-count-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const product = findProduct(data.productId);
    if (!product) return;
    const theoretical = Number(product.locations?.[data.location] || 0);
    const counted = Number(data.counted);
    state.stockCounts.unshift({
      id: uid(),
      productId: product.id,
      productName: product.name,
      location: data.location,
      theoretical,
      counted,
      difference: counted - theoretical,
      note: data.note,
      createdAt: new Date().toISOString(),
    });
    product.locations[data.location] = counted;
    syncProductStock(product);
    logAudit("Stock", `Conteo ${product.name} ${data.location}: diferencia ${counted - theoretical}`);
    alert("Conteo de stock guardado.");
    render();
  });

  document.querySelectorAll("[data-box-flow]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = findBox(button.dataset.boxFlow);
      if (box.status === "open") openBoxCloseModal(box);
      else openBoxOpenModal(box);
    });
  });

  document.querySelectorAll("[data-edit-box]").forEach((button) => {
    button.addEventListener("click", () => openBoxModal(findBox(button.dataset.editBox)));
  });

  document.querySelectorAll("[data-modal='box']").forEach((button) => {
    button.addEventListener("click", () => openBoxModal());
  });

  document.querySelectorAll("[data-modal='entry-type']").forEach((button) => {
    button.addEventListener("click", () => openEntryTypeModal());
  });

  document.querySelectorAll("[data-modal='wristband']").forEach((button) => {
    button.addEventListener("click", () => openWristbandModal());
  });

  document.querySelectorAll("[data-edit-entry-type]").forEach((button) => {
    button.addEventListener("click", () => openEntryTypeModal(findEntryType(button.dataset.editEntryType)));
  });

  document.querySelectorAll("[data-edit-wristband]").forEach((button) => {
    button.addEventListener("click", () => openWristbandModal(state.wristbands.find((item) => item.id === button.dataset.editWristband)));
  });

  document.querySelectorAll("[data-break-wristband]").forEach((button) => {
    button.addEventListener("click", () => openWristbandBreakModal(state.wristbands.find((item) => item.id === button.dataset.breakWristband)));
  });

  document.querySelectorAll("[data-modal='product']").forEach((button) => {
    button.addEventListener("click", () => openProductModal());
  });

  document.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => openProductModal(findProduct(button.dataset.editProduct)));
  });

  document.querySelectorAll("[data-restock-product]").forEach((button) => {
    button.addEventListener("click", () => openRestockModal(findProduct(button.dataset.restockProduct)));
  });

  document.querySelectorAll("[data-modal='table']").forEach((button) => {
    button.addEventListener("click", () => openNewTableModal());
  });

  document.querySelectorAll("[data-modal='vip-card']").forEach((button) => {
    button.addEventListener("click", () => openVipCardModal());
  });

  document.querySelectorAll("[data-modal='promoter']").forEach((button) => {
    button.addEventListener("click", () => openPromoterModal());
  });

  document.querySelectorAll("[data-open-table]").forEach((button) => {
    button.addEventListener("click", () => openTableModal(state.tables.find((table) => table.id === button.dataset.openTable)));
  });

  document.querySelectorAll("[data-add-table-item]").forEach((button) => {
    button.addEventListener("click", () => openTableItemModal(state.tables.find((table) => table.id === button.dataset.addTableItem)));
  });

  document.querySelectorAll("[data-pay-table]").forEach((button) => {
    button.addEventListener("click", () => openTablePayModal(state.tables.find((table) => table.id === button.dataset.payTable)));
  });

  document.querySelector("#print-report")?.addEventListener("click", () => window.print());
  document.querySelector("#export-report")?.addEventListener("click", () => {
    const rows = [
      ["Caja", "Operador", "Inicial", "Ventas", "Retiros", "Rinde esperado", "Contado", "Diferencia", "Estado"],
      ...state.boxes.map((box) => {
        const sold = total(boxMovements(box.id), (value) => value);
        const withdrawals = total(state.cashWithdrawals.filter((item) => item.boxId === box.id), (item) => item.amount);
        return [
          box.name,
          box.operator || "",
          box.initialCash || 0,
          sold,
          withdrawals,
          boxExpectedCash(box),
          box.lastCount ?? "",
          box.lastDifference ?? "",
          box.status,
        ];
      }),
    ];
    downloadCsv("cierre-cajas.csv", rows);
  });
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function addToBarCart(productId, qtyChange) {
  const product = findProduct(productId);
  if (!product) return;
  const current = barCart.find((item) => item.productId === productId);
  const currentQty = current?.qty || 0;
  const nextQty = currentQty + qtyChange;
  if (nextQty < 0) return;
  if (nextQty > product.stock) {
    alert("No hay stock suficiente.");
    return;
  }
  if (nextQty === 0) {
    barCart = barCart.filter((item) => item.productId !== productId);
    return;
  }
  if (current) current.qty = nextQty;
  else {
    barCart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      qty: nextQty,
    });
  }
}

function openModal(title, html, onSubmit) {
  const template = document.querySelector("#modal-template");
  const modalNode = template.content.firstElementChild.cloneNode(true);
  modalNode.querySelector("h2").textContent = title;
  modalNode.querySelector(".modal-body").innerHTML = html;
  modalNode.querySelector(".modal-close").addEventListener("click", () => modalNode.remove());
  modalNode.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<div class="modal-actions"><button class="secondary-button modal-cancel">Cancelar</button></div>`);
  modalNode.querySelector(".modal-cancel").addEventListener("click", () => modalNode.remove());
  modalNode.addEventListener("click", (event) => {
    if (event.target === modalNode) modalNode.remove();
  });
  const form = modalNode.querySelector("form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const shouldClose = onSubmit(Object.fromEntries(new FormData(form)));
      if (shouldClose === false) return;
      modalNode.remove();
      render();
    });
  }
  document.body.appendChild(modalNode);
}

function openBoxModal(box) {
  openModal(
    box ? "Editar caja" : "Nueva caja",
    `<form class="form-grid">
      <label>Nombre<input name="name" value="${box?.name || ""}" required /></label>
      <label>Operador<input name="operator" value="${box?.operator || ""}" /></label>
      <label>Monto inicial<input name="initialCash" type="number" min="0" value="${box?.initialCash || 0}" /></label>
      <label>Estado<select name="status"><option value="open" ${box?.status === "open" ? "selected" : ""}>Abierta</option><option value="closed" ${box?.status === "closed" ? "selected" : ""}>Cerrada</option></select></label>
      <button class="primary-button full">Guardar</button>
    </form>`,
    (data) => {
      if (box) Object.assign(box, { ...data, initialCash: Number(data.initialCash) });
      else state.boxes.push({ id: uid(), ...data, initialCash: Number(data.initialCash) });
    },
  );
}

function openBoxOpenModal(box) {
  openModal(
    `Abrir ${box.name}`,
    `<form class="form-grid">
      <label>Cajero / responsable<input name="operator" value="${box.operator || ""}" required /></label>
      <label>Efectivo inicial<input name="initialCash" type="number" min="0" value="${box.initialCash || 0}" required /></label>
      <label class="full">Observacion<input name="note" placeholder="Opcional" /></label>
      <button class="primary-button full">Abrir caja</button>
    </form>`,
    (data) => {
      if (!state.nightOpen) {
        alert("Primero abri la jornada.");
        return false;
      }
      box.operator = data.operator;
      box.initialCash = Number(data.initialCash);
      box.status = "open";
      box.openedAt = new Date().toISOString();
      box.closedAt = null;
      box.closeNote = "";
      box.lastCount = undefined;
      box.lastDifference = undefined;
      logAudit("Caja", `Apertura ${box.name} por ${box.operator}`);
    },
  );
}

function openBoxCloseModal(box) {
  const expected = boxExpectedCash(box);
  openModal(
    `Cerrar ${box.name}`,
    `<form class="form-grid">
      <label>Rinde esperado<input value="${money.format(expected)}" disabled /></label>
      <label>Efectivo contado<input name="counted" type="number" min="0" required /></label>
      <label class="full">Observacion de cierre<textarea name="note" placeholder="Diferencias, pagos pendientes, aclaraciones">${box.closeNote || ""}</textarea></label>
      <button class="danger-button full">Cerrar caja</button>
    </form>`,
    (data) => {
      const counted = Number(data.counted);
      box.lastCount = counted;
      box.lastDifference = counted - expected;
      box.closeNote = data.note;
      box.status = "closed";
      box.closedAt = new Date().toISOString();
      state.cashCounts.unshift({
        id: uid(),
        boxId: box.id,
        expected,
        counted,
        difference: box.lastDifference,
        note: data.note,
        createdAt: new Date().toISOString(),
      });
      logAudit("Caja", `Cierre ${box.name}: diferencia ${money.format(box.lastDifference)}`);
    },
  );
}

function openEntryTypeModal(type) {
  openModal(
    type ? "Editar entrada" : "Nuevo tipo de entrada",
    `<form class="form-grid">
      <label>Nombre<input name="name" value="${type?.name || ""}" required /></label>
      <label>Precio<input name="price" type="number" min="0" value="${type?.price || 0}" required /></label>
      <label>Usa precinto<select name="wristband"><option value="true" ${type?.wristband !== false ? "selected" : ""}>Si</option><option value="false" ${type?.wristband === false ? "selected" : ""}>No</option></select></label>
      <button class="primary-button full">Guardar</button>
    </form>`,
    (data) => {
      const payload = { name: data.name, price: Number(data.price), wristband: data.wristband === "true" };
      if (type) Object.assign(type, payload);
      else state.entryTypes.push({ id: uid(), consumption: 0, accessCount: 1, ...payload });
    },
  );
}

function openWristbandModal(wristband) {
  openModal(
    wristband ? "Editar precinto" : "Nuevo precinto",
    `<form class="form-grid">
      <label>Nombre<input name="name" value="${wristband?.name || ""}" required /></label>
      <label>Color<input name="color" value="${wristband?.color || ""}" required /></label>
      <label>Inicial<input name="initial" type="number" min="0" value="${wristband?.initial || 0}" /></label>
      <label>Entregados<input name="delivered" type="number" min="0" value="${wristband?.delivered || 0}" /></label>
      <button class="primary-button full">Guardar precinto</button>
    </form>`,
    (data) => {
      const payload = {
        name: data.name,
        color: data.color,
        initial: Number(data.initial || 0),
        delivered: Number(data.delivered || 0),
        sold: Number(wristband?.sold || 0),
        used: Number(wristband?.used || 0),
        courtesy: Number(wristband?.courtesy || 0),
        broken: Number(wristband?.broken || 0),
      };
      if (wristband) Object.assign(wristband, payload);
      else state.wristbands.push({ id: uid(), ...payload });
      logAudit("Precintos", `${wristband ? "Editado" : "Creado"} ${payload.name}`);
    },
  );
}

function openWristbandBreakModal(wristband) {
  openModal(
    `Rotura ${wristband.name}`,
    `<form class="form-grid">
      <label>Cantidad<input name="qty" type="number" min="1" required /></label>
      <button class="danger-button full">Registrar rotura</button>
    </form>`,
    (data) => {
      wristband.broken += Number(data.qty);
      logAudit("Precintos", `Rotura ${data.qty} ${wristband.name}`);
    },
  );
}

function openProductModal(product) {
  openModal(
    product ? "Editar producto" : "Nuevo producto",
    `<form class="form-grid">
      <label>Nombre<input name="name" value="${product?.name || ""}" required /></label>
      <label>Categoria<input name="category" value="${product?.category || "Bebidas"}" required /></label>
      <label>Precio<input name="price" type="number" min="0" value="${product?.price || 0}" required /></label>
      <label>Stock<input name="stock" type="number" min="0" value="${product?.stock || 0}" required /></label>
      <label>Stock minimo<input name="minStock" type="number" min="0" value="${product?.minStock || 0}" required /></label>
      <button class="primary-button full">Guardar</button>
    </form>`,
    (data) => {
      const payload = {
        name: data.name,
        category: data.category,
        price: Number(data.price),
        stock: Number(data.stock),
        minStock: Number(data.minStock),
      };
      if (product) {
        const difference = payload.stock - Number(product.stock || 0);
        Object.assign(product, payload);
        product.locations ||= {};
        product.locations.Deposito = Number(product.locations.Deposito || 0) + difference;
        if (product.locations.Deposito < 0) product.locations.Deposito = 0;
        syncProductStock(product);
      } else state.products.push({ id: uid(), ...payload, locations: { Deposito: payload.stock, "Barra 1": 0, "Barra 2": 0, VIP: 0 } });
    },
  );
}

function openRestockModal(product) {
  openModal(
    `Reponer ${product.name}`,
    `<form class="form-grid">
      <label>Cantidad a sumar<input name="qty" type="number" min="1" required /></label>
      <label>Destino<select name="location">${state.stockLocations.map((location) => `<option>${location}</option>`).join("")}</select></label>
      <button class="primary-button full">Reponer</button>
    </form>`,
    (data) => {
      const qty = Number(data.qty);
      const location = data.location || "Deposito";
      product.locations ||= {};
      product.locations[location] = Number(product.locations[location] || 0) + qty;
      syncProductStock(product);
      logAudit("Stock", `Reposicion ${qty} ${product.name} en ${location}`);
    },
  );
}

function openNewTableModal() {
  openModal(
    "Agregar mesa",
    `<form class="form-grid">
      <label>Numero<input name="number" type="number" min="1" required /></label>
      <button class="primary-button full">Crear mesa</button>
    </form>`,
    (data) => {
      state.tables.push({
        id: uid(),
        number: Number(data.number),
        waiter: "",
        status: "free",
        items: [],
        payments: [],
      });
    },
  );
}

function openVipCardModal() {
  openModal(
    "Nueva tarjeta VIP",
    `<form class="form-grid">
      <label>Codigo<input name="code" value="VIP-${String(state.vipCards.length + 1).padStart(3, "0")}" required /></label>
      <label>Titular<input name="holder" placeholder="Mesa, cliente o gerencia" required /></label>
      <label>Saldo inicial<input name="balance" type="number" min="0" value="0" /></label>
      <button class="primary-button full">Crear tarjeta</button>
    </form>`,
    (data) => {
      state.vipCards.push({
        id: uid(),
        code: data.code,
        holder: data.holder,
        balance: Number(data.balance || 0),
        active: true,
      });
      logAudit("VIP", `Nueva tarjeta ${data.code}`);
    },
  );
}

function openPromoterModal() {
  openModal(
    "Nuevo RRPP",
    `<form class="form-grid">
      <label>Nombre<input name="name" required /></label>
      <label>Telefono<input name="phone" /></label>
      <button class="primary-button full">Guardar RRPP</button>
    </form>`,
    (data) => {
      state.promoters.push({
        id: uid(),
        name: data.name,
        phone: data.phone,
        active: true,
      });
      logAudit("RRPP", `Nuevo RRPP ${data.name}`);
    },
  );
}

function openTableModal(table) {
  openModal(
    `Mesa ${table.number}`,
    `<form class="form-grid">
      <label>Mozo<input name="waiter" value="${table.waiter || ""}" /></label>
      <label>Estado<select name="status"><option value="occupied" ${table.status === "occupied" ? "selected" : ""}>Ocupada</option><option value="free" ${table.status === "free" ? "selected" : ""}>Libre</option></select></label>
      <button class="primary-button full">Guardar</button>
    </form>`,
    (data) => {
      table.waiter = data.waiter;
      table.status = data.status;
    },
  );
}

function openTableItemModal(table) {
  openModal(
    `Consumo mesa ${table.number}`,
    `<form class="form-grid">
      <label>Producto<select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name} - ${money.format(product.price)} (${product.stock})</option>`).join("")}</select></label>
      <label>Cantidad<input name="qty" type="number" min="1" value="1" required /></label>
      <button class="primary-button full">Agregar consumo</button>
    </form>`,
    (data) => {
      const product = findProduct(data.productId);
      const qty = Number(data.qty);
      if (!consumeProduct(product, qty, "VIP")) {
        alert("No hay stock suficiente en VIP para la mesa.");
        return false;
      }
      table.status = "occupied";
      table.items.push({
        id: uid(),
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty,
        createdAt: new Date().toISOString(),
      });
      return true;
    },
  );
}

function openTablePayModal(table) {
  const owed = tableTotal(table) - total(table.payments, (payment) => payment.amount);
  openModal(
    `Cobrar mesa ${table.number}`,
    `<form class="form-grid">
      <label>Monto<input name="amount" type="number" min="0" value="${owed}" required /></label>
      <label>Caja<select name="boxId">${boxOptions("Caja central")}</select></label>
      <label>Medio de pago<select name="payment">${paymentOptions()}</select></label>
      <button class="primary-button full">Registrar cobro</button>
    </form>`,
    (data) => {
      if (!assertOpenBox(data.boxId)) return false;
      table.payments.push({
        id: uid(),
        amount: Number(data.amount),
        boxId: data.boxId,
        payment: data.payment,
        createdAt: new Date().toISOString(),
      });
      createTicket({
        type: "Mesa",
        boxId: data.boxId,
        payment: data.payment,
        source: `Mesa ${table.number}`,
        items: table.items.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price })),
      });
      const balance = tableTotal(table) - total(table.payments, (payment) => payment.amount);
      if (balance <= 0) table.status = "free";
    },
  );
}

function resetDemo() {
  if (!confirm("Esto borra los datos actuales y vuelve a la configuracion inicial. Continuar?")) return;
  state = initialState();
  barCart = [];
  render();
}

function closeNight() {
  const openBoxes = state.boxes.filter((box) => box.status === "open");
  if (openBoxes.length) {
    alert(`No se puede cerrar la noche. Quedan cajas abiertas: ${openBoxes.map((box) => box.name).join(", ")}.`);
    return;
  }
  state.nightOpen = false;
  state.closedAt = new Date().toISOString();
  state.closeSummary ||= `Cierre #${state.nightNumber} - ${formatDate(state.closedAt)}`;
  logAudit("Jornada", `Noche #${state.nightNumber} cerrada`);
  state.currentView = "reportes";
  alert("Noche cerrada. Revisar reportes.");
  render();
}

function openNight() {
  if (state.nightOpen) {
    alert("La noche ya esta abierta.");
    return;
  }
  if (!confirm("Abrir nueva jornada ROXO? Se conserva configuracion, productos y stock actual; se limpian ventas operativas de la noche anterior.")) return;
  state.nightNumber += 1;
  state.nightOpen = true;
  state.openedAt = new Date().toISOString();
  state.closedAt = null;
  state.closeSummary = "";
  state.entrySales = [];
  state.sales = [];
  state.tickets = [];
  state.cashWithdrawals = [];
  state.cashCounts = [];
  state.voidRequests = [];
  state.stockTransfers = [];
  state.stockBreakages = [];
  state.stockCounts = [];
  state.expenses = [];
  state.tables.forEach((table) => {
    table.status = "free";
    table.items = [];
    table.payments = [];
  });
  state.wristbands.forEach((item) => {
    item.sold = 0;
    item.used = 0;
    item.courtesy = 0;
    item.broken = 0;
  });
  state.boxes.forEach((box) => {
    box.status = "closed";
    box.openedAt = null;
    box.closedAt = null;
    box.lastCount = undefined;
    box.lastDifference = undefined;
    box.closeNote = "";
  });
  barCart = [];
  logAudit("Jornada", `Nueva noche #${state.nightNumber} abierta`);
  state.currentView = "control";
  alert("Nueva noche abierta. Ahora abri las cajas que van a trabajar.");
  render();
}

render();

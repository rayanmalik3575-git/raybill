// script.js
// RayBill — invoice UI: items, preview, templates, logo, employee, print-only preview, PRO unlock
(() => {
  const LEMONSQUEEZY_URL = "https://snapvoice.lemonsqueezy.com/buy/554b2bca-a60c-49bf-ba50-348fef404439";
  const FREE_MAX_ITEMS = 2;

  // currency symbol map
  const currencySymbols = {
    USD: "$",
    PKR: "Rs",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    SAR: "﷼",
    AED: "د.إ"
  };

  // state
  let isProUser = localStorage.getItem("raybill_is_pro") === "true";

  // DOM refs
  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItemBtn");
  const resetBtn = document.getElementById("resetBtn");
  const savePngBtn = document.getElementById("savePngBtn");
  const printBtn = document.getElementById("printBtn");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const upgradeBtnBottomMonthly = document.getElementById("upgradeBtnBottomMonthly");
  const upgradeBtnBottomYearly = document.getElementById("upgradeBtnBottomYearly");
  const debugProBtn = document.getElementById("debugProBtn");

  const businessName = document.getElementById("businessName");
  const businessEmail = document.getElementById("businessEmail");
  const businessAddress = document.getElementById("businessAddress");
  const clientName = document.getElementById("clientName");
  const clientEmail = document.getElementById("clientEmail");
  const employeeName = document.getElementById("employeeName");
  const invoiceNumber = document.getElementById("invoiceNumber");
  const invoiceDate = document.getElementById("invoiceDate");
  const dueDate = document.getElementById("dueDate");
  const currencyEl = document.getElementById("currency");
  const taxPercent = document.getElementById("taxPercent");
  const discountPercent = document.getElementById("discountPercent");
  const notes = document.getElementById("notes");
  const logoInput = document.getElementById("logoInput");
  const logoPreview = document.getElementById("logoPreview");
  const logoHint = document.getElementById("logoHint");

  const showPaymentQr = document.getElementById("showPaymentQr");
  const showWhatsAppQr = document.getElementById("showWhatsAppQr");
  const paymentLink = document.getElementById("paymentLink");
  const whatsAppNumber = document.getElementById("whatsAppNumber");

  const invoicePreview = document.getElementById("invoicePreview");
  const previewBody = document.getElementById("previewBody");
  const previewBusinessName = document.getElementById("previewBusinessName");
  const previewBusinessEmail = document.getElementById("previewBusinessEmail");
  const previewInvoiceNumber = document.getElementById("previewInvoiceNumber");
  const previewClientName = document.getElementById("previewClientName");
  const previewClientEmail = document.getElementById("previewClientEmail");
  const previewEmployeeWrap = document.getElementById("previewEmployeeWrap");
  const previewEmployeeName = document.getElementById("previewEmployeeName");

  const paymentQrBox = document.getElementById("paymentQrBox");
  const whatsAppQrBox = document.getElementById("whatsAppQrBox");

  const templateSelect = document.getElementById("templateSelect");
  const templateHeader = document.getElementById("templateHeader");
  const templateHeaderText = document.getElementById("templateHeaderText");

  // small toast
  function toast(msg, time = 2000) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, { position: "fixed", right: "20px", bottom: "30px", background: "rgba(0,0,0,.8)", color: "#fff", padding: "8px 12px", borderRadius: "8px", zIndex: 9999 });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), time);
  }

  // helpers
  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // item factory
  function createItemRow(description = "", qty = 1, price = 0) {
    const row = document.createElement("div");
    row.className = "item-row";

    const desc = document.createElement("input");
    desc.type = "text"; desc.placeholder = "Item or service"; desc.value = description; desc.className = "item-desc";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number"; qtyInput.min = "1"; qtyInput.value = qty; qtyInput.className = "item-qty";

    const priceInput = document.createElement("input");
    priceInput.type = "number"; priceInput.min = "0"; priceInput.step = "0.01"; priceInput.value = price; priceInput.className = "item-price";

    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "delete-item-btn"; delBtn.textContent = "✕";

    // events
    desc.addEventListener("input", updateUI);
    qtyInput.addEventListener("input", () => { if (!qtyInput.value || Number(qtyInput.value) < 1) qtyInput.value = 1; updateUI(); });
    priceInput.addEventListener("input", updateUI);

    delBtn.addEventListener("click", () => {
      const current = itemsContainer.querySelectorAll(".item-row").length;
      if (current <= 1) { toast("At least one line item required."); return; }
      row.remove();
      updateUI();
      enforceLimits();
    });

    row.appendChild(desc);
    row.appendChild(qtyInput);
    row.appendChild(priceInput);
    row.appendChild(delBtn);
    return row;
  }

  // logo handling
  logoInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      logoPreview.src = "";
      logoPreview.style.display = "none";
      if (logoHint) logoHint.textContent = "No logo selected";
      return;
    }
    if (logoHint) logoHint.textContent = f.name;
    const reader = new FileReader();
    reader.onload = function (ev) {
      logoPreview.src = ev.target.result;
      logoPreview.style.display = "block";
      updateUI();
    };
    reader.readAsDataURL(f);
  });

  // count items
  function countItems() { return itemsContainer.querySelectorAll(".item-row").length; }

  // enforce free plan limits
  function enforceLimits() {
    const count = countItems();
    if (!isProUser && count >= FREE_MAX_ITEMS) {
      addItemBtn.classList.add("disabled"); addItemBtn.disabled = true;
      addItemBtn.textContent = "+ Add item (Free plan limit reached)";
    } else {
      addItemBtn.classList.remove("disabled"); addItemBtn.disabled = false; addItemBtn.textContent = "+ Add item";
    }
  }

  function addItem() {
    if (!isProUser && countItems() >= FREE_MAX_ITEMS) {
      toast("Free plan allows up to 2 line items. Upgrade for more.");
      enforceLimits();
      return;
    }
    const row = createItemRow("", 1, 0);
    itemsContainer.appendChild(row);
    updateUI();
    enforceLimits();
    const lastDesc = itemsContainer.querySelector(".item-row:last-child .item-desc");
    if (lastDesc) lastDesc.focus();
  }

  // QR helper
  function buildWhatsAppUrl(phone) {
    const cleaned = phone.replace(/[^+\d]/g, "");
    return `https://wa.me/${cleaned.replace("+", "")}`;
  }

  function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // preview + totals
  function updatePreview() {
    // header info
    previewBusinessName.textContent = businessName.value || "Your Business / Name";
    previewBusinessEmail.textContent = businessEmail.value || "you@example.com";
    previewInvoiceNumber.textContent = invoiceNumber.value || "2025";

    // bill to & employee (C1 behavior)
    previewClientName.textContent = clientName.value || "Client Name";
    previewClientEmail.textContent = clientEmail.value || "client@example.com";
    if (employeeName && employeeName.value.trim()) {
      previewEmployeeWrap.style.display = "block";
      previewEmployeeName.textContent = employeeName.value.trim();
    } else {
      previewEmployeeWrap.style.display = "none";
      previewEmployeeName.textContent = "";
    }

    // items table
    clearChildren(previewBody);
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left;">Description</th>
          <th style="text-align:right; width:60px;">Qty</th>
          <th style="text-align:right; width:120px;">Price</th>
          <th style="text-align:right; width:120px;">Total</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");
    let subtotal = 0;
    itemsContainer.querySelectorAll(".item-row").forEach(r => {
      const desc = r.querySelector(".item-desc").value || "Item";
      const qty = Number(r.querySelector(".item-qty").value || 1);
      const price = Number(r.querySelector(".item-price").value || 0);
      const total = qty * price;
      subtotal += total;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(desc)}</td>
        <td style="text-align:right;">${qty}</td>
        <td style="text-align:right;">${formatMoney(price)}</td>
        <td style="text-align:right;">${formatMoney(total)}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    previewBody.appendChild(table);

    // totals with currency symbol
    const tax = Number(taxPercent.value || 0);
    const discount = Number(discountPercent.value || 0);
    const taxAmount = subtotal * (tax / 100);
    const discountAmount = subtotal * (discount / 100);
    const finalTotal = subtotal + taxAmount - discountAmount;
    const currencyKey = currencyEl.value;
    const csym = currencySymbols[currencyKey] || currencyKey;

    const totalsDiv = document.createElement("div");
    totalsDiv.className = "preview-totals";
    totalsDiv.innerHTML = `
      <div><span>Subtotal</span><strong>${csym} ${formatMoney(subtotal)}</strong></div>
      <div><span>Tax (${tax}%)</span><span>${csym} ${formatMoney(taxAmount)}</span></div>
      <div><span>Discount (${discount}%)</span><span>-${csym} ${formatMoney(discountAmount)}</span></div>
      <div class="total-main"><span>Total</span><strong>${csym} ${formatMoney(finalTotal)}</strong></div>
    `;
    previewBody.appendChild(totalsDiv);

    // notes
    if (notes.value.trim()) {
      const p = document.createElement("p");
      p.style.marginTop = "10px";
      p.style.color = "#374151";
      p.textContent = notes.value;
      previewBody.appendChild(p);
    }

    // QR generation
    clearChildren(paymentQrBox);
    clearChildren(whatsAppQrBox);
    if (showPaymentQr.checked && paymentLink.value.trim()) {
      new QRCode(paymentQrBox, { text: paymentLink.value.trim(), width: 110, height: 110 });
    } else { paymentQrBox.textContent = "—"; }
    if (showWhatsAppQr.checked && whatsAppNumber.value.trim()) {
      const wa = buildWhatsAppUrl(whatsAppNumber.value.trim());
      new QRCode(whatsAppQrBox, { text: wa, width: 110, height: 110 });
    } else { whatsAppQrBox.textContent = "—"; }

    // logo (already set by file reader)
    // ensure logo is visible in preview; if not, hide
    if (!logoPreview.src) logoPreview.style.display = "none";
    else logoPreview.style.display = "block";
  }

  // Templates
  const templateNames = {
    "clean-white": "Clean White",
    "modern-blue": "Modern Blue",
    "elegant-purple": "Elegant Purple",
    "minimal-grey": "Minimal Grey",
    "dark-mode": "Dark Mode"
  };

  function applyTemplateClass(key) {
    // remove existing template- classes
    invoicePreview.className = invoicePreview.className.split(/\s+/).filter(c => !c.startsWith("template-")).join(" ");
    invoicePreview.classList.add("invoice-preview", "template-" + key);
    // set header dot color
    const dot = templateHeader.querySelector(".dot");
    if (dot) {
      const map = { "clean-white": "#6b7280", "modern-blue": "#2563eb", "elegant-purple": "#7c3aed", "minimal-grey": "#374151", "dark-mode": "#111827" };
      dot.style.background = map[key] || "#6b7280";
    }
    if (templateHeaderText) templateHeaderText.textContent = `${templateNames[key]} Template`;
  }

  function handleTemplateChange() {
    const selected = templateSelect.value;
    const isProTemplate = templateSelect.selectedOptions[0].dataset.pro === "true";
    applyTemplateClass(selected);
    // PRO preview lock behavior
    const existingCta = document.getElementById("templateUpgradeCta");
    if (isProTemplate && !isProUser) {
      if (!existingCta) {
        const cta = document.createElement("button");
        cta.id = "templateUpgradeCta";
        cta.className = "btn small primary";
        cta.textContent = "Upgrade to apply";
        cta.style.marginLeft = "10px";
        cta.addEventListener("click", () => window.open(LEMONSQUEEZY_URL, "_blank"));
        templateHeader.appendChild(cta);
      }
      templateHeaderText.textContent = `${templateNames[selected]} (PRO — Preview)`;
    } else {
      if (existingCta) existingCta.remove();
      templateHeaderText.textContent = `${templateNames[selected]} Template`;
      if (isProUser) localStorage.setItem("raybill_template", selected);
    }
  }

  // wire events
  function wireEvents() {
    addItemBtn.addEventListener("click", (e) => { e.preventDefault(); addItem(); });

    [businessName, businessEmail, clientName, clientEmail, employeeName, invoiceNumber,
      invoiceDate, dueDate, currencyEl, taxPercent, discountPercent, notes,
      paymentLink, whatsAppNumber].forEach(el => { if (el) el.addEventListener("input", updateUI); });

    showPaymentQr.addEventListener("change", updateUI);
    showWhatsAppQr.addEventListener("change", updateUI);

    resetBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (!confirm("Reset the form? This will clear current values.")) return;
      businessName.value = ""; businessEmail.value = ""; clientName.value = ""; clientEmail.value = "";
      employeeName.value = "";
      invoiceNumber.value = ""; invoiceDate.value = ""; dueDate.value = "";
      taxPercent.value = "0"; discountPercent.value = "0";
      notes.value = ""; paymentLink.value = ""; whatsAppNumber.value = "";
      logoPreview.src = ""; if (logoHint) logoHint.textContent = "No logo selected";
      clearChildren(itemsContainer); itemsContainer.appendChild(createItemRow("", 1, 0));
      updateUI(); enforceLimits();
    });

    printBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      window.print(); // CSS ensures only preview prints
    });

    savePngBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        const canvas = await html2canvas(invoicePreview, { scale: 2 });
        const link = document.createElement("a");
        link.download = `invoice-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) { toast("Could not save PNG"); console.error(err); }
    });

    [upgradeBtn, upgradeBtnBottomMonthly, upgradeBtnBottomYearly].forEach(b => {
      if (!b) return;
      b.addEventListener("click", (ev) => { ev.preventDefault(); window.open(LEMONSQUEEZY_URL, "_blank"); });
    });

    if (debugProBtn) {
      debugProBtn.addEventListener("click", (ev) => { ev.preventDefault(); setProUser(true); toast("PRO unlocked (dev)"); });
    }

    if (templateSelect) {
      templateSelect.addEventListener("change", handleTemplateChange);
      const saved = localStorage.getItem("raybill_template");
      if (saved && templateSelect.querySelector(`option[value="${saved}"]`) && isProUser) {
        templateSelect.value = saved;
        applyTemplateClass(saved);
      } else {
        applyTemplateClass(templateSelect.value || "clean-white");
      }
    }
  }

  function setProUser(flag) {
    isProUser = !!flag;
    localStorage.setItem("raybill_is_pro", isProUser ? "true" : "false");
    updateUpgradeButtons();
    enforceLimits();
  }

  function updateUpgradeButtons() {
    if (isProUser) {
      if (upgradeBtn) { upgradeBtn.textContent = "PRO active"; upgradeBtn.classList.add("disabled"); }
      if (upgradeBtnBottomMonthly) { upgradeBtnBottomMonthly.textContent = "PRO active"; upgradeBtnBottomMonthly.classList.add("disabled"); }
      if (upgradeBtnBottomYearly) { upgradeBtnBottomYearly.textContent = "PRO active"; upgradeBtnBottomYearly.classList.add("disabled"); }
    } else {
      if (upgradeBtn) { upgradeBtn.textContent = "Upgrade to PRO"; upgradeBtn.classList.remove("disabled"); }
      if (upgradeBtnBottomMonthly) { upgradeBtnBottomMonthly.textContent = "Upgrade Monthly"; upgradeBtnBottomMonthly.classList.remove("disabled"); }
      if (upgradeBtnBottomYearly) { upgradeBtnBottomYearly.textContent = "Upgrade Yearly"; upgradeBtnBottomYearly.classList.remove("disabled"); }
    }
  }

  function updateUI() {
    enforceLimits();
    updatePreview();
  }

  // init
  function start() {
    if (countItems() === 0) itemsContainer.appendChild(createItemRow("", 1, 0));
    wireEvents();
    updateUpgradeButtons();
    enforceLimits();
    updateUI();
  }

  start();
})();

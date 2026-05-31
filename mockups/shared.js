// Fix-ATL — shared mockup interactivity

// Filter chips: clicking toggles an `.active` class within the chip group.
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip[data-group]');
  if (!chip) return;
  const group = chip.getAttribute('data-group');
  if (!group) return;
  document.querySelectorAll(`.chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
});

// Avatar dropdown toggle
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-dropdown-trigger]');
  if (trigger) {
    const id = trigger.getAttribute('data-dropdown-trigger');
    const menu = document.getElementById(id);
    if (menu) {
      document.querySelectorAll('[data-dropdown-menu]').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
      menu.classList.toggle('hidden');
    }
    return;
  }
  // Click outside closes
  if (!e.target.closest('[data-dropdown-menu]')) {
    document.querySelectorAll('[data-dropdown-menu]').forEach(m => m.classList.add('hidden'));
  }
});

// Before/After toggle on detail page
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-ba-tab]');
  if (!tab) return;
  const which = tab.getAttribute('data-ba-tab');
  document.querySelectorAll('[data-ba-tab]').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('[data-ba-panel]').forEach(p => {
    p.classList.toggle('hidden', p.getAttribute('data-ba-panel') !== which);
  });
});

// Map pin click → show details panel
document.addEventListener('click', (e) => {
  const pin = e.target.closest('[data-pin]');
  if (!pin) return;
  const panel = document.getElementById('map-detail-panel');
  if (panel) panel.classList.remove('hidden');
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-panel]')) {
    const panel = document.getElementById('map-detail-panel');
    if (panel) panel.classList.add('hidden');
  }
});

// File input → preview
document.addEventListener('change', (e) => {
  const input = e.target.closest('input[type="file"][data-preview]');
  if (!input) return;
  const previewId = input.getAttribute('data-preview');
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const file = input.files && input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  preview.style.backgroundImage = `url(${url})`;
  preview.classList.remove('empty');
});

async function loadProductsForAdmin() {
  const sel = document.getElementById('adminProductSelect');
  const preview = document.getElementById('adminPreview');
  sel.innerHTML = '<option>Loading...</option>';
  preview.innerHTML = '';
  try {
    const products = await api.getProducts();
    sel.innerHTML = products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
    if (products.length > 0) {
      renderPreview(products[0]);
    }

    sel.addEventListener('change', () => {
      const id = sel.value;
      const prod = products.find(p => p._id === id);
      renderPreview(prod);
    });
  } catch (err) {
    sel.innerHTML = '<option value="">Failed to load</option>';
    document.getElementById('adminMessage').textContent = 'Failed to load products';
  }
}

function renderPreview(product) {
  const preview = document.getElementById('adminPreview');
  if (!product) { preview.innerHTML = ''; return; }
  const imgs = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  preview.innerHTML = imgs.map(u => `<div style="border:1px solid #eee; padding:6px; border-radius:8px"><img src="${(u.startsWith('http')||u.startsWith('data:'))?u:window.location.origin+u}" style="width:100%; height:140px; object-fit:cover; border-radius:6px"><div style="font-size:0.9rem; margin-top:6px">${product.name}</div></div>`).join('') || '<p>No images</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  loadProductsForAdmin();

  document.getElementById('adminUpload').addEventListener('click', async () => {
    const sel = document.getElementById('adminProductSelect');
    const files = document.getElementById('adminFiles').files;
    const msg = document.getElementById('adminMessage');
    if (!sel.value) { alert('Select a product'); return; }
    if (!files || files.length === 0) { alert('Choose files'); return; }
    msg.textContent = 'Uploading...';
    try {
      const form = new FormData();
      for (const f of files) form.append('images', f);
      const res = await api.request(`/admin/products/${sel.value}/images`, { method: 'POST', body: form });
      if (res && res.product) {
        msg.textContent = 'Uploaded';
        renderPreview(res.product);
        // refresh product select entries
        await loadProductsForAdmin();
      } else {
        msg.textContent = 'Upload failed';
      }
    } catch (err) {
      msg.textContent = 'Upload error: ' + err.message;
    }
  });

  document.getElementById('adminSeed').addEventListener('click', async () => {
    const confirmSeed = confirm('This will assign sample placeholder images to all products. Continue?');
    if (!confirmSeed) return;
    try {
      // call backend script via npm is not possible from browser; instead call a minimal endpoint or instruct to run seed script
      alert('Run the seeding script on the server: from backend folder run `npm run seed:images`');
    } catch (err) {
      console.warn(err);
    }
  });
});

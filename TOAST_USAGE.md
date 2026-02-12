# Toast Notification System - Usage Guide

## Setup

1. Include toast.js in your HTML files (before closing `</body>`):
```html
<script src="/js/toast.js"></script>
```

2. Toast is now available globally via `window.toast`

## Usage Examples

### Success Notification
```javascript
toast.success('Data berhasil disimpan!');
toast.success('Siswa berhasil ditambahkan!', 5000); // 5 seconds
```

### Error Notification
```javascript
toast.error('Gagal menyimpan data');
toast.error('Email sudah terdaftar!');
```

### Warning Notification
```javascript
toast.warning('Perhatian: Sisa pertemuan tinggal 2');
toast.warning('Data belum lengkap');
```

### Info Notification
```javascript
toast.info('Sedang memproses data...');
toast.info('Upload akan dimulai');
```

## Integration with Forms

### Example: Create Siswa Form

**Before:**
```javascript
const response = await window.api.request('/api/siswa', {
  method: 'POST',
  body: formData
});

if (response.success) {
  console.log('Success'); // Old way
}
```

**After:**
```javascript
const response = await window.api.request('/api/siswa', {
  method: 'POST',
  body: formData
});

if (response.success) {
  toast.success('Siswa berhasil ditambahkan!');
  setTimeout(() => {
    window.location.reload();
  }, 1500);
} else {
  toast.error(response.message || 'Gagal menambah siswa');
}
```

### Example: Update/Edit Form

```javascript
const response = await window.api.request(`/api/siswa/${siswaId}`, {
  method: 'PUT',
  body: formData
});

if (response.success) {
  toast.success('Data siswa berhasil diperbarui!');
  closeModal();
  loadData();
} else {
  toast.error(response.message || 'Gagal memperbarui data');
}
```

### Example: Delete Action

```javascript
if (confirm('Yakin ingin menghapus siswa ini?')) {
  const response = await window.api.request(`/api/siswa/${siswaId}`, {
    method: 'DELETE'
  });

  if (response.success) {
    toast.success('Siswa berhasil dihapus');
    loadData();
  } else {
    toast.error('Gagal menghapus siswa');
  }
}
```

## Integration Checklist

Replace console.log/alert with toast in these files:
- [x] `/public/js/toast.js` - Created
- [ ] `/public/js/siswa.js` - Add toast to create/update/delete
- [ ] `/public/js/edukator.js` - Add toast to create/update/delete
- [ ] `/public/js/jadwal.js` - Add toast to create/update/delete
- [ ] `/public/js/presensi-edukator.js` - Add toast to presensi submit
- [ ] `/public/js/pembayaran.js` - Add toast to payment actions
- [ ] `/public/js/pengeluaran.js` - Add toast to expense actions
- [ ] `/public/js/kas.js` - Add toast to kas transactions
- [ ] `/public/js/login.js` - Add toast to login errors
- [ ] All other form handling files

## Best Practices

1. **Clear, actionable messages**: "Siswa berhasil ditambahkan" ✅ vs "Success" ❌
2. **Use appropriate type**: Success for saves, error for failures, warning for validation
3. **Don't overuse**: Only show toast for important user actions
4. **Auto-dismiss**: Default 4s is good, use longer (5-6s) for complex messages
5. **Pair with actions**: After success toast, redirect or reload after 1-2s delay

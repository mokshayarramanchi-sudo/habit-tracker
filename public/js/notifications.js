window.customAlert = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    let bgColor = '#3498db';
    
    if (type === 'success' || message.toLowerCase().includes('success')) {
        icon = '<i class="fa-solid fa-circle-check"></i>';
        bgColor = '#2ecc71';
    } else if (type === 'error' || message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')) {
        icon = '<i class="fa-solid fa-circle-xmark"></i>';
        bgColor = '#e74c3c';
    }
    
    toast.innerHTML = `
        <div class="toast-content" style="display: flex; align-items: center; gap: 12px;">
            ${icon}
            <span>${message}</span>
        </div>
    `;
    
    // Styling
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = bgColor;
    toast.style.color = '#fff';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.fontWeight = '500';
    toast.style.fontFamily = "'Inter', sans-serif";
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

window.customConfirm = function(message, callback) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(3px)';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';

    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'var(--glass-bg, #fff)';
    dialog.style.padding = '25px';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    dialog.style.maxWidth = '400px';
    dialog.style.width = '90%';
    dialog.style.textAlign = 'center';
    dialog.style.transform = 'scale(0.9)';
    dialog.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    dialog.style.fontFamily = "'Inter', sans-serif";
    dialog.style.border = '1px solid var(--glass-border, rgba(0,0,0,0.1))';

    const isDark = document.body.hasAttribute('data-theme') && document.body.getAttribute('data-theme') === 'dark';
    if(isDark) {
        dialog.style.backgroundColor = '#2d3436';
        dialog.style.color = '#f5f6fa';
        dialog.style.border = '1px solid rgba(255,255,255,0.1)';
    }

    dialog.innerHTML = `
        <i class="fa-solid fa-circle-question" style="font-size: 3rem; color: #3498db; margin-bottom: 15px;"></i>
        <h3 style="margin: 0 0 10px 0; font-size: 1.2rem;">Are you sure?</h3>
        <p style="margin: 0 0 25px 0; opacity: 0.8; font-size: 0.95rem; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="custom-confirm-cancel" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #333; border-radius: 6px; cursor: pointer; font-weight: 500; font-family: 'Inter', sans-serif; transition: background 0.2s;">Cancel</button>
            <button id="custom-confirm-ok" style="padding: 10px 20px; border: none; background: #e74c3c; color: white; border-radius: 6px; cursor: pointer; font-weight: 500; font-family: 'Inter', sans-serif; transition: background 0.2s;">Confirm</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    setTimeout(() => {
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);

    const closeDialog = (result) => {
        overlay.style.opacity = '0';
        dialog.style.transform = 'scale(0.9)';
        setTimeout(() => {
            overlay.remove();
            callback(result);
        }, 200);
    };

    document.getElementById('custom-confirm-cancel').addEventListener('click', () => closeDialog(false));
    document.getElementById('custom-confirm-ok').addEventListener('click', () => closeDialog(true));
};

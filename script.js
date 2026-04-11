
js_content = '''// Açaí Rei Delivery - Sistema Completo
// LocalStorage Keys
const STORAGE_KEYS = {
    MENU: 'acai_rei_menu',
    CART: 'acai_rei_cart',
    ORDERS: 'acai_rei_orders',
    ADMIN_LOGGED: 'acai_rei_admin_logged',
    ORDER_COUNTER: 'acai_rei_order_counter'
};

// Estado global
let cart = [];
let menuItems = [];
let orders = [];
let isAdminLogged = false;
let logoClickCount = 0;
let lastOrderCheck = 0;

// Dados iniciais do cardápio
const defaultMenu = [
    {
        id: 1,
        name: 'Açaí Tradicional',
        price: 18.90,
        description: 'Açaí na tigela 500ml com granola, banana e leite condensado',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400'
    },
    {
        id: 2,
        name: 'Açaí Premium',
        price: 24.90,
        description: 'Açaí 700ml com mix de frutas, granola, leite em pó e mel',
        image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400'
    },
    {
        id: 3,
        name: 'Açaí Power',
        price: 28.90,
        description: 'Açaí 700ml com whey protein, banana, aveia e pasta de amendoim',
        image: 'https://images.unsplash.com/photo-1623593688280-a509c3f69a3d?w=400'
    },
    {
        id: 4,
        name: 'Açaí Tropical',
        price: 22.90,
        description: 'Açaí 500ml com manga, abacaxi, coco ralado e leite condensado',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400'
    },
    {
        id: 5,
        name: 'Açaí Supreme',
        price: 32.90,
        description: 'Açaí 1L com todos os acompanhamentos disponíveis',
        image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400'
    },
    {
        id: 6,
        name: 'Açaí Fit',
        price: 19.90,
        description: 'Açaí 500ml sem açúcar com frutas vermelhas e chia',
        image: 'https://images.unsplash.com/photo-1623593688280-a509c3f69a3d?w=400'
    }
];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    loadCart();
    loadOrders();
    renderMenu();
    setupEventListeners();
    updateCartBadge();
    checkAdminSession();
    
    // Iniciar polling de pedidos para notificações
    setInterval(checkNewOrders, 5000);
});

// Inicializar dados no LocalStorage
function initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.MENU)) {
        localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(defaultMenu));
    }
    menuItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU));
    
    if (!localStorage.getItem(STORAGE_KEYS.ORDER_COUNTER)) {
        localStorage.setItem(STORAGE_KEYS.ORDER_COUNTER, '1000');
    }
}

// Carregar carrinho
function loadCart() {
    const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Salvar carrinho
function saveCart() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    updateCartBadge();
}

// Carregar pedidos
function loadOrders() {
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    }
}

// Salvar pedidos
function saveOrders() {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

// Verificar sessão admin
function checkAdminSession() {
    const session = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED);
    if (session === 'true') {
        isAdminLogged = true;
    }
}

// Event Listeners
function setupEventListeners() {
    // Formulário de checkout
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }
    
    // Formulário de item
    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.addEventListener('submit', handleItemSubmit);
    }
    
    // Tecla ESC para fechar modais
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Navegação entre seções
function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção solicitada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Atualizar conteúdo específico
        if (sectionName === 'cart') {
            renderCart();
        } else if (sectionName === 'orders') {
            renderOrders();
        } else if (sectionName === 'menu') {
            renderMenu();
        }
    }
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Renderizar cardápio
function renderMenu() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = menuItems.map(item => `
        <div class="menu-card">
            <img src="${item.image || 'https://via.placeholder.com/400x200/6B21A8/FFFFFF?text=Açaí+Rei'}" 
                 alt="${item.name}" 
                 class="menu-image"
                 onerror="this.src='https://via.placeholder.com/400x200/6B21A8/FFFFFF?text=Açaí+Rei'">
            <div class="menu-content">
                <div class="menu-header">
                    <h3 class="menu-title">${item.name}</h3>
                    <span class="menu-price">R$ ${item.price.toFixed(2)}</span>
                </div>
                <p class="menu-description">${item.description}</p>
                <button class="btn-add-cart" onclick="addToCart(${item.id})">
                    <i class="fas fa-plus"></i>
                    Adicionar ao Carrinho
                </button>
            </div>
        </div>
    `).join('');
}

// Adicionar ao carrinho
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(i => i.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1
        });
    }
    
    saveCart();
    showToast(`${item.name} adicionado ao carrinho!`, 'success');
    
    // Animação no botão do carrinho
    const cartBtn = document.querySelector('.cart-btn');
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        cartBtn.style.transform = 'scale(1)';
    }, 200);
}

// Remover do carrinho
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    renderCart();
    showToast('Item removido do carrinho', 'warning');
}

// Atualizar quantidade
function updateQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    saveCart();
    renderCart();
}

// Renderizar carrinho
function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    
    if (!cartItems || !cartSummary) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-basket"></i>
                <p>Seu carrinho está vazio</p>
                <button class="btn-primary" onclick="showSection('menu')">Ver Cardápio</button>
            </div>
        `;
        cartSummary.classList.add('hidden');
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/80/6B21A8/FFFFFF?text=Açaí'}" 
                 alt="${item.name}" 
                 class="cart-item-image"
                 onerror="this.src='https://via.placeholder.com/80/6B21A8/FFFFFF?text=Açaí'">
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="btn-remove" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;
    
    document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('total').textContent = `R$ ${total.toFixed(2)}`;
    
    cartSummary.classList.remove('hidden');
}

// Mostrar checkout
function showCheckout() {
    if (cart.length === 0) {
        showToast('Seu carrinho está vazio!', 'error');
        return;
    }
    
    showSection('checkout');
    renderCheckoutSummary();
}

// Renderizar resumo no checkout
function renderCheckoutSummary() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (!checkoutItems || !checkoutTotal) return;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    checkoutItems.innerHTML += `
        <div class="order-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.2);">
            <span>Taxa de entrega</span>
            <span>R$ ${deliveryFee.toFixed(2)}</span>
        </div>
    `;
    
    checkoutTotal.textContent = `R$ ${total.toFixed(2)}`;
}

// Finalizar pedido
function handleCheckout(e) {
    e.preventDefault();
    
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const address = document.getElementById('customer-address').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    
    if (!name || !phone || !address) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    const orderId = parseInt(localStorage.getItem(STORAGE_KEYS.ORDER_COUNTER)) + 1;
    localStorage.setItem(STORAGE_KEYS.ORDER_COUNTER, orderId.toString());
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 5.00;
    
    const newOrder = {
        id: orderId,
        customer: {
            name,
            phone,
            address
        },
        items: [...cart],
        payment,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        status: 'recebido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    orders.unshift(newOrder);
    saveOrders();
    
    // Limpar carrinho
    cart = [];
    saveCart();
    
    // Mostrar tracking
    showOrderTracking(orderId);
    
    showToast(`Pedido #${orderId} realizado com sucesso!`, 'success');
    
    // Disparar evento de novo pedido para admin
    localStorage.setItem('acai_rei_new_order', Date.now().toString());
}

// Mostrar tracking do pedido
function showOrderTracking(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('tracking-order-id').textContent = order.id;
    
    updateTrackingStatus(order.status);
    
    const trackingItems = document.getElementById('tracking-items');
    trackingItems.innerHTML = order.items.map(item => `
        <div class="order-item">
            <span>${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    showSection('tracking');
    
    // Atualizar status periodicamente
    startTrackingUpdate(orderId);
}

// Atualizar visual do status
function updateTrackingStatus(status) {
    const statusBadge = document.getElementById('tracking-status');
    statusBadge.className = `status-badge status-${status}`;
    statusBadge.textContent = getStatusLabel(status);
    
    // Atualizar steps
    const steps = ['recebido', 'preparo', 'entrega', 'entregue'];
    const currentIndex = steps.indexOf(status);
    
    steps.forEach((step, index) => {
        const stepEl = document.querySelector(`.step[data-step="${step}"]`);
        if (stepEl) {
            stepEl.classList.remove('active', 'completed');
            if (index < currentIndex) {
                stepEl.classList.add('completed');
            } else if (index === currentIndex) {
                stepEl.classList.add('active');
            }
        }
    });
}

// Atualização periódica do tracking
function startTrackingUpdate(orderId) {
    const interval = setInterval(() => {
        const section = document.getElementById('section-tracking');
        if (!section.classList.contains('active')) {
            clearInterval(interval);
            return;
        }
        
        loadOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            updateTrackingStatus(order.status);
            
            if (order.status === 'entregue' || order.status === 'cancelado') {
                clearInterval(interval);
            }
        }
    }, 3000);
}

// Renderizar pedidos do cliente
function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Você ainda não fez nenhum pedido</p>
                <button class="btn-primary" onclick="showSection('menu')">Fazer Pedido</button>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = orders.map(order => `
        <div class="order-card" onclick="showOrderTracking(${order.id})" style="cursor: pointer;">
            <div class="order-header">
                <div>
                    <span class="order-id">Pedido #${order.id}</span>
                    <p class="order-date">${formatDate(order.createdAt)}</p>
                </div>
                <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                <span>Total</span>
                <span>R$ ${order.total.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// ÁREA ADMINISTRATIVA

// Clique no logo (5 cliques para abrir admin)
function handleLogoClick() {
    logoClickCount++;
    
    if (logoClickCount >= 5) {
        logoClickCount = 0;
        openAdmin();
    } else if (logoClickCount > 2) {
        // Feedback visual
        const logo = document.getElementById('logo');
        logo.style.transform = `scale(${1 + logoClickCount * 0.1})`;
        setTimeout(() => {
            logo.style.transform = 'scale(1)';
        }, 200);
    }
    
    // Reset após 2 segundos
    clearTimeout(window.logoClickTimeout);
    window.logoClickTimeout = setTimeout(() => {
        logoClickCount = 0;
    }, 2000);
}

// Abrir admin
function openAdmin() {
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('hidden');
    
    if (isAdminLogged) {
        showAdminPanel();
    } else {
        showAdminLogin();
    }
}

// Fechar admin
function closeAdmin() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('hidden');
}

// Mostrar login
function showAdminLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
}

// Mostrar painel
function showAdminPanel() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    showAdminTab('orders');
}

// Login
function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    
    if (password === 'admin123') {
        isAdminLogged = true;
        localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED, 'true');
        showToast('Login realizado com sucesso!', 'success');
        showAdminPanel();
    } else {
        showToast('Senha incorreta!', 'error');
    }
}

// Tabs do admin
function showAdminTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Atualizar conteúdo
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin-tab-${tabName}`).classList.add('active');
    
    // Renderizar conteúdo
    if (tabName === 'orders') {
        renderAdminOrders();
    } else if (tabName === 'menu') {
        renderAdminMenu();
    }
}

// Renderizar pedidos no admin
let currentFilter = 'all';

function renderAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;
    
    loadOrders();
    
    let filteredOrders = orders;
    if (currentFilter !== 'all') {
        filteredOrders = orders.filter(o => o.status === currentFilter);
    }
    
    // Atualizar badge de novos pedidos
    const newOrders = orders.filter(o => o.status === 'recebido').length;
    const badge = document.getElementById('new-orders-badge');
    if (badge) {
        badge.textContent = newOrders;
        badge.style.display = newOrders > 0 ? 'block' : 'none';
    }
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <p>Nenhum pedido ${currentFilter !== 'all' ? 'com este status' : ''}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredOrders.map(order => `
        <div class="admin-order-card">
            <div class="admin-order-header">
                <div class="admin-order-info">
                    <h4>Pedido #${order.id}</h4>
                    <p>
                        <i class="fas fa-user"></i> ${order.customer.name} | 
                        <i class="fas fa-phone"></i> ${order.customer.phone} | 
                        <i class="fas fa-clock"></i> ${formatDate(order.createdAt)}
                    </p>
                    <p><i class="fas fa-map-marker-alt"></i> ${order.customer.address}</p>
                    <p><i class="fas fa-money-bill"></i> ${getPaymentLabel(order.payment)} | 
                       <strong>R$ ${order.total.toFixed(2)}</strong></p>
                </div>
                <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span>
            </div>
            <div class="order-items" style="margin: 1rem 0; padding: 0.5rem 0;">
                ${order.items.map(item => `
                    <div class="order-item" style="font-size: 0.875rem;">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="admin-order-actions">
                ${order.status === 'recebido' ? `
                    <button class="action-btn preparo" onclick="updateOrderStatus(${order.id}, 'preparo')">
                        <i class="fas fa-check"></i> Aceitar
                    </button>
                    <button class="action-btn cancelar" onclick="updateOrderStatus(${order.id}, 'cancelado')">
                        <i class="fas fa-times"></i> Recusar
                    </button>
                ` : ''}
                ${order.status === 'preparo' ? `
                    <button class="action-btn entrega" onclick="updateOrderStatus(${order.id}, 'entrega')">
                        <i class="fas fa-motorcycle"></i> Saiu para Entrega
                    </button>
                ` : ''}
                ${order.status === 'entrega' ? `
                    <button class="action-btn entregue" onclick="updateOrderStatus(${order.id}, 'entregue')">
                        <i class="fas fa-check-circle"></i> Marcar Entregue
                    </button>
                ` : ''}
                ${order.status !== 'cancelado' && order.status !== 'entregue' ? `
                    <button class="action-btn cancelar" onclick="updateOrderStatus(${order.id}, 'cancelado')">
                        <i class="fas fa-ban"></i> Cancelar
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Filtrar pedidos
function filterOrders(status) {
    currentFilter = status;
    
    // Atualizar botões
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderAdminOrders();
}

// Atualizar status do pedido
function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    
    saveOrders();
    renderAdminOrders();
    
    showToast(`Pedido #${orderId} atualizado para: ${getStatusLabel(newStatus)}`, 'success');
    
    // Notificar cliente (simulado via localStorage)
    localStorage.setItem(`acai_rei_order_${orderId}_updated`, Date.now().toString());
}

// Renderizar menu no admin
function renderAdminMenu() {
    const container = document.getElementById('admin-menu-list');
    if (!container) return;
    
    container.innerHTML = menuItems.map(item => `
        <div class="admin-menu-item">
            <img src="${item.image || 'https://via.placeholder.com/300x150/6B21A8/FFFFFF?text=Açaí+Rei'}" 
                 alt="${item.name}"
                 onerror="this.src='https://via.placeholder.com/300x150/6B21A8/FFFFFF?text=Açaí+Rei'">
            <h4>${item.name}</h4>
            <p>${item.description || 'Sem descrição'}</p>
            <span class="price">R$ ${item.price.toFixed(2)}</span>
            <div class="admin-item-actions">
                <button class="btn-edit" onclick="editItem(${item.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteItem(${item.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Mostrar formulário de adicionar item
function showAddItemForm() {
    document.getElementById('item-modal-title').textContent = 'Adicionar Item';
    document.getElementById('item-id').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('item-description').value = '';
    document.getElementById('item-image').value = '';
    
    document.getElementById('item-modal').classList.remove('hidden');
}

// Editar item
function editItem(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('item-modal-title').textContent = 'Editar Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-description').value = item.description || '';
    document.getElementById('item-image').value = item.image || '';
    
    document.getElementById('item-modal').classList.remove('hidden');
}

// Excluir item
function deleteItem(itemId) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    menuItems = menuItems.filter(i => i.id !== itemId);
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    
    renderAdminMenu();
    renderMenu();
    
    showToast('Item excluído com sucesso!', 'success');
}

// Fechar modal de item
function closeItemModal() {
    document.getElementById('item-modal').classList.add('hidden');
}

// Submeter formulário de item
function handleItemSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const description = document.getElementById('item-description').value;
    const image = document.getElementById('item-image').value;
    
    if (!name || isNaN(price)) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    if (id) {
        // Editar
        const item = menuItems.find(i => i.id === parseInt(id));
        if (item) {
            item.name = name;
            item.price = price;
            item.description = description;
            item.image = image;
        }
        showToast('Item atualizado com sucesso!', 'success');
    } else {
        // Adicionar
        const newId = Math.max(...menuItems.map(i => i.id), 0) + 1;
        menuItems.push({
            id: newId,
            name,
            price,
            description,
            image
        });
        showToast('Item adicionado com sucesso!', 'success');
    }
    
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    
    closeItemModal();
    renderAdminMenu();
    renderMenu();
}

// Verificar novos pedidos (para notificações)
function checkNewOrders() {
    if (!isAdminLogged) return;
    
    const orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const newOrders = orders.filter(o => o.status === 'recebido');
    
    if (newOrders.length > lastOrderCheck) {
        // Tocar som de notificação
        const sound = document.getElementById('notification-sound');
        if (sound) {
            sound.volume = 0.3;
            sound.play().catch(() => {});
        }
        
        showToast(`🎉 ${newOrders.length} novo(s) pedido(s) recebido(s)!`, 'success');
        
        // Atualizar badge
        const badge = document.getElementById('new-orders-badge');
        if (badge) {
            badge.textContent = newOrders.length;
            badge.style.display = 'block';
        }
        
        // Atualizar lista se estiver visível
        const ordersTab = document.getElementById('admin-tab-orders');
        if (ordersTab && ordersTab.classList.contains('active')) {
            renderAdminOrders();
        }
    }
    
    lastOrderCheck = newOrders.length;
}

// Fechar todos os modais
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Atualizar badge do carrinho
function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utilitários
function getStatusLabel(status) {
    const labels = {
        'recebido': 'Recebido',
        'preparo': 'Em Preparo',
        'entrega': 'Saiu para Entrega',
        'entregue': 'Entregue',
        'cancelado': 'Cancelado'
    };
    return labels[status] || status;
}

function getPaymentLabel(payment) {
    const labels = {
        'dinheiro': 'Dinheiro',
        'pix': 'Pix',
        'cartao': 'Cartão'
    };
    return labels[payment] || payment;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Logout admin (função extra)
function logoutAdmin() {
    isAdminLogged = false;
    localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED);
    closeAdmin();
    showToast('Logout realizado!', 'info');
}

// Exportar funções para o escopo global
window.showSection = showSection;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.showCheckout = showCheckout;
window.handleLogoClick = handleLogoClick;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.loginAdmin = loginAdmin;
window.showAdminTab = showAdminTab;
window.filterOrders = filterOrders;
window.updateOrderStatus = updateOrderStatus;
window.showAddItemForm = showAddItemForm;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.closeItemModal = closeItemModal;
window.showOrderTracking = showOrderTracking;
'''

with open('/mnt/kimi/output/script.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("✅ script.js criado com sucesso!")
print(f"📄 Tamanho: {len(js_content)} caracteres")
print("\n" + "="*60)
print("🎉 SISTEMA AÇAÍ REI DELIVERY CRIADO COM SUCESSO!")
print("="*60)
print("\n📁 Arquivos criados:")
print("   • index.html - Estrutura da aplicação")
print("   • style.css - Estilos e design responsivo")
print("   • script.js - Lógica e funcionalidades")
print("\n🚀 Como usar:")
print("   1. Abra o index.html no navegador")
print("   2. Área do Cliente: navegue pelo cardápio")
print("   3. Área Admin: clique 5 vezes no logo 'Açaí Rei'")
print("   4. Senha do admin: admin123")
print("\n✨ Funcionalidades implementadas:")
print("   ✅ Cardápio dinâmico com produtos")
print("   ✅ Carrinho de compras funcional")
print("   ✅ Checkout com formulário completo")
print("   ✅ Acompanhamento de pedidos em tempo real")
print("   ✅ Área administrativa protegida")
print("   ✅ Gerenciamento de pedidos (aceitar, preparar, entregar)")
print("   ✅ CRUD completo do cardápio")
print("   ✅ Notificações de novos pedidos")
print("   ✅ Design responsivo (mobile e desktop)")
print("   ✅ Animações e efeitos visuais")
print("   ✅ Persistência via LocalStorage")

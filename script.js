/**
 * AÇAÍ REI - SISTEMA DE DELIVERY
 * Integração com Firebase Realtime Database
 * 
 * Arquitetura: MVC simplificado com separação de responsabilidades
 */

// ============================================
// CONFIGURAÇÃO FIREBASE
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    update, 
    remove,
    query,
    orderByChild,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Configuração Firebase do usuário
const firebaseConfig = {
    apiKey: "AIzaSyD_2W4E60wE9JcoDY0FnaK4xiBCM8jRBVs",
    authDomain: "acai-rei.firebaseapp.com",
    databaseURL: "https://acai-rei-default-rtdb.firebaseio.com",
    projectId: "acai-rei",
    storageBucket: "acai-rei.firebasestorage.app",
    messagingSenderId: "1072557437178",
    appId: "1:1072557437178:web:783dd3e5ead71e34de1943",
    measurementId: "G-Q5FJQ3VC2F"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// UTILITÁRIOS DE SEGURANÇA
// ============================================

/**
 * Sanitiza input para prevenir XSS
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Valida telefone brasileiro
 */
function validarTelefone(telefone) {
    const regex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
    return regex.test(telefone);
}

/**
 * Formata telefone enquanto digita
 */
function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
        value = `${value.slice(0, 9)}-${value.slice(9)}`;
    }
    input.value = value;
}

/**
 * Gera ID único para pedidos
 */
function gerarIdPedido() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${timestamp}${random}`;
}

/**
 * Formata valor monetário
 */
function formatarPreco(valor) {
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
}

/**
 * Data atual formatada
 */
function getDataAtual() {
    return new Date().toLocaleString('pt-BR');
}

// ============================================
// CLASSE PRINCIPAL DA APLICAÇÃO
// ============================================

class AcaiReiApp {
    constructor() {
        // Estado da aplicação
        this.carrinho = [];
        this.cardapio = [];
        this.pedidos = [];
        this.pedidoAtual = null;
        this.adminLogado = false;
        this.filtroAtual = 'todos';
        
        // Referências do Firebase
        this.refCardapio = ref(db, 'cardapio');
        this.refPedidos = ref(db, 'pedidos');
        
        // Inicialização
        this.init();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    
    init() {
        this.carregarDados();
        this.setupEventListeners();
        this.verificarSessaoAdmin();
        this.setupRealtimeListeners();
    }

    /**
     * Configura listeners em tempo real do Firebase
     */
    setupRealtimeListeners() {
        // Listener do cardápio
        onValue(this.refCardapio, (snapshot) => {
            const data = snapshot.val();
            this.cardapio = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
            this.renderizarCardapio();
            this.renderizarCardapioAdmin();
        });

        // Listener de pedidos (para admin)
        onValue(this.refPedidos, (snapshot) => {
            const data = snapshot.val();
            this.pedidos = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
            
            // Ordena por data (mais recente primeiro)
            this.pedidos.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            this.renderizarPedidosAdmin();
            this.renderizarHistorico();
            this.verificarNovosPedidos();
        });
    }

    /**
     * Verifica se há novos pedidos para notificar admin
     */
    verificarNovosPedidos() {
        const pedidosRecebidos = this.pedidos.filter(p => p.status === 'recebido');
        if (pedidosRecebidos.length > 0 && this.adminLogado) {
            this.mostrarNotificacao(`Novos pedidos: ${pedidosRecebidos.length}`);
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    setupEventListeners() {
        // Navegação
        document.getElementById('btn-cardapio')?.addEventListener('click', () => this.navegarPara('cardapio'));
        document.getElementById('btn-carrinho')?.addEventListener('click', () => this.navegarPara('carrinho'));
        document.getElementById('btn-admin')?.addEventListener('click', () => this.navegarPara('admin'));
        document.getElementById('btn-finalizar')?.addEventListener('click', () => this.navegarPara('checkout'));
        
        // Formulários
        document.getElementById('form-checkout')?.addEventListener('submit', (e) => this.finalizarPedido(e));
        document.getElementById('form-login')?.addEventListener('submit', (e) => this.loginAdmin(e));
        document.getElementById('form-produto')?.addEventListener('submit', (e) => this.salvarProduto(e));
        
        // Admin tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.mudarTab(e.target.dataset.tab));
        });
        
        // Filtros de pedidos
        document.querySelectorAll('.filtro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filtrarPedidos(e.target.dataset.filtro));
        });
        
        // Modal
        document.getElementById('btn-novo-produto')?.addEventListener('click', () => this.abrirModalProduto());
        document.querySelector('.modal-close')?.addEventListener('click', () => this.fecharModal());
        document.querySelector('.modal-cancel')?.addEventListener('click', () => this.fecharModal());
        
        // Logout
        document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
        
        // Forma de pagamento (mostrar/ocultar troco)
        document.getElementById('pagamento')?.addEventListener('change', (e) => {
            const trocoGroup = document.getElementById('troco-group');
            trocoGroup.classList.toggle('hidden', e.target.value !== 'dinheiro');
        });
        
        // Máscara de telefone
        document.getElementById('telefone')?.addEventListener('input', (e) => formatarTelefone(e.target));
        
        // Fechar modal ao clicar fora
        document.getElementById('modal-produto')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-produto') this.fecharModal();
        });
    }

    // ============================================
    // NAVEGAÇÃO
    // ============================================
    
    navegarPara(secao) {
        // Esconde todas as seções
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        // Mostra seção específica
        switch(secao) {
            case 'cardapio':
                document.getElementById('secao-cardapio').classList.add('active');
                document.getElementById('btn-cardapio').classList.add('active');
                document.getElementById('area-cliente').classList.remove('hidden');
                document.getElementById('area-admin').classList.add('hidden');
                break;
                
            case 'carrinho':
                document.getElementById('secao-carrinho').classList.add('active');
                document.getElementById('btn-carrinho').classList.add('active');
                this.renderizarCarrinho();
                break;
                
            case 'checkout':
                if (this.carrinho.length === 0) {
                    alert('Seu carrinho está vazio!');
                    this.navegarPara('cardapio');
                    return;
                }
                document.getElementById('secao-checkout').classList.add('active');
                this.renderizarResumoCheckout();
                break;
                
            case 'pedido':
                document.getElementById('secao-pedido').classList.add('active');
                break;
                
            case 'admin':
                document.getElementById('area-cliente').classList.add('hidden');
                document.getElementById('area-admin').classList.remove('hidden');
                if (!this.adminLogado) {
                    document.getElementById('secao-login').classList.add('active');
                } else {
                    document.getElementById('secao-dashboard').classList.add('active');
                    this.mudarTab('pedidos');
                }
                break;
        }
        
        window.scrollTo(0, 0);
    }

    // ============================================
    // CARDÁPIO (CLIENTE)
    // ============================================
    
    renderizarCardapio() {
        const container = document.getElementById('lista-cardapio');
        if (!container) return;
        
        const disponiveis = this.cardapio.filter(item => item.disponivel !== false);
        
        if (disponiveis.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhum produto disponível no momento.</p></div>';
            return;
        }
        
        container.innerHTML = disponiveis.map(item => `
            <div class="produto-card ${item.disponivel === false ? 'produto-indisponivel' : ''}">
                <div class="produto-imagem">🍨</div>
                <div class="produto-info">
                    <h3 class="produto-nome">${sanitizeInput(item.nome)}</h3>
                    <p class="produto-descricao">${sanitizeInput(item.descricao || '')}</p>
                    <div class="produto-footer">
                        <span class="produto-preco">${formatarPreco(item.preco)}</span>
                        <button class="btn-add" onclick="app.adicionarAoCarrinho('${item.id}')" 
                                ${item.disponivel === false ? 'disabled' : ''}>
                            ${item.disponivel === false ? 'Indisponível' : 'Adicionar +'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // CARRINHO
    // ============================================
    
    adicionarAoCarrinho(produtoId) {
        const produto = this.cardapio.find(p => p.id === produtoId);
        if (!produto || produto.disponivel === false) return;
        
        const existente = this.carrinho.find(item => item.id === produtoId);
        if (existente) {
            existente.quantidade++;
        } else {
            this.carrinho.push({
                id: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: 1
            });
        }
        
        this.atualizarBadgeCarrinho();
        this.mostrarFeedback('Item adicionado ao carrinho!');
    }

    removerDoCarrinho(produtoId) {
        this.carrinho = this.carrinho.filter(item => item.id !== produtoId);
        this.renderizarCarrinho();
        this.atualizarBadgeCarrinho();
    }

    alterarQuantidade(produtoId, delta) {
        const item = this.carrinho.find(i => i.id === produtoId);
        if (!item) return;
        
        item.quantidade += delta;
        if (item.quantidade <= 0) {
            this.removerDoCarrinho(produtoId);
        } else {
            this.renderizarCarrinho();
            this.atualizarBadgeCarrinho();
        }
    }

    renderizarCarrinho() {
        const containerItens = document.getElementById('lista-carrinho');
        const vazio = document.getElementById('carrinho-vazio');
        const comItens = document.getElementById('carrinho-itens');
        
        if (this.carrinho.length === 0) {
            vazio.classList.remove('hidden');
            comItens.classList.add('hidden');
            return;
        }
        
        vazio.classList.add('hidden');
        comItens.classList.remove('hidden');
        
        containerItens.innerHTML = this.carrinho.map(item => `
            <div class="carrinho-item">
                <div class="item-imagem">🍨</div>
                <div class="item-info">
                    <div class="item-nome">${sanitizeInput(item.nome)}</div>
                    <div class="item-preco">${formatarPreco(item.preco)}</div>
                </div>
                <div class="item-quantidade">
                    <button class="btn-qtd" onclick="app.alterarQuantidade('${item.id}', -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button class="btn-qtd" onclick="app.alterarQuantidade('${item.id}', 1)">+</button>
                </div>
                <button class="btn-remover" onclick="app.removerDoCarrinho('${item.id}')" title="Remover">🗑️</button>
            </div>
        `).join('');
        
        const total = this.carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        document.getElementById('subtotal').textContent = formatarPreco(total);
        document.getElementById('total').textContent = formatarPreco(total);
    }

    renderizarResumoCheckout() {
        const container = document.getElementById('resumo-itens');
        const total = this.carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        
        container.innerHTML = this.carrinho.map(item => `
            <div class="resumo-item">
                <span>${item.quantidade}x ${sanitizeInput(item.nome)}</span>
                <span>${formatarPreco(item.preco * item.quantidade)}</span>
            </div>
        `).join('');
        
        document.getElementById('checkout-total').textContent = formatarPreco(total);
    }

    atualizarBadgeCarrinho() {
        const badge = document.getElementById('cart-badge');
        const total = this.carrinho.reduce((sum, item) => sum + item.quantidade, 0);
        
        if (total > 0) {
            badge.textContent = total;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ============================================
    // FINALIZAR PEDIDO
    // ============================================
    
    async finalizarPedido(e) {
        e.preventDefault();
        
        // Validação
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        const pagamento = document.getElementById('pagamento').value;
        const troco = document.getElementById('troco').value;
        
        if (!nome || !telefone || !endereco || !pagamento) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (!validarTelefone(telefone)) {
            alert('Formato de telefone inválido! Use: (11) 99999-9999');
            return;
        }
        
        // Criar objeto do pedido
        const pedidoId = gerarIdPedido();
        const total = this.carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
        
        const pedido = {
            id: pedidoId,
            cliente: {
                nome: sanitizeInput(nome),
                telefone: sanitizeInput(telefone),
                endereco: sanitizeInput(endereco)
            },
            itens: this.carrinho.map(item => ({...item})),
            pagamento: pagamento,
            troco: pagamento === 'dinheiro' ? parseFloat(troco) || 0 : null,
            total: total,
            status: 'recebido',
            data: getDataAtual(),
            timestamp: Date.now()
        };
        
        try {
            // Salvar no Firebase
            await set(ref(db, `pedidos/${pedidoId}`), pedido);
            
            // Limpar carrinho e mostrar status
            this.carrinho = [];
            this.atualizarBadgeCarrinho();
            this.pedidoAtual = pedidoId;
            
            // Salvar ID do pedido no localStorage para acompanhamento
            localStorage.setItem('pedidoAtual', pedidoId);
            
            this.mostrarStatusPedido(pedido);
            this.navegarPara('pedido');
            
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            alert('Erro ao finalizar pedido. Tente novamente.');
        }
    }

    // ============================================
    // STATUS DO PEDIDO (EM TEMPO REAL)
    // ============================================
    
    mostrarStatusPedido(pedido) {
        document.getElementById('pedido-numero').textContent = pedido.id;
        this.atualizarTimeline(pedido.status);
        
        // Configurar listener em tempo real para atualizações
        const pedidoRef = ref(db, `pedidos/${pedido.id}`);
        onValue(pedidoRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.atualizarTimeline(data.status);
                this.renderizarDetalhesPedido(data);
            }
        });
    }

    atualizarTimeline(status) {
        const badge = document.getElementById('pedido-status-badge');
        const cancelado = document.getElementById('pedido-cancelado');
        const timeline = document.querySelector('.timeline');
        
        // Atualizar badge
        badge.className = `status-badge ${status}`;
        badge.textContent = {
            'recebido': 'Recebido',
            'preparo': 'Em Preparo',
            'entrega': 'Saiu para Entrega',
            'entregue': 'Entregue',
            'cancelado': 'Cancelado'
        }[status] || status;
        
        // Mostrar/ocultar cancelado
        if (status === 'cancelado') {
            cancelado.classList.remove('hidden');
            timeline.classList.add('hidden');
            return;
        } else {
            cancelado.classList.add('hidden');
            timeline.classList.remove('hidden');
        }
        
        // Atualizar timeline
        const statuses = ['recebido', 'preparo', 'entrega', 'entregue'];
        const currentIndex = statuses.indexOf(status);
        
        document.querySelectorAll('.timeline-item').forEach((item, index) => {
            item.classList.remove('active', 'completed');
            if (index < currentIndex) {
                item.classList.add('completed');
            } else if (index === currentIndex) {
                item.classList.add('active');
            }
        });
    }

    renderizarDetalhesPedido(pedido) {
        document.getElementById('pedido-itens').innerHTML = pedido.itens.map(item => `
            <div class="resumo-item">
                <span>${item.quantidade}x ${sanitizeInput(item.nome)}</span>
                <span>${formatarPreco(item.preco * item.quantidade)}</span>
            </div>
        `).join('');
        
        document.getElementById('pedido-total').textContent = formatarPreco(pedido.total);
    }

    // ============================================
    // ADMIN - AUTENTICAÇÃO
    // ============================================
    
    async loginAdmin(e) {
        e.preventDefault();
        
        const usuario = document.getElementById('admin-usuario').value;
        const senha = document.getElementById('admin-senha').value;
        
        // Buscar credenciais do Firebase (em produção, usar Firebase Auth)
        try {
            const snapshot = await get(ref(db, 'config/admin'));
            const adminConfig = snapshot.val();
            
            // Fallback para credenciais padrão se não configurado
            const adminUser = adminConfig?.usuario || 'admin';
            const adminPass = adminConfig?.senha || 'acai123';
            
            if (usuario === adminUser && senha === adminPass) {
                this.adminLogado = true;
                sessionStorage.setItem('adminSession', 'true');
                document.getElementById('login-erro').classList.add('hidden');
                this.navegarPara('admin');
            } else {
                document.getElementById('login-erro').classList.remove('hidden');
                document.getElementById('admin-senha').value = '';
            }
        } catch (error) {
            // Fallback para credenciais padrão em caso de erro
            if (usuario === 'admin' && senha === 'acai123') {
                this.adminLogado = true;
                sessionStorage.setItem('adminSession', 'true');
                this.navegarPara('admin');
            } else {
                document.getElementById('login-erro').classList.remove('hidden');
            }
        }
    }

    logout() {
        this.adminLogado = false;
        sessionStorage.removeItem('adminSession');
        this.navegarPara('cardapio');
    }

    verificarSessaoAdmin() {
        if (sessionStorage.getItem('adminSession') === 'true') {
            this.adminLogado = true;
        }
    }

    // ============================================
    // ADMIN - PEDIDOS
    // ============================================
    
    mudarTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
    }

    filtrarPedidos(filtro) {
        this.filtroAtual = filtro;
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-filtro="${filtro}"]`).classList.add('active');
        this.renderizarPedidosAdmin();
    }

    renderizarPedidosAdmin() {
        const container = document.getElementById('admin-pedidos-lista');
        if (!container) return;
        
        let pedidosFiltrados = this.pedidos;
        if (this.filtroAtual !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.status === this.filtroAtual);
        }
        
        // Excluir entregues e cancelados da lista principal (vão para histórico)
        pedidosFiltrados = pedidosFiltrados.filter(p => !['entregue', 'cancelado'].includes(p.status));
        
        if (pedidosFiltrados.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum pedido encontrado.</p>';
            return;
        }
        
        container.innerHTML = pedidosFiltrados.map(pedido => this.criarCardPedido(pedido)).join('');
    }

    criarCardPedido(pedido) {
        const statusLabels = {
            'recebido': 'Novo',
            'preparo': 'Em Preparo',
            'entrega': 'Em Entrega'
        };
        
        const actions = {
            'recebido': `
                <button class="btn-small btn-aceitar" onclick="app.atualizarStatus('${pedido.id}', 'preparo')">Aceitar</button>
                <button class="btn-small btn-recusar" onclick="app.cancelarPedido('${pedido.id}')">Recusar</button>
            `,
            'preparo': `
                <button class="btn-small btn-status" onclick="app.atualizarStatus('${pedido.id}', 'entrega')">Saiu para Entrega</button>
            `,
            'entrega': `
                <button class="btn-small btn-aceitar" onclick="app.atualizarStatus('${pedido.id}', 'entregue')">Marcar Entregue</button>
            `
        };
        
        return `
            <div class="pedido-card ${pedido.status}">
                <div class="pedido-header">
                    <div class="pedido-info">
                        <h4>Pedido #${pedido.id}</h4>
                        <div class="pedido-meta">
                            ${pedido.data} | ${pedido.cliente.nome} | ${pedido.cliente.telefone}
                        </div>
                    </div>
                    <span class="status-badge ${pedido.status}">${statusLabels[pedido.status] || pedido.status}</span>
                </div>
                <div class="pedido-itens-preview">
                    ${pedido.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}<br>
                    <strong>Total: ${formatarPreco(pedido.total)}</strong> | ${pedido.pagamento}
                </div>
                <div class="pedido-actions">
                    ${actions[pedido.status] || ''}
                    <button class="btn-small btn-recusar" onclick="app.cancelarPedido('${pedido.id}')">Cancelar</button>
                </div>
            </div>
        `;
    }

    async atualizarStatus(pedidoId, novoStatus) {
        try {
            await update(ref(db, `pedidos/${pedidoId}`), { 
                status: novoStatus,
                updatedAt: Date.now()
            });
            this.mostrarFeedback(`Status atualizado para: ${novoStatus}`);
        } catch (error) {
            alert('Erro ao atualizar status');
        }
    }

    async cancelarPedido(pedidoId) {
        if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
        
        try {
            await update(ref(db, `pedidos/${pedidoId}`), { 
                status: 'cancelado',
                updatedAt: Date.now()
            });
            this.mostrarFeedback('Pedido cancelado');
        } catch (error) {
            alert('Erro ao cancelar pedido');
        }
    }

    // ============================================
    // ADMIN - HISTÓRICO
    // ============================================
    
    renderizarHistorico() {
        const container = document.getElementById('admin-historico-lista');
        if (!container) return;
        
        const historico = this.pedidos.filter(p => ['entregue', 'cancelado'].includes(p.status));
        
        // Estatísticas
        const totalPedidos = historico.filter(p => p.status === 'entregue').length;
        const receitaTotal = historico
            .filter(p => p.status === 'entregue')
            .reduce((sum, p) => sum + p.total, 0);
        
        document.getElementById('stat-total').textContent = totalPedidos;
        document.getElementById('stat-receita').textContent = formatarPreco(receitaTotal);
        
        if (historico.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum pedido no histórico.</p>';
            return;
        }
        
        container.innerHTML = historico.map(pedido => `
            <div class="pedido-card ${pedido.status}">
                <div class="pedido-header">
                    <div class="pedido-info">
                        <h4>Pedido #${pedido.id}</h4>
                        <div class="pedido-meta">${pedido.data} | ${pedido.cliente.nome}</div>
                    </div>
                    <span class="status-badge ${pedido.status}">
                        ${pedido.status === 'entregue' ? 'Entregue' : 'Cancelado'}
                    </span>
                </div>
                <div class="pedido-itens-preview">
                    ${pedido.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}<br>
                    <strong>Total: ${formatarPreco(pedido.total)}</strong>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // ADMIN - CARDÁPIO
    // ============================================
    
    renderizarCardapioAdmin() {
        const container = document.getElementById('admin-cardapio-lista');
        if (!container) return;
        
        if (this.cardapio.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum produto cadastrado.</p>';
            return;
        }
        
        container.innerHTML = this.cardapio.map(item => `
            <div class="admin-produto-card">
                <div class="admin-produto-info">
                    <h4>${sanitizeInput(item.nome)} ${item.disponivel === false ? '<span class="indisponivel-badge">Indisponível</span>' : ''}</h4>
                    <p>${sanitizeInput(item.descricao || '')}</p>
                    <div class="admin-produto-preco">${formatarPreco(item.preco)}</div>
                </div>
                <div class="admin-produto-actions">
                    <button class="btn-edit" onclick="app.editarProduto('${item.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="app.excluirProduto('${item.id}')" title="Excluir">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    abrirModalProduto(produtoId = null) {
        const modal = document.getElementById('modal-produto');
        const titulo = document.getElementById('modal-titulo');
        const form = document.getElementById('form-produto');
        
        form.reset();
        document.getElementById('produto-id').value = '';
        
        if (produtoId) {
            const produto = this.cardapio.find(p => p.id === produtoId);
            if (produto) {
                titulo.textContent = 'Editar Produto';
                document.getElementById('produto-id').value = produto.id;
                document.getElementById('prod-nome').value = produto.nome;
                document.getElementById('prod-descricao').value = produto.descricao || '';
                document.getElementById('prod-preco').value = produto.preco;
                document.getElementById('prod-categoria').value = produto.categoria || 'acai';
                document.getElementById('prod-disponivel').checked = produto.disponivel !== false;
            }
        } else {
            titulo.textContent = 'Novo Produto';
        }
        
        modal.classList.remove('hidden');
    }

    editarProduto(produtoId) {
        this.abrirModalProduto(produtoId);
    }

    fecharModal() {
        document.getElementById('modal-produto').classList.add('hidden');
    }

    async salvarProduto(e) {
        e.preventDefault();
        
        const id = document.getElementById('produto-id').value;
        const produto = {
            nome: sanitizeInput(document.getElementById('prod-nome').value),
            descricao: sanitizeInput(document.getElementById('prod-descricao').value),
            preco: parseFloat(document.getElementById('prod-preco').value),
            categoria: document.getElementById('prod-categoria').value,
            disponivel: document.getElementById('prod-disponivel').checked
        };
        
        try {
            if (id) {
                // Atualizar existente
                await update(ref(db, `cardapio/${id}`), produto);
            } else {
                // Criar novo
                const novoRef = push(this.refCardapio);
                await set(novoRef, produto);
            }
            
            this.fecharModal();
            this.mostrarFeedback('Produto salvo com sucesso!');
        } catch (error) {
            alert('Erro ao salvar produto');
        }
    }

    async excluirProduto(produtoId) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        
        try {
            await remove(ref(db, `cardapio/${produtoId}`));
            this.mostrarFeedback('Produto excluído');
        } catch (error) {
            alert('Erro ao excluir produto');
        }
    }

    // ============================================
    // UTILITÁRIOS DE UI
    // ============================================
    
    mostrarFeedback(mensagem) {
        // Criar toast temporário
        const toast = document.createElement('div');
        toast.className = 'notification';
        toast.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-text">${mensagem}</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    mostrarNotificacao(mensagem) {
        const notif = document.getElementById('notification');
        document.querySelector('.notification-text').textContent = mensagem;
        notif.classList.remove('hidden');
        
        // Som de notificação (opcional)
        // const audio = new Audio('notification.mp3');
        // audio.play().catch(() => {});
        
        setTimeout(() => {
            notif.classList.add('hidden');
        }, 5000);
    }

    // ============================================
    // DADOS INICIAIS
    // ============================================
    
    async carregarDados() {
        // Verificar se já existe cardápio no Firebase
        try {
            const snapshot = await get(this.refCardapio);
            if (!snapshot.exists()) {
                // Seed inicial de produtos
                const produtosIniciais = [
                    { nome: 'Açaí Tradicional 300ml', descricao: 'Açaí puro na tigela 300ml', preco: 15.90, categoria: 'acai', disponivel: true },
                    { nome: 'Açaí Tradicional 500ml', descricao: 'Açaí puro na tigela 500ml', preco: 22.90, categoria: 'acai', disponivel: true },
                    { nome: 'Açaí Completo 500ml', descricao: 'Açaí com granola, banana e leite condensado', preco: 28.90, categoria: 'acai', disponivel: true },
                    { nome: 'Açaí Premium 700ml', descricao: 'Açaí com mix de frutas e complementos especiais', preco: 35.90, categoria: 'acai', disponivel: true },
                    { nome: 'Leite Condensado', descricao: 'Adicional de leite condensado', preco: 3.00, categoria: 'complemento', disponivel: true },
                    { nome: 'Granola', descricao: 'Adicional de granola', preco: 2.50, categoria: 'complemento', disponivel: true },
                    { nome: 'Paçoca', descricao: 'Adicional de paçoca', preco: 2.00, categoria: 'complemento', disponivel: true },
                    { nome: 'Água 500ml', descricao: 'Água mineral sem gás', preco: 4.00, categoria: 'bebida', disponivel: true }
                ];
                
                for (const produto of produtosIniciais) {
                    const novoRef = push(this.refCardapio);
                    await set(novoRef, produto);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
        
        // Verificar pedido em andamento
        const pedidoAtual = localStorage.getItem('pedidoAtual');
        if (pedidoAtual) {
            // Verificar se pedido ainda existe e não está finalizado
            try {
                const snapshot = await get(ref(db, `pedidos/${pedidoAtual}`));
                if (snapshot.exists()) {
                    const pedido = snapshot.val();
                    if (!['entregue', 'cancelado'].includes(pedido.status)) {
                        this.pedidoAtual = pedidoAtual;
                        this.mostrarStatusPedido(pedido);
                    } else {
                        localStorage.removeItem('pedidoAtual');
                    }
                }
            } catch (e) {
                localStorage.removeItem('pedidoAtual');
            }
        }
    }
}

// ============================================
// INICIALIZAÇÃO GLOBAL
// ============================================

window.app = new AcaiReiApp();

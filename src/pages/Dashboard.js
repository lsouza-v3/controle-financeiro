import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../lib/sso';
import { getTransacoes, salvarTransacao, deletarTransacao, atualizarTransacao, calcularSaldos, } from '../lib/financeiro';
import '../styles/dashboard.css';
export function Dashboard() {
    const navigate = useNavigate();
    const session = getSession();
    const [transacoes, setTransacoes] = useState([]);
    const [formData, setFormData] = useState({
        tipo: 'entrada',
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        categoria: 'Outros',
    });
    const [editingId, setEditingId] = useState(null);
    useEffect(() => {
        setTransacoes(getTransacoes());
    }, []);
    const handleLogout = () => {
        clearSession();
        navigate('/login');
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.descricao || !formData.valor)
            return;
        const novaTransacao = {
            tipo: formData.tipo,
            descricao: formData.descricao,
            valor: parseFloat(formData.valor),
            data: formData.data,
            categoria: formData.categoria,
        };
        if (editingId) {
            atualizarTransacao(editingId, novaTransacao);
            setEditingId(null);
        }
        else {
            salvarTransacao(novaTransacao);
        }
        setTransacoes(getTransacoes());
        setFormData({
            tipo: 'entrada',
            descricao: '',
            valor: '',
            data: new Date().toISOString().split('T')[0],
            categoria: 'Outros',
        });
    };
    const handleDelete = (id) => {
        if (confirm('Tem certeza que deseja deletar esta transação?')) {
            deletarTransacao(id);
            setTransacoes(getTransacoes());
        }
    };
    const handleEdit = (transacao) => {
        setEditingId(transacao.id);
        setFormData({
            tipo: transacao.tipo,
            descricao: transacao.descricao,
            valor: transacao.valor.toString(),
            data: transacao.data,
            categoria: transacao.categoria,
        });
    };
    const saldos = calcularSaldos(transacoes);
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "header", children: [_jsx("h1", { children: "\uD83D\uDCB0 Controle Financeiro" }), _jsxs("div", { className: "user-info", children: [_jsxs("span", { children: ["Bem-vindo, ", session?.name, "!"] }), _jsx("button", { onClick: handleLogout, className: "btn-logout", children: "Sair" })] })] }), _jsxs("main", { className: "container", children: [_jsxs("section", { className: "cards-saldo", children: [_jsxs("div", { className: "card", children: [_jsx("h3", { children: "Entradas" }), _jsxs("p", { className: "value entrada", children: ["+ R$ ", saldos.entradas.toFixed(2)] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Sa\u00EDdas" }), _jsxs("p", { className: "value saida", children: ["- R$ ", saldos.saidas.toFixed(2)] })] }), _jsxs("div", { className: "card total", children: [_jsx("h3", { children: "Saldo" }), _jsxs("p", { className: `value ${saldos.saldo >= 0 ? 'positivo' : 'negativo'}`, children: ["R$ ", saldos.saldo.toFixed(2)] })] })] }), _jsxs("section", { className: "form-section", children: [_jsx("h2", { children: editingId ? 'Editar Transação' : 'Nova Transação' }), _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Tipo:" }), _jsxs("select", { value: formData.tipo, onChange: (e) => setFormData({ ...formData, tipo: e.target.value }), required: true, children: [_jsx("option", { value: "entrada", children: "Entrada" }), _jsx("option", { value: "saida", children: "Sa\u00EDda" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Descri\u00E7\u00E3o:" }), _jsx("input", { type: "text", value: formData.descricao, onChange: (e) => setFormData({ ...formData, descricao: e.target.value }), placeholder: "Ex: Sal\u00E1rio, Supermercado..." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Valor:" }), _jsx("input", { type: "number", step: "0.01", value: formData.valor, onChange: (e) => setFormData({ ...formData, valor: e.target.value }), placeholder: "0.00" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Data:" }), _jsx("input", { type: "date", value: formData.data, onChange: (e) => setFormData({ ...formData, data: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Categoria:" }), _jsxs("select", { value: formData.categoria, onChange: (e) => setFormData({ ...formData, categoria: e.target.value }), children: [_jsx("option", { value: "Outros", children: "Outros" }), _jsx("option", { value: "Alimenta\u00E7\u00E3o", children: "Alimenta\u00E7\u00E3o" }), _jsx("option", { value: "Transporte", children: "Transporte" }), _jsx("option", { value: "Moradia", children: "Moradia" }), _jsx("option", { value: "Sa\u00FAde", children: "Sa\u00FAde" }), _jsx("option", { value: "Educa\u00E7\u00E3o", children: "Educa\u00E7\u00E3o" }), _jsx("option", { value: "Lazer", children: "Lazer" }), _jsx("option", { value: "Sal\u00E1rio", children: "Sal\u00E1rio" })] })] }), _jsxs("div", { className: "form-buttons", children: [_jsx("button", { type: "submit", className: "btn-submit", children: editingId ? 'Atualizar' : 'Adicionar' }), editingId && (_jsx("button", { type: "button", className: "btn-cancel", onClick: () => {
                                                    setEditingId(null);
                                                    setFormData({
                                                        tipo: 'entrada',
                                                        descricao: '',
                                                        valor: '',
                                                        data: new Date().toISOString().split('T')[0],
                                                        categoria: 'Outros',
                                                    });
                                                }, children: "Cancelar" }))] })] })] }), _jsxs("section", { className: "transacoes-section", children: [_jsx("h2", { children: "Hist\u00F3rico de Transa\u00E7\u00F5es" }), transacoes.length === 0 ? (_jsx("p", { className: "empty-state", children: "Nenhuma transa\u00E7\u00E3o registrada ainda." })) : (_jsx("div", { className: "transacoes-list", children: transacoes.map((transacao) => (_jsxs("div", { className: `transacao-item ${transacao.tipo}`, children: [_jsxs("div", { className: "transacao-info", children: [_jsx("h4", { children: transacao.descricao }), _jsx("p", { className: "categoria", children: transacao.categoria }), _jsx("p", { className: "data", children: new Date(transacao.data).toLocaleDateString('pt-BR') })] }), _jsx("div", { className: "transacao-valor", children: _jsxs("p", { className: "valor", children: [transacao.tipo === 'entrada' ? '+' : '-', " R$ ", transacao.valor.toFixed(2)] }) }), _jsxs("div", { className: "transacao-actions", children: [_jsx("button", { onClick: () => handleEdit(transacao), className: "btn-edit", title: "Editar", children: "\u270F\uFE0F" }), _jsx("button", { onClick: () => handleDelete(transacao.id), className: "btn-delete", title: "Deletar", children: "\uD83D\uDDD1\uFE0F" })] })] }, transacao.id))) }))] })] })] }));
}

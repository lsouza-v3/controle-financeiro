const STORAGE_KEY = 'transacoes';
export function getTransacoes() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}
export function salvarTransacao(transacao) {
    const transacoes = getTransacoes();
    const novaTransacao = {
        ...transacao,
        id: Date.now().toString(),
    };
    transacoes.push(novaTransacao);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transacoes));
    return novaTransacao;
}
export function deletarTransacao(id) {
    const transacoes = getTransacoes();
    const filtradas = transacoes.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtradas));
}
export function atualizarTransacao(id, updates) {
    const transacoes = getTransacoes();
    const index = transacoes.findIndex(t => t.id === id);
    if (index === -1)
        throw new Error('Transação não encontrada');
    const atualizada = { ...transacoes[index], ...updates };
    transacoes[index] = atualizada;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transacoes));
    return atualizada;
}
export function calcularSaldos(transacoes) {
    const entradas = transacoes
        .filter(t => t.tipo === 'entrada')
        .reduce((sum, t) => sum + t.valor, 0);
    const saidas = transacoes
        .filter(t => t.tipo === 'saida')
        .reduce((sum, t) => sum + t.valor, 0);
    return {
        entradas,
        saidas,
        saldo: entradas - saidas,
    };
}

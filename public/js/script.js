"use strict";

const cotacaoValor = document.getElementById("cotacao-valor");
const cotacaoVariacao = document.getElementById("cotacao-variacao");
const cotacaoMaxima = document.getElementById("cotacao-maxima");
const cotacaoMinima = document.getElementById("cotacao-minima");
const cotacaoStatus = document.getElementById("cotacao-status");
const atualizarBotao = document.getElementById("atualizar-cotacao");

const formulario = document.getElementById("conversor-form");
const valorInput = document.getElementById("valor");
const moedasSelect = document.getElementById("moedas");
const converterBotao = document.getElementById("converter-botao");
const resultado = document.getElementById("resultado");
const conversaoDetalhe = document.getElementById("conversao-detalhe");

let cotacaoAtual = null;
let dataCotacao = null;
let carregando = false;

function formatarMoeda(valor, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda
  }).format(valor);
}

function formatarData(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(data);
}

function lerNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return NaN;
  }

  return Number(valor);
}

async function buscarCotacao() {
  if (carregando) return;

  carregando = true;
  cotacaoAtual = null;

  atualizarBotao.disabled = true;
  converterBotao.disabled = true;
  atualizarBotao.textContent = "Consultando...";

  cotacaoValor.textContent = "—";
  cotacaoMaxima.textContent = "—";
  cotacaoMinima.textContent = "—";
  cotacaoVariacao.textContent = "Consultando variação...";
  cotacaoVariacao.classList.remove("positive", "negative");
  cotacaoStatus.textContent = "Buscando a cotação mais recente...";

  resultado.textContent = "—";
  conversaoDetalhe.textContent = "Aguardando cotação para calcular.";

  const controlador = new AbortController();
  const tempoLimite = setTimeout(() => controlador.abort(), 10000);

  try {
    const resposta = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      {
        signal: controlador.signal,
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error("Falha ao consultar a API.");
    }

    const dados = await resposta.json();
    const dolar = dados.USDBRL;

    if (!dolar) {
      throw new Error("Cotação não encontrada.");
    }

    const compra = lerNumero(dolar.bid);
    const maxima = lerNumero(dolar.high);
    const minima = lerNumero(dolar.low);
    const variacao = lerNumero(dolar.pctChange);
    const timestamp = lerNumero(dolar.timestamp);

    if (!Number.isFinite(compra) || compra <= 0) {
      throw new Error("Cotação inválida.");
    }

    const data = new Date(timestamp * 1000);

    if (!Number.isFinite(timestamp) || !Number.isFinite(data.getTime())) {
      throw new Error("Data da cotação inválida.");
    }

    cotacaoAtual = compra;
    dataCotacao = data;

    cotacaoValor.textContent = formatarMoeda(compra);

    cotacaoMaxima.textContent =
      Number.isFinite(maxima) && maxima > 0
        ? formatarMoeda(maxima)
        : "Não informada";

    cotacaoMinima.textContent =
      Number.isFinite(minima) && minima > 0
        ? formatarMoeda(minima)
        : "Não informada";

    if (Number.isFinite(variacao)) {
      const percentual = variacao.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const sinal = variacao > 0 ? "+" : "";

      cotacaoVariacao.textContent =
        `Variação informada: ${sinal}${percentual}%`;

      if (variacao > 0) {
        cotacaoVariacao.classList.add("positive");
      } else if (variacao < 0) {
        cotacaoVariacao.classList.add("negative");
      }
    } else {
      cotacaoVariacao.textContent = "Variação não informada.";
    }

    cotacaoStatus.textContent =
      `Fonte: AwesomeAPI · Cotação de ${formatarData(dataCotacao)}`;

    converterBotao.disabled = false;
    conversaoDetalhe.textContent = "Informe um valor para converter.";

    if (valorInput.value !== "" && valorInput.validity.valid) {
      converterValor();
    }
  } catch (erro) {
    cotacaoVariacao.textContent = "Cotação indisponível.";

    cotacaoStatus.textContent =
      erro.name === "AbortError"
        ? "A consulta demorou demais. Clique em atualizar para tentar novamente."
        : "Não foi possível consultar a cotação. Verifique sua conexão e tente novamente.";

    conversaoDetalhe.textContent =
      "O conversor precisa de uma cotação válida para funcionar.";
  } finally {
    clearTimeout(tempoLimite);

    carregando = false;
    atualizarBotao.disabled = false;
    atualizarBotao.textContent = "Atualizar cotação";
  }
}

function converterValor() {
  if (cotacaoAtual === null) {
    resultado.textContent = "—";
    conversaoDetalhe.textContent = "Atualize a cotação antes de converter.";
    return;
  }

  if (!formulario.reportValidity()) return;

  const valor = valorInput.valueAsNumber;

  if (!Number.isFinite(valor) || valor < 0) {
    resultado.textContent = "—";
    conversaoDetalhe.textContent = "Digite um valor válido, igual ou maior que zero.";
    return;
  }

  const dolarParaReal = moedasSelect.value === "USD-BRL";
  const moedaOrigem = dolarParaReal ? "USD" : "BRL";
  const moedaDestino = dolarParaReal ? "BRL" : "USD";

  const valorConvertido = dolarParaReal
    ? valor * cotacaoAtual
    : valor / cotacaoAtual;

  if (!Number.isFinite(valorConvertido)) {
    resultado.textContent = "—";
    conversaoDetalhe.textContent = "O valor informado é muito alto.";
    return;
  }

  resultado.textContent = formatarMoeda(valorConvertido, moedaDestino);

  conversaoDetalhe.textContent =
    `${formatarMoeda(valor, moedaOrigem)} = ` +
    `${formatarMoeda(valorConvertido, moedaDestino)}. ` +
    `Base: 1 USD = ${formatarMoeda(cotacaoAtual)}. ` +
    "Estimativa sem impostos ou tarifas.";
}

atualizarBotao.addEventListener("click", buscarCotacao);

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  converterValor();
});

function limparResultado() {
  resultado.textContent = "—";

  conversaoDetalhe.textContent =
    cotacaoAtual === null
      ? "Aguardando cotação para calcular."
      : "Clique em converter para calcular o novo valor.";
}

valorInput.addEventListener("input", limparResultado);
moedasSelect.addEventListener("change", limparResultado);

const avisoFonte = document.querySelector(".quote-card > .small-text");

if (avisoFonte) {
  avisoFonte.textContent =
    "Fonte: AwesomeAPI. Cotação de compra como referência, sem impostos ou tarifas.";
}

buscarCotacao();

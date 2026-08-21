"""Coleta das manchetes nos sites jurídicos.

Este é o coração da "raspagem" (web scraping). Para cada fonte definida na
configuração, o programa:
    1. Baixa o HTML da página de notícias;
    2. Extrai os links e seus textos (manchetes);
    3. Mantém apenas as manchetes que contêm algum dos termos de busca.

O resultado é uma lista de notícias por fonte, pronta para o relatório.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


# Cabeçalho de navegador. Muitos sites bloqueiam requisições sem um
# "User-Agent" de aparência convencional; por isso o informamos.
CABECALHO_HTTP = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}

# Quantidade mínima de caracteres para um texto ser considerado manchete.
# Evita capturar links curtos de menu como "Início" ou "Contato".
TAMANHO_MINIMO_MANCHETE = 25


@dataclass
class Noticia:
    """Representa uma única manchete coletada."""

    titulo: str
    link: str


@dataclass
class ResultadoFonte:
    """Agrupa as notícias (ou o erro) de uma fonte específica."""

    nome: str
    url: str
    noticias: list[Noticia]
    erro: str | None = None  # preenchido caso o site falhe ao ser acessado


def _normalizar(texto: str) -> str:
    """Coloca o texto em minúsculas e remove acentos.

    Serve para comparar termos de busca com as manchetes de forma tolerante,
    ignorando diferenças de acentuação e caixa (ex.: "Usucapião" == "usucapiao").
    """
    texto = texto.lower().strip()
    # Decompõe os acentos e descarta os caracteres de acentuação.
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto


def _corresponde_aos_termos(titulo: str, termos_normalizados: list[str]) -> bool:
    """Retorna True se a manchete contiver ao menos um dos termos de busca."""
    titulo_norm = _normalizar(titulo)
    return any(termo in titulo_norm for termo in termos_normalizados)


def _extrair_links(html: str, url_base: str, seletor: str) -> list[Noticia]:
    """Extrai as manchetes (texto + link) do HTML de uma página.

    Se um seletor CSS for informado, usamos apenas os elementos que ele
    apontar. Caso contrário, varremos todas as tags <a> da página.
    """
    sopa = BeautifulSoup(html, "html.parser")

    # Escolhe o conjunto de links a analisar.
    if seletor:
        elementos = sopa.select(seletor)
    else:
        elementos = sopa.find_all("a")

    noticias: list[Noticia] = []
    vistos: set[str] = set()  # evita manchetes duplicadas

    for elemento in elementos:
        # O elemento pode ser o próprio <a> ou um contêiner que tenha um <a>.
        ancora = elemento if elemento.name == "a" else elemento.find("a")
        if ancora is None:
            continue

        titulo = ancora.get_text(strip=True)
        href = ancora.get("href")

        # Ignora links sem texto suficiente ou sem destino.
        if not href or len(titulo) < TAMANHO_MINIMO_MANCHETE:
            continue

        # Converte links relativos (ex.: "/noticia/123") em links absolutos.
        link = urljoin(url_base, href)

        # Descarta duplicatas.
        if link in vistos:
            continue
        vistos.add(link)

        noticias.append(Noticia(titulo=titulo, link=link))

    return noticias


def coletar_de_fonte(
    fonte: dict,
    termos_normalizados: list[str],
    timeout: int,
    max_itens: int,
) -> ResultadoFonte:
    """Baixa e filtra as notícias de uma única fonte.

    Qualquer falha de rede é capturada e registrada no campo 'erro', para que
    um site fora do ar não interrompa a coleta das demais fontes.
    """
    nome = fonte.get("nome", fonte.get("url", "Fonte sem nome"))
    url = fonte.get("url", "")
    seletor = fonte.get("seletor", "") or ""

    try:
        resposta = requests.get(url, headers=CABECALHO_HTTP, timeout=timeout)
        resposta.raise_for_status()
        # Garante a decodificação correta dos acentos.
        resposta.encoding = resposta.apparent_encoding or resposta.encoding

        todas = _extrair_links(resposta.text, url, seletor)

        # Mantém apenas as manchetes que casam com os termos de busca.
        filtradas = [
            noticia
            for noticia in todas
            if _corresponde_aos_termos(noticia.titulo, termos_normalizados)
        ]

        return ResultadoFonte(nome=nome, url=url, noticias=filtradas[:max_itens])

    except requests.RequestException as exc:
        # Erros de conexão, timeout, HTTP 4xx/5xx etc.
        return ResultadoFonte(nome=nome, url=url, noticias=[], erro=str(exc))


def coletar_todas(config: dict) -> list[ResultadoFonte]:
    """Percorre todas as fontes da configuração e coleta as notícias.

    Retorna uma lista de ResultadoFonte — uma entrada por site monitorado.
    """
    termos_normalizados = [_normalizar(t) for t in config["termos_de_busca"]]
    opcoes = config["opcoes"]
    timeout = opcoes["timeout_segundos"]
    max_itens = opcoes["max_itens_por_fonte"]

    resultados: list[ResultadoFonte] = []
    for fonte in config["fontes"]:
        print(f"  -> Coletando: {fonte.get('nome', fonte.get('url'))}")
        resultado = coletar_de_fonte(fonte, termos_normalizados, timeout, max_itens)
        if resultado.erro:
            print(f"     [aviso] falha ao acessar: {resultado.erro}")
        else:
            print(f"     {len(resultado.noticias)} manchete(s) relevante(s)")
        resultados.append(resultado)

    return resultados

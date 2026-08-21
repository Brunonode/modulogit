"""Consolidação das notícias coletadas em um relatório.

Gera duas versões do relatório a partir da mesma lista de resultados:
    - HTML  : usado no corpo do e-mail (com links clicáveis e visual limpo);
    - texto : versão simples, exibida no terminal e usada como alternativa
              para clientes de e-mail que não renderizam HTML.
"""

from __future__ import annotations

import html
from datetime import datetime

from .coletor import ResultadoFonte


def _agora_formatado() -> str:
    """Data/hora atual em formato legível para o cabeçalho do relatório."""
    return datetime.now().strftime("%d/%m/%Y às %H:%M")


def contar_total(resultados: list[ResultadoFonte]) -> int:
    """Soma o total de manchetes encontradas em todas as fontes."""
    return sum(len(r.noticias) for r in resultados)


def gerar_html(resultados: list[ResultadoFonte], termos: list[str]) -> str:
    """Monta o relatório em HTML para o corpo do e-mail."""
    total = contar_total(resultados)
    termos_txt = ", ".join(termos)

    # Cabeçalho do documento.
    partes = [
        "<html><body style='font-family: Arial, sans-serif; color: #222;'>",
        "<h2 style='color:#1a3d7c;'>📰 Resumo Diário de Notícias Jurídicas</h2>",
        f"<p><b>Gerado em:</b> {_agora_formatado()}<br>",
        f"<b>Termos monitorados:</b> {html.escape(termos_txt)}<br>",
        f"<b>Total de manchetes encontradas:</b> {total}</p>",
        "<hr>",
    ]

    # Uma seção por fonte.
    for resultado in resultados:
        partes.append(
            f"<h3 style='color:#1a3d7c; margin-bottom:4px;'>"
            f"{html.escape(resultado.nome)}</h3>"
        )

        if resultado.erro:
            partes.append(
                "<p style='color:#a00;'>⚠️ Não foi possível acessar esta fonte "
                f"({html.escape(resultado.erro)}).</p>"
            )
            continue

        if not resultado.noticias:
            partes.append(
                "<p style='color:#666;'><i>Nenhuma manchete relevante hoje.</i></p>"
            )
            continue

        # Lista de manchetes com links clicáveis.
        partes.append("<ul>")
        for noticia in resultado.noticias:
            titulo = html.escape(noticia.titulo)
            link = html.escape(noticia.link, quote=True)
            partes.append(
                f"<li><a href='{link}' style='color:#1a5fb4; "
                f"text-decoration:none;'>{titulo}</a></li>"
            )
        partes.append("</ul>")

    # Rodapé.
    partes.append(
        "<hr><p style='color:#888; font-size:12px;'>"
        "Relatório gerado automaticamente pelo Agregador de Notícias Jurídicas."
        "</p></body></html>"
    )

    return "\n".join(partes)


def gerar_texto(resultados: list[ResultadoFonte], termos: list[str]) -> str:
    """Monta uma versão em texto puro do relatório."""
    total = contar_total(resultados)
    linhas = [
        "RESUMO DIÁRIO DE NOTÍCIAS JURÍDICAS",
        f"Gerado em: {_agora_formatado()}",
        f"Termos monitorados: {', '.join(termos)}",
        f"Total de manchetes encontradas: {total}",
        "=" * 60,
        "",
    ]

    for resultado in resultados:
        linhas.append(f"## {resultado.nome}")

        if resultado.erro:
            linhas.append(f"  [erro] Não foi possível acessar: {resultado.erro}")
        elif not resultado.noticias:
            linhas.append("  (nenhuma manchete relevante hoje)")
        else:
            for noticia in resultado.noticias:
                linhas.append(f"  - {noticia.titulo}")
                linhas.append(f"    {noticia.link}")
        linhas.append("")

    return "\n".join(linhas)

#!/usr/bin/env python3
"""Agregador de Notícias Jurídicas — ponto de entrada do programa.

Fluxo completo executado por este arquivo:

    1. Carrega as configurações (termos, fontes e e-mail) do config.yaml;
    2. Visita cada site e coleta as manchetes que casam com os termos;
    3. Consolida tudo em um único relatório (HTML + texto);
    4. Envia o relatório por e-mail;
    5. (Opcional) salva uma cópia local do relatório em HTML.

Uso:
    python main.py                 # coleta e envia o e-mail
    python main.py --sem-email     # coleta e apenas mostra/salva (não envia)

Para rodar todas as manhãs automaticamente, veja a seção "Agendamento" no
README.md (cron no Linux/Mac ou Agendador de Tarefas no Windows).
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from aggregator import coletor, enviador_email, relatorio
from aggregator.config import carregar_config


def _analisar_argumentos() -> argparse.Namespace:
    """Lê os argumentos de linha de comando."""
    parser = argparse.ArgumentParser(
        description="Agregador diário de notícias jurídicas."
    )
    parser.add_argument(
        "--config",
        default=None,
        help="Caminho alternativo para o arquivo de configuração (config.yaml).",
    )
    parser.add_argument(
        "--sem-email",
        action="store_true",
        help="Coleta e gera o relatório, mas NÃO envia o e-mail (útil para testar).",
    )
    return parser.parse_args()


def _salvar_copia_local(corpo_html: str) -> None:
    """Salva o relatório HTML em uma pasta local 'relatorios/'."""
    pasta = Path(__file__).resolve().parent / "relatorios"
    pasta.mkdir(exist_ok=True)
    nome_arquivo = pasta / f"relatorio_{datetime.now():%Y-%m-%d}.html"
    nome_arquivo.write_text(corpo_html, encoding="utf-8")
    print(f"  Cópia local salva em: {nome_arquivo}")


def main() -> int:
    """Executa o fluxo completo. Retorna 0 em caso de sucesso, 1 em erro."""
    args = _analisar_argumentos()

    # --- Passo 1: carregar configurações -----------------------------------
    print("[1/4] Carregando configurações...")
    try:
        config = carregar_config(args.config)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERRO de configuração: {exc}", file=sys.stderr)
        return 1

    # --- Passo 2: coletar as notícias --------------------------------------
    print("[2/4] Coletando notícias das fontes...")
    resultados = coletor.coletar_todas(config)
    total = relatorio.contar_total(resultados)
    print(f"  Total de manchetes relevantes: {total}")

    # --- Passo 3: gerar o relatório ----------------------------------------
    print("[3/4] Gerando relatório...")
    termos = config["termos_de_busca"]
    corpo_html = relatorio.gerar_html(resultados, termos)
    corpo_texto = relatorio.gerar_texto(resultados, termos)

    if config["opcoes"].get("salvar_copia_local"):
        _salvar_copia_local(corpo_html)

    # --- Passo 4: enviar o e-mail ------------------------------------------
    if args.sem_email:
        print("[4/4] Modo --sem-email ativo. E-mail NÃO enviado.")
        print("\n----- PRÉVIA DO RELATÓRIO (texto) -----\n")
        print(corpo_texto)
        return 0

    print("[4/4] Enviando e-mail...")
    try:
        enviador_email.enviar_email(config["email"], corpo_html, corpo_texto)
    except Exception as exc:  # noqa: BLE001 — queremos reportar qualquer falha
        print(f"ERRO ao enviar e-mail: {exc}", file=sys.stderr)
        return 1

    print("Concluído com sucesso!")
    return 0


if __name__ == "__main__":
    # sys.exit propaga o código de saída — útil para o cron detectar falhas.
    sys.exit(main())

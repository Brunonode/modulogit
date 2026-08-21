"""Carregamento e validação do arquivo de configuração (config.yaml).

Este módulo isola toda a leitura das configurações. Assim, o restante do
programa nunca lê o arquivo YAML diretamente — ele apenas pede os dados já
prontos para este módulo. Isso mantém o código organizado e facilita a
manutenção.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml


# Caminho padrão do arquivo de configuração (na raiz do projeto).
CAMINHO_PADRAO = Path(__file__).resolve().parent.parent / "config.yaml"

# Nome da variável de ambiente que pode conter a senha do e-mail.
# Usar variável de ambiente é mais seguro do que escrever a senha no arquivo.
VARIAVEL_SENHA = "NOTICIAS_EMAIL_SENHA"


def carregar_config(caminho: str | os.PathLike | None = None) -> dict:
    """Lê o arquivo config.yaml e devolve um dicionário com as configurações.

    Parâmetros
    ----------
    caminho : str | PathLike | None
        Caminho do arquivo YAML. Se não for informado, usa CAMINHO_PADRAO.

    Retorna
    -------
    dict
        Dicionário com as chaves: termos_de_busca, fontes, email, opcoes.
    """
    caminho = Path(caminho) if caminho else CAMINHO_PADRAO

    # 1) Verifica se o arquivo existe e orienta o usuário caso não exista.
    if not caminho.exists():
        raise FileNotFoundError(
            f"Arquivo de configuração não encontrado: {caminho}\n"
            "Copie 'config.example.yaml' para 'config.yaml' e ajuste os valores."
        )

    # 2) Lê e interpreta o conteúdo YAML.
    with open(caminho, "r", encoding="utf-8") as arquivo:
        config = yaml.safe_load(arquivo) or {}

    # 3) Preenche valores padrão para campos que porventura faltem, evitando
    #    que o programa quebre por uma chave ausente.
    config.setdefault("termos_de_busca", [])
    config.setdefault("fontes", [])
    config.setdefault("email", {})
    config.setdefault("opcoes", {})

    opcoes = config["opcoes"]
    opcoes.setdefault("timeout_segundos", 20)
    opcoes.setdefault("max_itens_por_fonte", 15)
    opcoes.setdefault("salvar_copia_local", True)

    # 4) Se a senha não estiver no arquivo, tenta pegá-la da variável de ambiente.
    if not config["email"].get("senha"):
        config["email"]["senha"] = os.environ.get(VARIAVEL_SENHA, "")

    # 5) Validações mínimas para dar mensagens de erro claras ao usuário.
    _validar(config)

    return config


def _validar(config: dict) -> None:
    """Confere se os campos essenciais foram preenchidos."""
    if not config["termos_de_busca"]:
        raise ValueError("Nenhum termo de busca definido em 'termos_de_busca'.")

    if not config["fontes"]:
        raise ValueError("Nenhuma fonte definida em 'fontes'.")

    email = config["email"]
    for campo in ("servidor_smtp", "remetente", "destinatario"):
        if not email.get(campo):
            raise ValueError(f"Campo obrigatório ausente em 'email': {campo}")

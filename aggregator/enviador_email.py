"""Envio do relatório por e-mail usando SMTP.

Monta uma mensagem com duas partes (texto puro + HTML) e a envia através do
servidor SMTP configurado. A maioria dos provedores (Gmail, Outlook, etc.)
funciona com este mesmo código — basta ajustar servidor, porta e credenciais
no arquivo config.yaml.
"""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def enviar_email(config_email: dict, corpo_html: str, corpo_texto: str) -> None:
    """Envia o relatório para o destinatário configurado.

    Parâmetros
    ----------
    config_email : dict
        Seção 'email' do config.yaml (servidor, porta, credenciais, etc.).
    corpo_html : str
        Relatório em HTML (versão principal exibida no e-mail).
    corpo_texto : str
        Relatório em texto puro (alternativa para clientes sem HTML).
    """
    remetente = config_email["remetente"]
    destinatario = config_email["destinatario"]
    senha = config_email.get("senha", "")

    if not senha:
        raise ValueError(
            "Senha de e-mail não definida. Preencha 'email.senha' no config.yaml "
            "ou defina a variável de ambiente NOTICIAS_EMAIL_SENHA."
        )

    # 1) Monta a mensagem no formato "multipart/alternative": o cliente de
    #    e-mail escolhe a melhor versão que consegue exibir (HTML de preferência).
    mensagem = MIMEMultipart("alternative")
    mensagem["Subject"] = config_email.get("assunto", "Resumo de Notícias Jurídicas")
    mensagem["From"] = remetente
    mensagem["To"] = destinatario

    # A ordem importa: a última parte anexada é a "preferida" pelo cliente.
    mensagem.attach(MIMEText(corpo_texto, "plain", "utf-8"))
    mensagem.attach(MIMEText(corpo_html, "html", "utf-8"))

    # 2) Conecta ao servidor SMTP e envia.
    servidor = config_email["servidor_smtp"]
    porta = config_email.get("porta", 587)
    usar_tls = config_email.get("usar_tls", True)

    with smtplib.SMTP(servidor, porta, timeout=30) as smtp:
        smtp.ehlo()
        if usar_tls:
            # Ativa a criptografia da conexão (recomendado na porta 587).
            smtp.starttls()
            smtp.ehlo()
        smtp.login(remetente, senha)
        smtp.sendmail(remetente, [destinatario], mensagem.as_string())

    print(f"  E-mail enviado com sucesso para {destinatario}.")

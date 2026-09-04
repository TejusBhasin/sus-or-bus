import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'sv', name: 'Svenska' },
  { code: 'pl', name: 'Polski' }
];

const translations = {
  en: {
    badge: 'web safety analyzer', tagline: 'Paste a link, HTML, code, an email, or any text. Get an instant safety verdict — is it bussin or sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Code', tab_email: 'Email', tab_text: 'Text',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Paste any code snippet...', ph_email: 'Paste the full email content...', ph_text: 'Paste any text to vet...',
    run_check: 'Run the check', analyzing: 'Analyzing...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'New check', safety: 'safety', v_bus: 'this is bussin — looks legit', v_sus: 'this is sus — proceed with caution',
    preview: 'preview', score_tab: 'Score', detailed_tab: 'Detailed report', breakdown: 'the breakdown', full_report: 'full report', all_findings: 'all findings',
    green_flags: 'Green flags', red_flags: 'Red flags', data_collected: 'Data collected', trackers: 'Trackers detected', technologies: 'Technologies', code_notes: 'Code notes', original_input: 'Original input',
    not_found: 'Report not found.', back_home: 'Back home', footer_rights: 'All rights reserved.', footer_terms: 'Terms', footer_privacy: 'Privacy',
    share: 'Share', share_copied: 'Link copied!', export_pdf: 'Export PDF', copy_verdict: 'Copy verdict', verdict_copied: 'Verdict copied!',
    copy_code: 'Copy code', code_copied: 'Copied!', live_preview: 'Live website preview', source_code: 'Source code', open_site: 'Open site',
    findings: 'findings', safe: 'Safe', caution: 'Caution', dangerous: 'Dangerous',
    terms_title: 'Terms of Service', privacy_title: 'Privacy Policy', last_updated: 'Last updated', back_to_app: 'Back to app',
    iframe_blocked: "Some sites block embedding — if the preview is blank, open it in a new tab.",
    nav_home: 'Home', nav_settings: 'Settings'
  },
  es: {
    badge: 'analizador de seguridad web', tagline: 'Pega un enlace, HTML, código, un correo o cualquier texto. Obtén un veredicto instantáneo — ¿es bussin o sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Código', tab_email: 'Correo', tab_text: 'Texto',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Pega cualquier fragmento de código...', ph_email: 'Pega el contenido completo del correo...', ph_text: 'Pega cualquier texto para analizar...',
    run_check: 'Analizar', analyzing: 'Analizando...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Nueva verificación', safety: 'seguridad', v_bus: 'esto es bussin — parece legítimo', v_sus: 'esto es sus — procede con precaución',
    preview: 'vista previa', score_tab: 'Puntuación', detailed_tab: 'Informe detallado', breakdown: 'el desglose', full_report: 'informe completo', all_findings: 'todos los hallazgos',
    green_flags: 'Señales positivas', red_flags: 'Señales de alerta', data_collected: 'Datos recopilados', trackers: 'Rastreadores detectados', technologies: 'Tecnologías', code_notes: 'Notas de código', original_input: 'Entrada original',
    not_found: 'Informe no encontrado.', back_home: 'Volver al inicio', footer_rights: 'Todos los derechos reservados.', footer_terms: 'Términos', footer_privacy: 'Privacidad',
    share: 'Compartir', share_copied: '¡Enlace copiado!', export_pdf: 'Exportar PDF', copy_verdict: 'Copiar veredicto', verdict_copied: '¡Veredicto copiado!',
    copy_code: 'Copiar código', code_copied: '¡Copiado!', live_preview: 'Vista previa del sitio', source_code: 'Código fuente', open_site: 'Abrir sitio',
    findings: 'hallazgos', safe: 'Seguro', caution: 'Precaución', dangerous: 'Peligroso',
    terms_title: 'Términos de servicio', privacy_title: 'Política de privacidad', last_updated: 'Última actualización', back_to_app: 'Volver a la app',
    iframe_blocked: 'Algunos sitios bloquean la inserción — si la vista previa está en blanco, ábrela en una pestaña nueva.',
    nav_home: 'Inicio', nav_settings: 'Ajustes'
  },
  fr: {
    badge: 'analyseur de sécurité web', tagline: 'Collez un lien, du HTML, du code, un e-mail ou du texte. Obtenez un verdict instantané — est-ce bussin ou sus ?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Code', tab_email: 'E-mail', tab_text: 'Texte',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Collez un extrait de code...', ph_email: 'Collez le contenu complet de l\'e-mail...', ph_text: 'Collez du texte à analyser...',
    run_check: 'Analyser', analyzing: 'Analyse...', shortcut: '⌘/Ctrl + Entrée',
    new_check: 'Nouvelle vérification', safety: 'sécurité', v_bus: 'c\'est bussin — ça a l\'air légitime', v_sus: 'c\'est sus — procédez avec prudence',
    preview: 'aperçu', score_tab: 'Score', detailed_tab: 'Rapport détaillé', breakdown: 'le détail', full_report: 'rapport complet', all_findings: 'tous les résultats',
    green_flags: 'Points positifs', red_flags: 'Signaux d\'alerte', data_collected: 'Données collectées', trackers: 'Traceurs détectés', technologies: 'Technologies', code_notes: 'Notes de code', original_input: 'Entrée originale',
    not_found: 'Rapport introuvable.', back_home: 'Retour à l\'accueil', footer_rights: 'Tous droits réservés.', footer_terms: 'Conditions', footer_privacy: 'Confidentialité',
    share: 'Partager', share_copied: 'Lien copié !', export_pdf: 'Exporter PDF', copy_verdict: 'Copier le verdict', verdict_copied: 'Verdict copié !',
    copy_code: 'Copier le code', code_copied: 'Copié !', live_preview: 'Aperçu du site', source_code: 'Code source', open_site: 'Ouvrir le site',
    findings: 'résultats', safe: 'Sûr', caution: 'Prudence', dangerous: 'Dangereux',
    terms_title: 'Conditions d\'utilisation', privacy_title: 'Politique de confidentialité', last_updated: 'Dernière mise à jour', back_to_app: 'Retour à l\'app',
    iframe_blocked: 'Certains sites bloquent l\'intégration — si l\'aperçu est vide, ouvrez-le dans un nouvel onglet.',
    nav_home: 'Accueil', nav_settings: 'Réglages'
  },
  de: {
    badge: 'Web-Sicherheitsanalyse', tagline: 'Füge einen Link, HTML, Code, eine E-Mail oder Text ein. Erhalte ein sofortiges Urteil — ist es bussin oder sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Code', tab_email: 'E-Mail', tab_text: 'Text',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Code-Snippet einfügen...', ph_email: 'Vollständigen E-Mail-Inhalt einfügen...', ph_text: 'Text zum Prüfen einfügen...',
    run_check: 'Prüfen', analyzing: 'Wird analysiert...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Neue Prüfung', safety: 'Sicherheit', v_bus: 'das ist bussin — wirkt seriös', v_sus: 'das ist sus — mit Vorsicht vorgehen',
    preview: 'Vorschau', score_tab: 'Punktzahl', detailed_tab: 'Detaillierter Bericht', breakdown: 'die Aufschlüsselung', full_report: 'voller Bericht', all_findings: 'alle Ergebnisse',
    green_flags: 'Positive Zeichen', red_flags: 'Warnsignale', data_collected: 'Erhobene Daten', trackers: 'Erkannte Tracker', technologies: 'Technologien', code_notes: 'Code-Hinweise', original_input: 'Ursprüngliche Eingabe',
    not_found: 'Bericht nicht gefunden.', back_home: 'Zurück zum Start', footer_rights: 'Alle Rechte vorbehalten.', footer_terms: 'AGB', footer_privacy: 'Datenschutz',
    share: 'Teilen', share_copied: 'Link kopiert!', export_pdf: 'PDF exportieren', copy_verdict: 'Urteil kopieren', verdict_copied: 'Urteil kopiert!',
    copy_code: 'Code kopieren', code_copied: 'Kopiert!', live_preview: 'Live-Vorschau der Website', source_code: 'Quellcode', open_site: 'Seite öffnen',
    findings: 'Ergebnisse', safe: 'Sicher', caution: 'Vorsicht', dangerous: 'Gefährlich',
    terms_title: 'Nutzungsbedingungen', privacy_title: 'Datenschutzerklärung', last_updated: 'Zuletzt aktualisiert', back_to_app: 'Zurück zur App',
    iframe_blocked: 'Einige Seiten blockieren die Einbettung — falls die Vorschau leer ist, öffne sie in einem neuen Tab.',
    nav_home: 'Start', nav_settings: 'Einstellungen'
  },
  it: {
    badge: 'analizzatore di sicurezza web', tagline: 'Incolla un link, HTML, codice, un\'email o testo. Ottieni un verdetto istantaneo — è bussin o sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Codice', tab_email: 'Email', tab_text: 'Testo',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Incolla un frammento di codice...', ph_email: 'Incolla il contenuto completo dell\'email...', ph_text: 'Incolla testo da analizzare...',
    run_check: 'Analizza', analyzing: 'Analisi...', shortcut: '⌘/Ctrl + Invio',
    new_check: 'Nuova verifica', safety: 'sicurezza', v_bus: 'è bussin — sembra legittimo', v_sus: 'è sus — procedi con cautela',
    preview: 'anteprima', score_tab: 'Punteggio', detailed_tab: 'Report dettagliato', breakdown: 'i dettagli', full_report: 'report completo', all_findings: 'tutti i risultati',
    green_flags: 'Segnali positivi', red_flags: 'Campanelli d\'allarme', data_collected: 'Dati raccolti', trackers: 'Tracker rilevati', technologies: 'Tecnologie', code_notes: 'Note sul codice', original_input: 'Input originale',
    not_found: 'Report non trovato.', back_home: 'Torna alla home', footer_rights: 'Tutti i diritti riservati.', footer_terms: 'Termini', footer_privacy: 'Privacy',
    share: 'Condividi', share_copied: 'Link copiato!', export_pdf: 'Esporta PDF', copy_verdict: 'Copia verdetto', verdict_copied: 'Verdetto copiato!',
    copy_code: 'Copia codice', code_copied: 'Copiato!', live_preview: 'Anteprima sito live', source_code: 'Codice sorgente', open_site: 'Apri sito',
    findings: 'risultati', safe: 'Sicuro', caution: 'Caution', dangerous: 'Pericoloso',
    terms_title: 'Termini di servizio', privacy_title: 'Informativa sulla privacy', last_updated: 'Ultimo aggiornamento', back_to_app: 'Torna all\'app',
    iframe_blocked: 'Alcuni siti bloccano l\'incorporamento — se l\'anteprima è vuota, aprila in una nuova scheda.',
    nav_home: 'Home', nav_settings: 'Impostazioni'
  },
  pt: {
    badge: 'analisador de segurança web', tagline: 'Cole um link, HTML, código, e-mail ou texto. Obtenha um veredito instantâneo — é bussin ou sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Código', tab_email: 'E-mail', tab_text: 'Texto',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Cole qualquer trecho de código...', ph_email: 'Cole o conteúdo completo do e-mail...', ph_text: 'Cole texto para analisar...',
    run_check: 'Analisar', analyzing: 'Analisando...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Nova verificação', safety: 'segurança', v_bus: 'isso é bussin — parece legítimo', v_sus: 'isso é sus — prossiga com cautela',
    preview: 'pré-visualização', score_tab: 'Pontuação', detailed_tab: 'Relatório detalhado', breakdown: 'o detalhamento', full_report: 'relatório completo', all_findings: 'todos os resultados',
    green_flags: 'Sinais positivos', red_flags: 'Sinais de alerta', data_collected: 'Dados coletados', trackers: 'Rastreadores detectados', technologies: 'Tecnologias', code_notes: 'Notas de código', original_input: 'Entrada original',
    not_found: 'Relatório não encontrado.', back_home: 'Voltar ao início', footer_rights: 'Todos os direitos reservados.', footer_terms: 'Termos', footer_privacy: 'Privacidade',
    share: 'Compartilhar', share_copied: 'Link copiado!', export_pdf: 'Exportar PDF', copy_verdict: 'Copiar veredito', verdict_copied: 'Veredito copiado!',
    copy_code: 'Copiar código', code_copied: 'Copiado!', live_preview: 'Pré-visualização do site', source_code: 'Código-fonte', open_site: 'Abrir site',
    findings: 'resultados', safe: 'Seguro', caution: 'Cautela', dangerous: 'Perigoso',
    terms_title: 'Termos de serviço', privacy_title: 'Política de privacidade', last_updated: 'Última atualização', back_to_app: 'Voltar ao app',
    iframe_blocked: 'Alguns sites bloqueiam a incorporação — se a pré-visualização estiver em branco, abra em uma nova aba.',
    nav_home: 'Início', nav_settings: 'Ajustes'
  },
  nl: {
    badge: 'webveiligheidsanalyse', tagline: 'Plak een link, HTML, code, e-mail of tekst. Krijg direct een oordeel — is het bussin of sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Code', tab_email: 'E-mail', tab_text: 'Tekst',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Plak een codefragment...', ph_email: 'Plak de volledige e-mailinhoud...', ph_text: 'Plak tekst om te controleren...',
    run_check: 'Controleren', analyzing: 'Analyseren...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Nieuwe controle', safety: 'veiligheid', v_bus: 'dit is bussin — lijkt legitiem', v_sus: 'dit is sus — wees voorzichtig',
    preview: 'voorbeeld', score_tab: 'Score', detailed_tab: 'Gedetailleerd rapport', breakdown: 'de uitsplitsing', full_report: 'volledig rapport', all_findings: 'alle bevindingen',
    green_flags: 'Positieve signalen', red_flags: 'Waarschuwingssignalen', data_collected: 'Verzamelde gegevens', trackers: 'Gedetecteerde trackers', technologies: 'Technologieën', code_notes: 'Code-opmerkingen', original_input: 'Oorspronkelijke invoer',
    not_found: 'Rapport niet gevonden.', back_home: 'Terug naar home', footer_rights: 'Alle rechten voorbehouden.', footer_terms: 'Voorwaarden', footer_privacy: 'Privacy',
    share: 'Delen', share_copied: 'Link gekopieerd!', export_pdf: 'PDF exporteren', copy_verdict: 'Vonnis kopiëren', verdict_copied: 'Vonnis gekopieerd!',
    copy_code: 'Code kopiëren', code_copied: 'Gekopieerd!', live_preview: 'Live websitevoorbeeld', source_code: 'Broncode', open_site: 'Site openen',
    findings: 'bevindingen', safe: 'Veilig', caution: 'Let op', dangerous: 'Gevaarlijk',
    terms_title: 'Servicevoorwaarden', privacy_title: 'Privacybeleid', last_updated: 'Laatst bijgewerkt', back_to_app: 'Terug naar app',
    iframe_blocked: 'Sommige sites blokkeren inbedding — als het voorbeeld leeg is, open het in een nieuw tabblad.',
    nav_home: 'Start', nav_settings: 'Instellingen'
  },
  ru: {
    badge: 'анализатор веб-безопасности', tagline: 'Вставьте ссылку, HTML, код, письмо или текст. Получите мгновенный вердикт — это bussin или sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Код', tab_email: 'Письмо', tab_text: 'Текст',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Вставьте фрагмент кода...', ph_email: 'Вставьте полное содержимое письма...', ph_text: 'Вставьте текст для проверки...',
    run_check: 'Проверить', analyzing: 'Анализ...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Новая проверка', safety: 'безопасность', v_bus: 'это bussin — выглядит надёжно', v_sus: 'это sus — действуйте осторожно',
    preview: 'предпросмотр', score_tab: 'Оценка', detailed_tab: 'Подробный отчёт', breakdown: 'разбор', full_report: 'полный отчёт', all_findings: 'все выводы',
    green_flags: 'Положительные сигналы', red_flags: 'Тревожные сигналы', data_collected: 'Собираемые данные', trackers: 'Обнаруженные трекеры', technologies: 'Технологии', code_notes: 'Заметки о коде', original_input: 'Исходный ввод',
    not_found: 'Отчёт не найден.', back_home: 'На главную', footer_rights: 'Все права защищены.', footer_terms: 'Условия', footer_privacy: 'Конфиденциальность',
    share: 'Поделиться', share_copied: 'Ссылка скопирована!', export_pdf: 'Экспорт PDF', copy_verdict: 'Копировать вердикт', verdict_copied: 'Вердикт скопирован!',
    copy_code: 'Копировать код', code_copied: 'Скопировано!', live_preview: 'Живой просмотр сайта', source_code: 'Исходный код', open_site: 'Открыть сайт',
    findings: 'выводов', safe: 'Безопасно', caution: 'Осторожно', dangerous: 'Опасно',
    terms_title: 'Условия использования', privacy_title: 'Политика конфиденциальности', last_updated: 'Последнее обновление', back_to_app: 'Вернуться в приложение',
    iframe_blocked: 'Некоторые сайты блокируют встраивание — если предпросмотр пуст, откройте сайт в новой вкладке.',
    nav_home: 'Главная', nav_settings: 'Настройки'
  },
  zh: {
    badge: '网络安全分析器', tagline: '粘贴链接、HTML、代码、邮件或任意文本。即时获得安全判定 — 是 bussin 还是 sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: '代码', tab_email: '邮件', tab_text: '文本',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: '粘贴任意代码片段...', ph_email: '粘贴完整邮件内容...', ph_text: '粘贴要检测的文本...',
    run_check: '检测', analyzing: '分析中...', shortcut: '⌘/Ctrl + Enter',
    new_check: '新检测', safety: '安全', v_bus: '这是 bussin — 看起来可信', v_sus: '这是 sus — 请谨慎',
    preview: '预览', score_tab: '评分', detailed_tab: '详细报告', breakdown: '详情', full_report: '完整报告', all_findings: '所有发现',
    green_flags: '正面信号', red_flags: '警告信号', data_collected: '收集的数据', trackers: '检测到的追踪器', technologies: '技术', code_notes: '代码说明', original_input: '原始输入',
    not_found: '未找到报告。', back_home: '返回首页', footer_rights: '保留所有权利。', footer_terms: '条款', footer_privacy: '隐私',
    share: '分享', share_copied: '链接已复制！', export_pdf: '导出 PDF', copy_verdict: '复制判定', verdict_copied: '判定已复制！',
    copy_code: '复制代码', code_copied: '已复制！', live_preview: '网站实时预览', source_code: '源代码', open_site: '打开网站',
    findings: '项发现', safe: '安全', caution: '注意', dangerous: '危险',
    terms_title: '服务条款', privacy_title: '隐私政策', last_updated: '最后更新', back_to_app: '返回应用',
    iframe_blocked: '部分网站禁止嵌入 — 如果预览为空白，请在新标签页中打开。',
    nav_home: '首页', nav_settings: '设置'
  },
  ja: {
    badge: 'ウェブセキュリティ分析', tagline: 'リンク、HTML、コード、メール、テキストを貼り付けてください。瞬時に判定 — bussin か sus か？',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'コード', tab_email: 'メール', tab_text: 'テキスト',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'コードスニペットを貼り付け...', ph_email: 'メール全文を貼り付け...', ph_text: 'チェックするテキストを貼り付け...',
    run_check: 'チェック', analyzing: '分析中...', shortcut: '⌘/Ctrl + Enter',
    new_check: '新規チェック', safety: '安全性', v_bus: 'これは bussin — 信頼できそう', v_sus: 'これは sus — 注意して進めて',
    preview: 'プレビュー', score_tab: 'スコア', detailed_tab: '詳細レポート', breakdown: '内訳', full_report: '完全レポート', all_findings: 'すべての所見',
    green_flags: '好ましい兆候', red_flags: '警告兆候', data_collected: '収集データ', trackers: '検出されたトラッカー', technologies: '技術', code_notes: 'コード注記', original_input: '元の入力',
    not_found: 'レポートが見つかりません。', back_home: 'ホームに戻る', footer_rights: 'All rights reserved.', footer_terms: '利用規約', footer_privacy: 'プライバシー',
    share: '共有', share_copied: 'リンクをコピーしました！', export_pdf: 'PDF書き出し', copy_verdict: '判定をコピー', verdict_copied: '判定をコピーしました！',
    copy_code: 'コードをコピー', code_copied: 'コピーしました！', live_preview: 'サイトのライブプレビュー', source_code: 'ソースコード', open_site: 'サイトを開く',
    findings: '件の所見', safe: '安全', caution: '注意', dangerous: '危険',
    terms_title: '利用規約', privacy_title: 'プライバシーポリシー', last_updated: '最終更新', back_to_app: 'アプリに戻る',
    iframe_blocked: '一部のサイトは埋め込みをブロックします — プレビューが空白の場合は新しいタブで開いてください。',
    nav_home: 'ホーム', nav_settings: '設定'
  },
  ko: {
    badge: '웹 보안 분석기', tagline: '링크, HTML, 코드, 이메일 또는 텍스트를 붙여넣으세요. 즉시 판정을 받습니다 — bussin 인가 sus 인가?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: '코드', tab_email: '이메일', tab_text: '텍스트',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: '코드 조각을 붙여넣으세요...', ph_email: '이메일 전체 내용을 붙여넣으세요...', ph_text: '검사할 텍스트를 붙여넣으세요...',
    run_check: '검사', analyzing: '분석 중...', shortcut: '⌘/Ctrl + Enter',
    new_check: '새 검사', safety: '안전', v_bus: '이건 bussin — 신뢰할 수 있어 보임', v_sus: '이건 sus — 주의하세요',
    preview: '미리보기', score_tab: '점수', detailed_tab: '상세 보고서', breakdown: '세부 내역', full_report: '전체 보고서', all_findings: '모든 소견',
    green_flags: '긍정 신호', red_flags: '경고 신호', data_collected: '수집 데이터', trackers: '감지된 트래커', technologies: '기술', code_notes: '코드 메모', original_input: '원본 입력',
    not_found: '보고서를 찾을 수 없습니다.', back_home: '홈으로', footer_rights: 'All rights reserved.', footer_terms: '약관', footer_privacy: '개인정보',
    share: '공유', share_copied: '링크 복사됨!', export_pdf: 'PDF 내보내기', copy_verdict: '판정 복사', verdict_copied: '판정 복사됨!',
    copy_code: '코드 복사', code_copied: '복사됨!', live_preview: '사이트 라이브 미리보기', source_code: '소스 코드', open_site: '사이트 열기',
    findings: '개 소견', safe: '안전', caution: '주의', dangerous: '위험',
    terms_title: '서비스 약관', privacy_title: '개인정보 처리방침', last_updated: '최근 업데이트', back_to_app: '앱으로 돌아가기',
    iframe_blocked: '일부 사이트는 임베드를 차단합니다 — 미리보기가 비어 있으면 새 탭에서 여세요.',
    nav_home: '홈', nav_settings: '설정'
  },
  ar: {
    badge: 'محلل أمان الويب', tagline: 'الصق رابطًا أو HTML أو كودًا أو بريدًا إلكترونيًا أو نصًا. احصل على حكم فوري — هل هو bussin أم sus؟',
    bussin: 'bussin', sus: 'sus', tab_url: 'رابط', tab_html: 'HTML', tab_code: 'كود', tab_email: 'بريد', tab_text: 'نص',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'الصق أي مقطع كود...', ph_email: 'الصق محتوى البريد كاملاً...', ph_text: 'الصق نصًا للفحص...',
    run_check: 'فحص', analyzing: 'جاري التحليل...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'فحص جديد', safety: 'الأمان', v_bus: 'هذا bussin — يبدو موثوقًا', v_sus: 'هذا sus — تابع بحذر',
    preview: 'معاينة', score_tab: 'النتيجة', detailed_tab: 'تقرير مفصل', breakdown: 'التفصيل', full_report: 'التقرير الكامل', all_findings: 'جميع النتائج',
    green_flags: 'إشارات إيجابية', red_flags: 'إشارات تحذير', data_collected: 'البيانات المجمعة', trackers: 'المتعقبات المكتشفة', technologies: 'التقنيات', code_notes: 'ملاحظات الكود', original_input: 'المدخل الأصلي',
    not_found: 'التقرير غير موجود.', back_home: 'العودة للرئيسية', footer_rights: 'جميع الحقوق محفوظة.', footer_terms: 'الشروط', footer_privacy: 'الخصوصية',
    share: 'مشاركة', share_copied: 'تم نسخ الرابط!', export_pdf: 'تصدير PDF', copy_verdict: 'نسخ الحكم', verdict_copied: 'تم نسخ الحكم!',
    copy_code: 'نسخ الكود', code_copied: 'تم النسخ!', live_preview: 'معاينة مباشرة للموقع', source_code: 'الكود المصدري', open_site: 'فتح الموقع',
    findings: 'نتائج', safe: 'آمن', caution: 'حذر', dangerous: 'خطير',
    terms_title: 'شروط الخدمة', privacy_title: 'سياسة الخصوصية', last_updated: 'آخر تحديث', back_to_app: 'العودة إلى التطبيق',
    iframe_blocked: 'بعض المواقع تمنع التضمين — إذا كانت المعاينة فارغة، افتحها في تبويب جديد.',
    nav_home: 'الرئيسية', nav_settings: 'الإعدادات'
  },
  hi: {
    badge: 'वेब सुरक्षा विश्लेषक', tagline: 'लिंक, HTML, कोड, ईमेल या टेक्स्ट चिपकाएँ। तुरंत सुरक्षा निर्णय पाएँ — क्या यह bussin है या sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'कोड', tab_email: 'ईमेल', tab_text: 'टेक्स्ट',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'कोई भी कोड स्निपेट चिपकाएँ...', ph_email: 'पूरा ईमेल सामग्री चिपकाएँ...', ph_text: 'जाँचने के लिए टेक्स्ट चिपकाएँ...',
    run_check: 'जाँच करें', analyzing: 'विश्लेषण हो रहा है...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'नई जाँच', safety: 'सुरक्षा', v_bus: 'यह bussin है — भरोसेमंद लगता है', v_sus: 'यह sus है — सावधानी बरतें',
    preview: 'पूर्वावलोकन', score_tab: 'स्कोर', detailed_tab: 'विस्तृत रिपोर्ट', breakdown: 'विवरण', full_report: 'पूरी रिपोर्ट', all_findings: 'सभी निष्कर्ष',
    green_flags: 'सकारात्मक संकेत', red_flags: 'चेतावनी संकेत', data_collected: 'एकत्रित डेटा', trackers: 'पहचाने गए ट्रैकर', technologies: 'तकनीक', code_notes: 'कोड नोट्स', original_input: 'मूल इनपुट',
    not_found: 'रिपोर्ट नहीं मिली।', back_home: 'होम पर जाएँ', footer_rights: 'सर्वाधिकार सुरक्षित।', footer_terms: 'शर्तें', footer_privacy: 'गोपनीयता',
    share: 'साझा करें', share_copied: 'लिंक कॉपी हो गया!', export_pdf: 'PDF निर्यात', copy_verdict: 'निर्णय कॉपी करें', verdict_copied: 'निर्णय कॉपी हो गया!',
    copy_code: 'कोड कॉपी करें', code_copied: 'कॉपी हो गया!', live_preview: 'वेबसाइट लाइव पूर्वावलोकन', source_code: 'सोर्स कोड', open_site: 'साइट खोलें',
    findings: 'निष्कर्ष', safe: 'सुरक्षित', caution: 'सावधानी', dangerous: 'खतरनाक',
    terms_title: 'सेवा की शर्तें', privacy_title: 'गोपनीयता नीति', last_updated: 'अंतिम अपडेट', back_to_app: 'ऐप पर वापस',
    iframe_blocked: 'कुछ साइटें एम्बेडिंग रोकती हैं — यदि पूर्वावलोकन खाली हो, तो नई टैब में खोलें।',
    nav_home: 'होम', nav_settings: 'सेटिंग्स'
  },
  tr: {
    badge: 'web güvenlik analizörü', tagline: 'Bir bağlantı, HTML, kod, e-posta veya metin yapıştırın. Anında bir karar alın — bussin mi sus mu?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Kod', tab_email: 'E-posta', tab_text: 'Metin',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Kod parçacığı yapıştırın...', ph_email: 'E-postanın tamamını yapıştırın...', ph_text: 'Kontrol için metin yapıştırın...',
    run_check: 'Kontrol et', analyzing: 'Analiz ediliyor...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Yeni kontrol', safety: 'güvenlik', v_bus: 'bu bussin — güvenilir görünüyor', v_sus: 'bu sus — dikkatli olun',
    preview: 'önizleme', score_tab: 'Puan', detailed_tab: 'Detaylı rapor', breakdown: 'döküm', full_report: 'tam rapor', all_findings: 'tüm bulgular',
    green_flags: 'Olumlu işaretler', red_flags: 'Uyarı işaretleri', data_collected: 'Toplanan veriler', trackers: 'Tespit edilen izleyiciler', technologies: 'Teknolojiler', code_notes: 'Kod notları', original_input: 'Orijinal girdi',
    not_found: 'Rapor bulunamadı.', back_home: 'Ana sayfaya dön', footer_rights: 'Tüm hakları saklıdır.', footer_terms: 'Şartlar', footer_privacy: 'Gizlilik',
    share: 'Paylaş', share_copied: 'Bağlantı kopyalandı!', export_pdf: 'PDF dışa aktar', copy_verdict: 'Kararı kopyala', verdict_copied: 'Karar kopyalandı!',
    copy_code: 'Kodu kopyala', code_copied: 'Kopyalandı!', live_preview: 'Canlı site önizlemesi', source_code: 'Kaynak kod', open_site: 'Siteyi aç',
    findings: 'bulgu', safe: 'Güvenli', caution: 'Dikkat', dangerous: 'Tehlikeli',
    terms_title: 'Hizmet şartları', privacy_title: 'Gizlilik politikası', last_updated: 'Son güncelleme', back_to_app: 'Uygulamaya dön',
    iframe_blocked: 'Bazı siteler gömülmeyi engeller — önizleme boşsa yeni sekmede açın.',
    nav_home: 'Ana sayfa', nav_settings: 'Ayarlar'
  },
  sv: {
    badge: 'webbsäkerhetsanalys', tagline: 'Klistra in en länk, HTML, kod, e-post eller text. Få ett omedelbart betyg — är det bussin eller sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Kod', tab_email: 'E-post', tab_text: 'Text',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Klistra in ett kodavsnitt...', ph_email: 'Klistra in hela e-posten...', ph_text: 'Klistra in text att kontrollera...',
    run_check: 'Kontrollera', analyzing: 'Analyserar...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Ny kontroll', safety: 'säkerhet', v_bus: 'det är bussin — verkar legit', v_sus: 'det är sus — var försiktig',
    preview: 'förhandsvisning', score_tab: 'Poäng', detailed_tab: 'Detaljerad rapport', breakdown: 'nedbrytning', full_report: 'fullständig rapport', all_findings: 'alla fynd',
    green_flags: 'Positiva tecken', red_flags: 'Varningssignaler', data_collected: 'Insamlad data', trackers: 'Upptäckta spårare', technologies: 'Teknologier', code_notes: 'Kodanteckningar', original_input: 'Ursprunglig inmatning',
    not_found: 'Rapport hittades inte.', back_home: 'Tillbaka hem', footer_rights: 'Alla rättigheter förbehållna.', footer_terms: 'Villkor', footer_privacy: 'Integritet',
    share: 'Dela', share_copied: 'Länk kopierad!', export_pdf: 'Exportera PDF', copy_verdict: 'Kopiera betyg', verdict_copied: 'Betyg kopierat!',
    copy_code: 'Kopiera kod', code_copied: 'Kopierat!', live_preview: 'Live-förhandsvisning av webbplats', source_code: 'Källkod', open_site: 'Öppna webbplats',
    findings: 'fynd', safe: 'Säkert', caution: 'Försiktighet', dangerous: 'Farligt',
    terms_title: 'Användarvillkor', privacy_title: 'Integritetspolicy', last_updated: 'Senast uppdaterad', back_to_app: 'Tillbaka till appen',
    iframe_blocked: 'Vissa sajter blockerar inbäddning — om förhandsvisningen är tom, öppna i en ny flik.',
    nav_home: 'Hem', nav_settings: 'Inställningar'
  },
  pl: {
    badge: 'analizator bezpieczeństwa web', tagline: 'Wklej link, HTML, kod, e-mail lub tekst. Uzyskaj natychmiastowy werdykt — czy to bussin czy sus?',
    bussin: 'bussin', sus: 'sus', tab_url: 'URL', tab_html: 'HTML', tab_code: 'Kod', tab_email: 'E-mail', tab_text: 'Tekst',
    ph_url: 'https://example.com', ph_html: '<!DOCTYPE html>...', ph_code: 'Wklej fragment kodu...', ph_email: 'Wklej pełną treść e-maila...', ph_text: 'Wklej tekst do sprawdzenia...',
    run_check: 'Sprawdź', analyzing: 'Analizowanie...', shortcut: '⌘/Ctrl + Enter',
    new_check: 'Nowe sprawdzenie', safety: 'bezpieczeństwo', v_bus: 'to bussin — wygląda legit', v_sus: 'to sus — zachowaj ostrożność',
    preview: 'podgląd', score_tab: 'Wynik', detailed_tab: 'Szczegółowy raport', breakdown: 'podział', full_report: 'pełny raport', all_findings: 'wszystkie ustalenia',
    green_flags: 'Pozytywne sygnały', red_flags: 'Sygnały ostrzegawcze', data_collected: 'Zbierane dane', trackers: 'Wykryte trackery', technologies: 'Technologie', code_notes: 'Notatki o kodzie', original_input: 'Oryginalne wejście',
    not_found: 'Raport nie znaleziony.', back_home: 'Powrót do strony', footer_rights: 'Wszelkie prawa zastrzeżone.', footer_terms: 'Warunki', footer_privacy: 'Prywatność',
    share: 'Udostępnij', share_copied: 'Link skopiowany!', export_pdf: 'Eksportuj PDF', copy_verdict: 'Kopiuj werdykt', verdict_copied: 'Werdykt skopiowany!',
    copy_code: 'Kopiuj kod', code_copied: 'Skopiowano!', live_preview: 'Podgląd strony na żywo', source_code: 'Kod źródłowy', open_site: 'Otwórz stronę',
    findings: 'ustaleń', safe: 'Bezpieczne', caution: 'Ostrożnie', dangerous: 'Niebezpieczne',
    terms_title: 'Regulamin usługi', privacy_title: 'Polityka prywatności', last_updated: 'Ostatnia aktualizacja', back_to_app: 'Powrót do aplikacji',
    iframe_blocked: 'Niektóre strony blokują osadzanie — jeśli podgląd jest pusty, otwórz w nowej karcie.',
    nav_home: 'Start', nav_settings: 'Ustawienia'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('susbus_lang') || 'en'; } catch { return 'en'; }
  });

  const changeLang = useCallback((l) => {
    setLang(l);
    try { localStorage.setItem('susbus_lang', l); } catch {}
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  }, [lang]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return { lang: 'en', changeLang: () => {}, t: (k) => translations.en[k] || k };
  }
  return ctx;
}
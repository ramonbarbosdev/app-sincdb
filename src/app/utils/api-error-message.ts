type ApiErrorBody = {
  message?: unknown;
  error?: unknown;
  detalhes?: unknown;
  errors?: unknown;
  resumo?: { mensagem?: unknown };
};

export function extractApiErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (typeof err === 'string' && err.trim()) {
    return humanizeBackendMessage(err.trim());
  }

  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const http = err as { error?: unknown; message?: string };
  const fromBody = readApiErrorBody(http.error);
  if (fromBody) {
    return fromBody;
  }

  if (typeof http.message === 'string' && http.message.trim()) {
    return humanizeBackendMessage(http.message.trim());
  }

  return fallback;
}

function readApiErrorBody(body: unknown): string | null {
  if (typeof body === 'string' && body.trim()) {
    return humanizeBackendMessage(body.trim());
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const payload = body as ApiErrorBody;

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return humanizeBackendMessage(payload.message.trim());
  }

  const resumoMsg = payload.resumo?.mensagem;
  if (typeof resumoMsg === 'string' && resumoMsg.trim()) {
    return humanizeBackendMessage(resumoMsg.trim());
  }

  if (typeof payload.detalhes === 'string' && payload.detalhes.trim()) {
    return humanizeBackendMessage(payload.detalhes.trim());
  }

  if (Array.isArray(payload.errors)) {
    const first = payload.errors.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') {
      return humanizeBackendMessage(first.trim());
    }
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    const raw = payload.error.trim();
    if (!/^erro durante sincroniza/i.test(raw)) {
      return humanizeBackendMessage(stripErroPrefix(raw));
    }
  }

  return null;
}

function stripErroPrefix(value: string): string {
  return value.replace(/^Erro:\s*/i, '').trim();
}

export interface FriendlySyncError {
  title: string;
  description: string;
  technical?: string;
}

export function parseFriendlySyncError(raw: string): FriendlySyncError {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return {
      title: 'Erro na operação',
      description: 'A operação não pôde ser concluída. Tente novamente ou abra o registro para mais detalhes.',
    };
  }

  const technical = trimmed
    .replace(/^Failed to initialize pool:\s*/i, '')
    .replace(/^Erro:\s*/i, '')
    .trim();
  const description = humanizeBackendMessage(trimmed);
  const text = technical.toLowerCase();

  let title = 'Erro na sincronização';
  if (text.includes('role') && text.includes('does not exist')) {
    title = 'Usuário do banco inválido';
  } else if (text.includes('database') && text.includes('does not exist')) {
    title = 'Base de dados não encontrada';
  } else if (
    /^falha na verifica/i.test(trimmed) ||
    /^falha ao verificar/i.test(trimmed) ||
    /nao foi possivel conectar ao banco local/i.test(text)
  ) {
    title = 'Conexão com o banco local';
  } else if (text.includes('password authentication failed')) {
    title = 'Senha ou usuário incorretos';
  } else if (
    text.includes('connection refused') ||
    text.includes('timed out') ||
    text.includes('time out')
  ) {
    title = 'Servidor do banco inacessível';
  }

  const showTechnical =
    !!technical &&
    technical !== description &&
    !description.includes(technical) &&
    /fatal:|exception|failed to initialize/i.test(trimmed);

  return {
    title,
    description,
    technical: showTechnical ? technical : undefined,
  };
}

export function humanizeSyncErrorList(messages: string[] | undefined): string[] {
  if (!messages?.length) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of messages) {
    if (typeof item !== 'string' || !item.trim()) {
      continue;
    }
    const humanized = humanizeBackendMessage(item);
    if (!seen.has(humanized)) {
      seen.add(humanized);
      result.push(humanized);
    }
  }
  return result;
}

export function humanizeBackendMessage(value: string): string {
  const withoutPool = value.replace(/^Failed to initialize pool:\s*/i, '').trim();
  const text = withoutPool.toLowerCase();

  const roleMatch = withoutPool.match(/role "([^"]+)" does not exist/i);
  if (roleMatch || (text.includes('role') && text.includes('does not exist'))) {
    const role = roleMatch?.[1] ?? 'informado';
    return (
      `O usuário "${role}" da conexão não existe no PostgreSQL. ` +
      'Ajuste usuário e senha no cadastro da conexão ou crie esse usuário no servidor.'
    );
  }

  const dbMatch = withoutPool.match(/database "([^"]+)" does not exist/i);
  if (dbMatch || (text.includes('database') && text.includes('does not exist'))) {
    const db = dbMatch?.[1] ?? 'informada';
    return (
      `A base de dados "${db}" não existe no PostgreSQL local. ` +
      'Crie a base ou corrija os dados da conexão local antes de sincronizar.'
    );
  }

  if (/^falha na verifica/i.test(withoutPool) || /^falha ao verificar/i.test(withoutPool)) {
    return (
      'Não foi possível conectar ao banco local ou validar o schema. ' +
      'Confira se a base existe, se o usuário da conexão está correto e se a conexão padrão local está configurada.'
    );
  }

  return stripErroPrefix(withoutPool);
}

export function extractSyncFailureFromPayload(res: unknown): string | null {
  if (!res || typeof res !== 'object') {
    return null;
  }
  const body = res as Record<string, unknown>;
  if (body['sucesso'] !== false && body['sucesso'] !== 'false') {
    return null;
  }
  const msg = extractApiErrorMessage({ error: body }, '');
  return msg && msg !== 'Ocorreu um erro inesperado.' ? msg : null;
}

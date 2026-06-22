import { Request, Response } from 'express';
import { supabase, supabaseAuth } from '../../config/supabase';

export async function register(req: Request, res: Response): Promise<Response> {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Primeiro nome, email e senha sao obrigatorios.',
    });
  }

  // Cria o usuario no Supabase Auth
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  });

  if (createError || !authData.user) {
    return res.status(400).json({
      success: false,
      error: createError?.message ?? 'Nao foi possivel criar o usuario.',
    });
  }

  // O trigger do Supabase cria a linha em public.users de forma sincrona, mas pode
  // demorar alguns ms. Tentamos até 5 vezes com intervalo de 300ms antes de desistir.
  const nomeCompleto = `${first_name}${last_name ? ' ' + last_name : ''}`;
  let profile = null;
  let updateError = null;

  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    await new Promise(r => setTimeout(r, 300));

    const resultado = await supabase
      .from('users')
      .update({ name: nomeCompleto, first_name, last_name: last_name ?? null, display_name: first_name })
      .eq('id', authData.user.id)
      .select('id, first_name, last_name, display_name, role, is_active, phone, avatar_url, created_at')
      .single();

    if (!resultado.error) {
      profile = resultado.data;
      break;
    }

    updateError = resultado.error;
  }

  if (!profile) {
    return res.status(400).json({
      success: false,
      error: updateError?.message ?? 'Erro ao salvar perfil do usuario.',
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        ...profile,
      },
    },
  });
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email e senha sao obrigatorios.',
    });
  }

  // Usa o cliente anon para nao contaminar o estado do cliente service role
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return res.status(401).json({
      success: false,
      error: error?.message ?? 'Email ou senha invalidos.',
    });
  }

  return res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<Response> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Nao autorizado',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Obtemos o userId a partir do token para poder revogar a sessao
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return res.status(401).json({
      success: false,
      error: 'Token invalido.',
    });
  }

  const { error } = await supabase.auth.admin.signOut(userData.user.id);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  return res.json({
    success: true,
    data: { message: 'Logout realizado com sucesso.' },
  });
}

export async function refreshToken(req: Request, res: Response): Promise<Response> {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token e obrigatorio.',
    });
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });

  if (error || !data.session) {
    return res.status(401).json({
      success: false,
      error: error?.message ?? 'Nao foi possivel renovar o token.',
    });
  }

  return res.json({
    success: true,
    data: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}

export async function me(req: Request, res: Response): Promise<Response> {
  // req.user ja foi preenchido pelo authMiddleware
  const user = req.user!;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, first_name, last_name, display_name, username, role, is_active, phone, avatar_url, email_verified_at, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return res.status(400).json({
      success: false,
      error: profileError.message,
    });
  }

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
    },
  });
}

import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

// Tipos de update gerados pelo Supabase
type UserUpdate    = Database['public']['Tables']['users']['Update'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];
type AddressInsert = Database['public']['Tables']['addresses']['Insert'];

// ─────────────────────────────────────────
// PERFIL DO USUÁRIO LOGADO
// ─────────────────────────────────────────

// GET /api/users/me
export async function getCurrentUser(req: Request, res: Response): Promise<Response> {
  const user = req.user!;

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, display_name, username, role, is_active, phone, avatar_url, birth_date, newsletter_opt_in, email_verified_at, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
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

// PATCH /api/users/me
export async function updateCurrentUser(req: Request, res: Response): Promise<Response> {
  const user = req.user!;

  // Apenas esses campos podem ser alterados pelo proprio usuario
  const { first_name, last_name, display_name, username, phone, avatar_url, birth_date, newsletter_opt_in } = req.body;

  const campos: UserUpdate = {};
  if (first_name    !== undefined) campos.first_name       = first_name;
  if (last_name     !== undefined) campos.last_name        = last_name;
  if (display_name  !== undefined) campos.display_name     = display_name;
  if (username      !== undefined) campos.username         = username;
  if (phone         !== undefined) campos.phone            = phone;
  if (avatar_url    !== undefined) campos.avatar_url       = avatar_url;
  if (birth_date    !== undefined) campos.birth_date       = birth_date;
  if (newsletter_opt_in !== undefined) campos.newsletter_opt_in = newsletter_opt_in;

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ success: false, error: 'Nenhum campo valido enviado para atualizacao.' });
  }

  const { data: profile, error } = await supabase
    .from('users')
    .update(campos)
    .eq('id', user.id)
    .select('id, first_name, last_name, display_name, username, role, phone, avatar_url, birth_date, newsletter_opt_in, updated_at')
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
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

// ─────────────────────────────────────────
// ENDEREÇOS DO USUÁRIO LOGADO
// ─────────────────────────────────────────

// GET /api/users/me/addresses
export async function getAddresses(req: Request, res: Response): Promise<Response> {
  const user = req.user!;

  const { data: addresses, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { addresses } });
}

// POST /api/users/me/addresses
export async function createAddress(req: Request, res: Response): Promise<Response> {
  const user = req.user!;

  const {
    label, recipient_name, street, number, complement,
    neighborhood, city, state, zip_code, country,
    address_type, phone_number, reference, instructions, is_default,
  } = req.body;

  // Campos obrigatorios
  if (!street || !number || !neighborhood || !city || !state || !zip_code) {
    return res.status(400).json({
      success: false,
      error: 'Logradouro, numero, bairro, cidade, estado e CEP sao obrigatorios.',
    });
  }

  // Se o novo endereco for padrao, remove o padrao dos outros
  if (is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const novoEndereco: AddressInsert = {
    user_id:        user.id,
    label:          label          ?? null,
    recipient_name: recipient_name ?? null,
    street,
    number,
    complement:     complement     ?? null,
    neighborhood,
    city,
    state,
    zip_code,
    country:        country        ?? 'BR',
    address_type:   address_type   ?? 'RESIDENTIAL',
    phone_number:   phone_number   ?? null,
    reference:      reference      ?? null,
    instructions:   instructions   ?? null,
    is_default:     is_default     ?? false,
  };

  const { data: address, error } = await supabase
    .from('addresses')
    .insert(novoEndereco)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, data: { address } });
}

// PUT /api/users/me/addresses/:id
export async function updateAddress(req: Request, res: Response): Promise<Response> {
  const user = req.user!;
  const { id } = req.params;

  const addressId = parseInt(id, 10);
  if (isNaN(addressId)) {
    return res.status(400).json({ success: false, error: 'ID de endereco invalido.' });
  }

  // Garante que o endereco pertence ao usuario logado
  const { data: existing, error: findError } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', user.id)
    .single();

  if (findError || !existing) {
    return res.status(404).json({ success: false, error: 'Endereco nao encontrado.' });
  }

  const {
    label, recipient_name, street, number, complement,
    neighborhood, city, state, zip_code, country,
    address_type, phone_number, reference, instructions, is_default,
  } = req.body;

  // Se estiver tornando este o padrao, remove o padrao dos outros
  if (is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const campos: AddressUpdate = {};
  if (label          !== undefined) campos.label          = label;
  if (recipient_name !== undefined) campos.recipient_name = recipient_name;
  if (street         !== undefined) campos.street         = street;
  if (number         !== undefined) campos.number         = number;
  if (complement     !== undefined) campos.complement     = complement;
  if (neighborhood   !== undefined) campos.neighborhood   = neighborhood;
  if (city           !== undefined) campos.city           = city;
  if (state          !== undefined) campos.state          = state;
  if (zip_code       !== undefined) campos.zip_code       = zip_code;
  if (country        !== undefined) campos.country        = country;
  if (address_type   !== undefined) campos.address_type   = address_type;
  if (phone_number   !== undefined) campos.phone_number   = phone_number;
  if (reference      !== undefined) campos.reference      = reference;
  if (instructions   !== undefined) campos.instructions   = instructions;
  if (is_default     !== undefined) campos.is_default     = is_default;

  const { data: address, error } = await supabase
    .from('addresses')
    .update(campos)
    .eq('id', addressId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { address } });
}

// DELETE /api/users/me/addresses/:id
export async function deleteAddress(req: Request, res: Response): Promise<Response> {
  const user = req.user!;
  const { id } = req.params;

  const addressId = parseInt(id, 10);
  if (isNaN(addressId)) {
    return res.status(400).json({ success: false, error: 'ID de endereco invalido.' });
  }

  // Garante que o endereco pertence ao usuario logado
  const { data: existing, error: findError } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', user.id)
    .single();

  if (findError || !existing) {
    return res.status(404).json({ success: false, error: 'Endereco nao encontrado.' });
  }

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  return res.json({ success: true, data: { message: 'Endereco removido com sucesso.' } });
}

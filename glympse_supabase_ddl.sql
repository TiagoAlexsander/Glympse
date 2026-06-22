-- ============================================================
-- GLYMPSE — DDL COMPLETO SUPABASE / POSTGRESQL
-- Execute no SQL Editor do Supabase na ordem abaixo
-- ============================================================

-- ============================================================
-- PASSO 1: CRIAR TODOS OS TIPOS ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

CREATE TYPE order_status AS ENUM (
  'PENDING', 'CONFIRMED', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
  'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO', 'WALLET'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PROCESSING', 'APPROVED',
  'FAILED', 'REFUNDED', 'CANCELLED'
);

CREATE TYPE inventory_movement_type AS ENUM (
  'IN', 'OUT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE'
);

CREATE TYPE coupon_type AS ENUM (
  'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'
);


-- ============================================================
-- PASSO 2: TABELA DE USUÁRIOS
-- Referencia auth.users do Supabase (não crie password aqui)
-- ============================================================

CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                VARCHAR(150)    NOT NULL,
  role                user_role       NOT NULL DEFAULT 'USER',
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  phone               VARCHAR(20),
  avatar_url          VARCHAR(500),
  email_verified_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role     ON users (role);
CREATE INDEX idx_users_active   ON users (is_active);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 3: ENDEREÇOS
-- ============================================================

CREATE TABLE addresses (
  id              SERIAL          PRIMARY KEY,
  user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           VARCHAR(50),
  recipient_name  VARCHAR(150)    NOT NULL,
  street          VARCHAR(255)    NOT NULL,
  number          VARCHAR(20)     NOT NULL,
  complement      VARCHAR(100),
  neighborhood    VARCHAR(100)    NOT NULL,
  city            VARCHAR(100)    NOT NULL,
  state           CHAR(2)         NOT NULL,
  zip_code        VARCHAR(10)     NOT NULL,
  country         VARCHAR(50)     NOT NULL DEFAULT 'Brasil',
  is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addr_user ON addresses (user_id);
CREATE INDEX idx_addr_zip  ON addresses (zip_code);

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 4: AUDITORIA
-- ============================================================

CREATE TABLE audit_logs (
  id          BIGSERIAL       PRIMARY KEY,
  user_id     UUID            REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100)    NOT NULL,
  entity      VARCHAR(100)    NOT NULL,
  entity_id   INTEGER,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_al_user    ON audit_logs (user_id);
CREATE INDEX idx_al_entity  ON audit_logs (entity, entity_id);
CREATE INDEX idx_al_action  ON audit_logs (action);
CREATE INDEX idx_al_created ON audit_logs (created_at);


-- ============================================================
-- PASSO 5: CATÁLOGO — CATEGORIAS
-- ============================================================

CREATE TABLE categories (
  id          SERIAL          PRIMARY KEY,
  parent_id   INTEGER         REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(100)    NOT NULL,
  slug        VARCHAR(120)    NOT NULL UNIQUE,
  description TEXT,
  image_url   VARCHAR(500),
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  sort_order  INTEGER         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_parent ON categories (parent_id);
CREATE INDEX idx_cat_active ON categories (is_active);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 6: CATÁLOGO — PRODUTOS
-- ============================================================

CREATE TABLE products (
  id               SERIAL          PRIMARY KEY,
  category_id      INTEGER         NOT NULL REFERENCES categories(id),
  name             VARCHAR(255)    NOT NULL,
  slug             VARCHAR(300)    NOT NULL UNIQUE,
  description      TEXT,
  brand            VARCHAR(100),
  base_price       DECIMAL(10,2)   NOT NULL,
  compare_price    DECIMAL(10,2),
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  is_featured      BOOLEAN         NOT NULL DEFAULT FALSE,
  meta_title       VARCHAR(255),
  meta_description VARCHAR(500),
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prod_category ON products (category_id);
CREATE INDEX idx_prod_active   ON products (is_active);
CREATE INDEX idx_prod_featured ON products (is_featured);

-- Busca textual em português (substitui FULLTEXT do MySQL)
CREATE INDEX idx_prod_search ON products
  USING GIN (
    to_tsvector('portuguese',
      name || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(brand, '')
    )
  );

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 7: IMAGENS DE PRODUTOS
-- ============================================================

CREATE TABLE product_images (
  id          SERIAL          PRIMARY KEY,
  product_id  INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500)    NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INTEGER         NOT NULL DEFAULT 0,
  is_primary  BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pi_product ON product_images (product_id);
CREATE INDEX idx_pi_primary ON product_images (product_id, is_primary);


-- ============================================================
-- PASSO 8: COLEÇÕES
-- ============================================================

CREATE TABLE collections (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(150)    NOT NULL,
  slug        VARCHAR(180)    NOT NULL UNIQUE,
  description TEXT,
  image_url   VARCHAR(500),
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  sort_order  INTEGER         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_col_active ON collections (is_active);
CREATE INDEX idx_col_dates  ON collections (starts_at, ends_at);

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE collection_products (
  id             SERIAL      PRIMARY KEY,
  collection_id  INTEGER     NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id     INTEGER     NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (collection_id, product_id)
);

CREATE INDEX idx_cp_collection ON collection_products (collection_id);
CREATE INDEX idx_cp_product    ON collection_products (product_id);


-- ============================================================
-- PASSO 9: ATRIBUTOS E VARIAÇÕES
-- ============================================================

CREATE TABLE attributes (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(100)    NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


CREATE TABLE attribute_values (
  id            SERIAL        PRIMARY KEY,
  attribute_id  INTEGER       NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value         VARCHAR(100)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (attribute_id, value)
);

CREATE INDEX idx_av_attribute ON attribute_values (attribute_id);


CREATE TABLE product_variants (
  id          SERIAL          PRIMARY KEY,
  product_id  INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         VARCHAR(100)    NOT NULL UNIQUE,
  price       DECIMAL(10,2),
  weight      DECIMAL(8,3),
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_var_product ON product_variants (product_id);
CREATE INDEX idx_var_active  ON product_variants (is_active);

CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE product_variant_attributes (
  id                  SERIAL    PRIMARY KEY,
  variant_id          INTEGER   NOT NULL REFERENCES product_variants(id)  ON DELETE CASCADE,
  attribute_value_id  INTEGER   NOT NULL REFERENCES attribute_values(id),
  UNIQUE (variant_id, attribute_value_id)
);

CREATE INDEX idx_pva_variant   ON product_variant_attributes (variant_id);
CREATE INDEX idx_pva_attr_val  ON product_variant_attributes (attribute_value_id);


-- ============================================================
-- PASSO 10: ESTOQUE
-- ============================================================

CREATE TABLE inventory (
  id                  SERIAL    PRIMARY KEY,
  variant_id          INTEGER   NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity            INTEGER   NOT NULL DEFAULT 0,
  reserved_quantity   INTEGER   NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER   NOT NULL DEFAULT 5,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_qty ON inventory (quantity);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE inventory_movements (
  id              BIGSERIAL                 PRIMARY KEY,
  variant_id      INTEGER                   NOT NULL REFERENCES product_variants(id),
  type            inventory_movement_type   NOT NULL,
  quantity        INTEGER                   NOT NULL,
  reason          VARCHAR(255),
  reference_type  VARCHAR(50),
  reference_id    INTEGER,
  created_by      UUID                      REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_im_variant  ON inventory_movements (variant_id);
CREATE INDEX idx_im_type     ON inventory_movements (type);
CREATE INDEX idx_im_ref      ON inventory_movements (reference_type, reference_id);
CREATE INDEX idx_im_created  ON inventory_movements (created_at);


-- ============================================================
-- PASSO 11: CUPONS (OPCIONAL)
-- ============================================================

CREATE TABLE coupons (
  id                  SERIAL          PRIMARY KEY,
  code                VARCHAR(50)     NOT NULL UNIQUE,
  description         VARCHAR(255),
  type                coupon_type     NOT NULL,
  value               DECIMAL(10,2)   NOT NULL,
  min_order_amount    DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  max_uses            INTEGER,
  max_uses_per_user   INTEGER         NOT NULL DEFAULT 1,
  uses_count          INTEGER         NOT NULL DEFAULT 0,
  starts_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coup_active  ON coupons (is_active);
CREATE INDEX idx_coup_expires ON coupons (expires_at);

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 12: CARRINHO
-- ============================================================

CREATE TABLE carts (
  id          SERIAL          PRIMARY KEY,
  user_id     UUID            UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(255),
  coupon_id   INTEGER         REFERENCES coupons(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_session ON carts (session_id);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE cart_items (
  id          SERIAL          PRIMARY KEY,
  cart_id     INTEGER         NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id  INTEGER         NOT NULL REFERENCES product_variants(id),
  quantity    INTEGER         NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2)   NOT NULL,
  added_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX idx_ci_cart    ON cart_items (cart_id);
CREATE INDEX idx_ci_variant ON cart_items (variant_id);


-- ============================================================
-- PASSO 13: WISHLIST
-- ============================================================

CREATE TABLE wishlists (
  id          SERIAL          PRIMARY KEY,
  user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100)    NOT NULL DEFAULT 'Minha Lista',
  is_public   BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wl_user ON wishlists (user_id);

CREATE TRIGGER trg_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE wishlist_items (
  id           SERIAL      PRIMARY KEY,
  wishlist_id  INTEGER     NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  variant_id   INTEGER     NOT NULL REFERENCES product_variants(id),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wishlist_id, variant_id)
);

CREATE INDEX idx_wi_wishlist ON wishlist_items (wishlist_id);


-- ============================================================
-- PASSO 14: PEDIDOS
-- ============================================================

CREATE TABLE orders (
  id                          SERIAL        PRIMARY KEY,
  user_id                     UUID          NOT NULL REFERENCES users(id),
  address_id                  INTEGER       REFERENCES addresses(id) ON DELETE SET NULL,
  shipping_address_snapshot   JSONB         NOT NULL,
  coupon_id                   INTEGER       REFERENCES coupons(id) ON DELETE SET NULL,
  status                      order_status  NOT NULL DEFAULT 'PENDING',
  subtotal                    DECIMAL(10,2) NOT NULL,
  discount_amount             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_cost               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total                       DECIMAL(10,2) NOT NULL,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ord_user    ON orders (user_id);
CREATE INDEX idx_ord_status  ON orders (status);
CREATE INDEX idx_ord_created ON orders (created_at);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE order_items (
  id                  SERIAL          PRIMARY KEY,
  order_id            INTEGER         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id          INTEGER         REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name        VARCHAR(255)    NOT NULL,
  variant_sku         VARCHAR(100)    NOT NULL,
  variant_attributes  JSONB,
  product_image_url   VARCHAR(500),
  quantity            INTEGER         NOT NULL,
  unit_price          DECIMAL(10,2)   NOT NULL,
  total_price         DECIMAL(10,2)   NOT NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oi_order   ON order_items (order_id);
CREATE INDEX idx_oi_variant ON order_items (variant_id);


CREATE TABLE order_status_history (
  id          SERIAL        PRIMARY KEY,
  order_id    INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status  NOT NULL,
  changed_by  UUID          REFERENCES users(id) ON DELETE SET NULL,
  notes       VARCHAR(500),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_osh_order   ON order_status_history (order_id);
CREATE INDEX idx_osh_created ON order_status_history (created_at);


-- ============================================================
-- PASSO 15: PAGAMENTOS
-- ============================================================

CREATE TABLE payments (
  id                      SERIAL          PRIMARY KEY,
  order_id                INTEGER         NOT NULL REFERENCES orders(id),
  method                  payment_method  NOT NULL,
  status                  payment_status  NOT NULL DEFAULT 'PENDING',
  amount                  DECIMAL(10,2)   NOT NULL,
  currency                CHAR(3)         NOT NULL DEFAULT 'BRL',
  gateway                 VARCHAR(50),
  gateway_transaction_id  VARCHAR(255),
  gateway_response        JSONB,
  paid_at                 TIMESTAMPTZ,
  refunded_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pay_order      ON payments (order_id);
CREATE INDEX idx_pay_status     ON payments (status);
CREATE INDEX idx_pay_gateway_tx ON payments (gateway_transaction_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PASSO 16: CUPONS — USOS (OPCIONAL)
-- ============================================================

CREATE TABLE coupon_usages (
  id          SERIAL      PRIMARY KEY,
  coupon_id   INTEGER     NOT NULL REFERENCES coupons(id),
  user_id     UUID        NOT NULL REFERENCES users(id),
  order_id    INTEGER     NOT NULL REFERENCES orders(id),
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cu_coupon ON coupon_usages (coupon_id);
CREATE INDEX idx_cu_user   ON coupon_usages (user_id);
CREATE INDEX idx_cu_order  ON coupon_usages (order_id);


-- ============================================================
-- PASSO 17: AVALIAÇÕES (OPCIONAL)
-- ============================================================

CREATE TABLE reviews (
  id             SERIAL        PRIMARY KEY,
  product_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id        UUID          NOT NULL REFERENCES users(id),
  order_item_id  INTEGER       REFERENCES order_items(id) ON DELETE SET NULL,
  rating         SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title          VARCHAR(255),
  body           TEXT,
  is_approved    BOOLEAN       NOT NULL DEFAULT FALSE,
  approved_by    UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_rev_product  ON reviews (product_id);
CREATE INDEX idx_rev_approved ON reviews (is_approved);
CREATE INDEX idx_rev_rating   ON reviews (rating);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE review_images (
  id          SERIAL        PRIMARY KEY,
  review_id   INTEGER       NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url         VARCHAR(500)  NOT NULL,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ri_review ON review_images (review_id);


-- ============================================================
-- PASSO 18: TRIGGER PARA CRIAR users AUTOMATICAMENTE
-- Quando alguém se cadastra pela auth do Supabase,
-- este trigger cria o registro na tabela users automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- FIM DO SCRIPT
-- Total: 24 tabelas + 1 função de trigger de auth
-- ============================================================

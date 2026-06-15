-- =====================================================
-- ESQUEMA: App de control de deudas personales
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- -----------------------------------------------------
-- Catálogo de tipos de deuda
-- -----------------------------------------------------
create table tipos_deuda (
  id serial primary key,
  nombre text not null unique
);

insert into tipos_deuda (nombre) values
  ('aplicacion'),
  ('nomina'),
  ('tarjeta_credito'),
  ('institucion'),
  ('personas'),
  ('pasaje');

-- -----------------------------------------------------
-- Catálogo de instituciones
-- -----------------------------------------------------
create table instituciones (
  id serial primary key,
  nombre text not null unique,
  frecuencia_pago text not null  -- semanal, quincenal, mensual, variable
);

insert into instituciones (nombre, frecuencia_pago) values
  ('Coopel', 'mensual'),
  ('Elektra', 'semanal'),
  ('Mercado Libre', 'mensual');

-- -----------------------------------------------------
-- Tabla principal de deudas
-- -----------------------------------------------------
create table deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  tipo_deuda_id integer not null references tipos_deuda(id),
  institucion_id integer references instituciones(id),
  nombre text not null,

  total_a_pagar numeric(12,2) not null default 0,
  estatus text not null default 'activa', -- activa | finalizada

  -- Fechas / días de pago (solo se llena el que aplique)
  fecha_pago_fija integer,        -- día del mes 1-31 (apps, ML, TDC)
  dia_semana_pago integer,        -- 0-6 (Elektra)
  dia_quincena_pago jsonb,        -- array de días del mes (Coopel, nómina)
  fecha_corte integer,            -- día del mes, solo TDC
  promesa_pago date,              -- solo personas

  -- Plazo pactado (Elektra semanas, Coopel meses, etc.)
  plazo_total integer,
  plazo_pagado integer not null default 0,

  fecha_creacion timestamptz not null default now(),
  fecha_finalizacion timestamptz,
  notas text,

  constraint chk_estatus check (estatus in ('activa', 'finalizada')),
  constraint chk_dia_semana check (dia_semana_pago is null or (dia_semana_pago between 0 and 6)),
  constraint chk_fecha_pago_fija check (fecha_pago_fija is null or (fecha_pago_fija between 1 and 31)),
  constraint chk_fecha_corte check (fecha_corte is null or (fecha_corte between 1 and 31)),
  constraint chk_plazo check (plazo_pagado >= 0 and (plazo_total is null or plazo_pagado <= plazo_total))
);

create index idx_deudas_user on deudas(user_id);
create index idx_deudas_tipo on deudas(tipo_deuda_id);
create index idx_deudas_institucion on deudas(institucion_id);
create index idx_deudas_estatus on deudas(estatus);

-- -----------------------------------------------------
-- Histórico de pagos
-- -----------------------------------------------------
create table historico_pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  deuda_id uuid not null references deudas(id) on delete cascade,
  monto numeric(12,2) not null,
  fecha_pago timestamptz not null default now(),
  tipo_pago text not null default 'no_especificado', -- capital | interes | total | no_especificado
  notas text,

  constraint chk_tipo_pago check (tipo_pago in ('capital', 'interes', 'total', 'no_especificado'))
);

create index idx_pagos_user on historico_pagos(user_id);
create index idx_pagos_deuda on historico_pagos(deuda_id);
create index idx_pagos_fecha on historico_pagos(fecha_pago);

-- -----------------------------------------------------
-- Trigger: incrementar plazo_pagado al registrar un pago
-- (solo si la deuda tiene plazo_total definido)
-- -----------------------------------------------------
create or replace function incrementar_plazo()
returns trigger as $$
begin
  update deudas
  set plazo_pagado = plazo_pagado + 1
  where id = new.deuda_id
    and plazo_total is not null
    and plazo_pagado < plazo_total;

  -- Si llegó al límite del plazo, marcar como finalizada automáticamente
  update deudas
  set estatus = 'finalizada',
      fecha_finalizacion = now()
  where id = new.deuda_id
    and plazo_total is not null
    and plazo_pagado >= plazo_total
    and estatus = 'activa';

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_incrementar_plazo
after insert on historico_pagos
for each row
execute function incrementar_plazo();

-- -----------------------------------------------------
-- Row Level Security: cada usuario solo ve sus datos
-- -----------------------------------------------------
alter table deudas enable row level security;
alter table historico_pagos enable row level security;

create policy "Usuarios ven sus propias deudas"
  on deudas for select
  using (auth.uid() = user_id);

create policy "Usuarios crean sus propias deudas"
  on deudas for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus propias deudas"
  on deudas for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan sus propias deudas"
  on deudas for delete
  using (auth.uid() = user_id);

create policy "Usuarios ven su propio historico"
  on historico_pagos for select
  using (auth.uid() = user_id);

create policy "Usuarios crean su propio historico"
  on historico_pagos for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan su propio historico"
  on historico_pagos for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan su propio historico"
  on historico_pagos for delete
  using (auth.uid() = user_id);

-- Catálogos: lectura pública (son los mismos para todos)
alter table tipos_deuda enable row level security;
alter table instituciones enable row level security;

create policy "Catalogo tipos_deuda lectura publica"
  on tipos_deuda for select
  using (true);

create policy "Catalogo instituciones lectura publica"
  on instituciones for select
  using (true);

-- -----------------------------------------------------
-- Publicación para PowerSync (replicación lógica)
-- -----------------------------------------------------
create publication powersync for table
  deudas,
  historico_pagos,
  tipos_deuda,
  instituciones;

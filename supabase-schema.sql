-- Ejecuta esto en Supabase > SQL Editor

create table registros (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null check (tipo in ('normal', 'descanso')),
  monto integer not null default 0,
  medio text check (medio in ('nequi', 'efectivo', 'banco')),
  estado text check (estado in ('espera', 'pagado', 'rechazado')),
  foto_url text,
  nota text,
  created_at timestamptz default now()
);

-- Índice por fecha
create index on registros (fecha);

-- Habilitar realtime
alter publication supabase_realtime add table registros;

-- Row Level Security: acceso público (la app controla con PIN)
alter table registros enable row level security;
create policy "acceso_publico" on registros for all using (true) with check (true);

-- Bucket para fotos de comprobantes
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true);
create policy "fotos_publicas" on storage.objects for all using (bucket_id = 'fotos') with check (bucket_id = 'fotos');

-- Configuración del taxi (fecha de inicio y cuota diaria)
create table config (
  id text primary key default 'default',
  fecha_inicio date not null,
  cuota_diaria integer not null default 75000,
  created_at timestamptz default now()
);

alter table config enable row level security;
create policy "config_publica" on config for all using (true) with check (true);
alter publication supabase_realtime add table config;

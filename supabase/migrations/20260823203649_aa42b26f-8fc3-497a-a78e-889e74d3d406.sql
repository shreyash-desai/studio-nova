CREATE TYPE public.txn_type AS ENUM ('received','used','printed','sold','return');
CREATE TYPE public.unit_type AS ENUM ('kg','g','pcs','metres','rolls','sets');

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  size text,
  variant text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_unit public.unit_type NOT NULL DEFAULT 'pcs',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty numeric NOT NULL DEFAULT 0,
  unit public.unit_type NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, material_id)
);
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'staff',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.txn_seq;
CREATE SEQUENCE public.rev_seq;

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  type public.txn_type NOT NULL,
  occurred_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  qty numeric NOT NULL,
  unit public.unit_type,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number text,
  unit_price numeric,
  reason text,
  condition text,
  notes text,
  reversal_of uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  edited boolean NOT NULL DEFAULT false,
  voided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_occurred_on_idx ON public.transactions (occurred_on DESC);
CREATE INDEX transactions_type_idx ON public.transactions (type);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);

GRANT ALL ON public.products, public.materials, public.channels, public.customers,
  public.bom_lines, public.operators, public.transactions, public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.txn_seq, public.rev_seq TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.products (sku,name,size) VALUES
('AERO-L','Aero L','L'),
('AERO-M','Aero M','M'),
('AERO-S','Aero S','S'),
('ARCOT','Arcot',NULL),
('ARKO','Arko',NULL),
('BETTY','Betty',NULL),
('CAPRI','Capri',NULL),
('CARLA','Carla',NULL),
('CARLA-M','Carla M','M'),
('CARLA-S','Carla S','S'),
('CLARA-L','Clara L','L'),
('CLARA-S','Clara S','S'),
('CORA-L','Cora L','L'),
('CORA-S','Cora S','S'),
('DELFINA-S','Delfina S','S'),
('DORIA','Doria',NULL),
('EVE','Eve',NULL),
('EVE-M','Eve M','M'),
('EVE-WALL','Eve Wall',NULL),
('ISOLA-L','Isola L','L'),
('JOSEFINA','Josefina',NULL),
('JOSEFINA-L','Josefina L','L'),
('JOSEFINA-S','Josefina S','S'),
('LARISA-L','Larisa L','L'),
('LEO','Leo',NULL),
('LEO-M','Leo M','M'),
('LOLA','Lola',NULL),
('MALIBU-L','Malibu L','L'),
('MALIBU-WIRELESS','Malibu Wireless',NULL),
('MARINA-L','Marina L','L'),
('MARINA-S','Marina S','S'),
('MARISA','Marisa',NULL),
('MARISA-L','Marisa L','L'),
('MICONO','Micono',NULL),
('MITSU','Mitsu',NULL),
('OFELIA','Ofelia',NULL),
('OFELIA-L','Ofelia L','L'),
('OVO','Ovo',NULL),
('OVO-S','Ovo S','S'),
('REGA-L','Rega L','L'),
('REGA-S','Rega S','S'),
('SARA-S','Sara S','S'),
('SEAMLESS-L','Seamless L','L'),
('SPRINGY','Springy',NULL),
('SPRINGY-M','Springy M','M'),
('SQUARE-LAMP','Square Lamp',NULL),
('TIARA-L','Tiara L','L'),
('VALO','Valo',NULL),
('VELIA','Velia',NULL),
('WAVY','Wavy',NULL),
('WAVY-L','Wavy L','L'),
('YOTSU','Yotsu',NULL);

INSERT INTO public.materials (name,default_unit) VALUES
('DP White','rolls'),
('E Black','rolls'),
('E Bronze','rolls'),
('E White','rolls'),
('Ivory','rolls'),
('J Wood','pcs'),
('Light Grey','rolls'),
('Light Holders','pcs'),
('N Apricot','rolls'),
('N Apricot Skin','rolls'),
('N Atomic Pink','rolls'),
('N Black','rolls'),
('N Green','rolls'),
('N Grey','rolls'),
('N Imperial Red','rolls'),
('N Ivory','rolls'),
('N Lemon Yellow','rolls'),
('N Light Grey','rolls'),
('N Lilac','rolls'),
('N Orange','rolls'),
('N Pitch Black','rolls'),
('N Ryobix Green','rolls'),
('N Terracotta','rolls'),
('N Transparent','rolls'),
('N White','rolls'),
('N White PETG','rolls'),
('N White Shrish','rolls'),
('N Wood','rolls'),
('N Yellow','rolls'),
('Switch Cable','pcs'),
('Wood','pcs');

INSERT INTO public.channels (name) VALUES
('Amazon'),
('B2B'),
('Claymango'),
('Flipkart'),
('PF / Pepperfry'),
('Pasolite');

INSERT INTO public.customers (name) VALUES
('Activestar'),
('Amazon'),
('Chennai'),
('Claymango'),
('Dr Laxman'),
('Flipkart'),
('Mankush Lights'),
('PF / Pepperfry'),
('Pasolite'),
('Philips'),
('Prakash Elec'),
('R Green'),
('Rushabh'),
('Rushabh Marketing'),
('Siva Sakthi'),
('Sugam'),
('Unornamented'),
('Vibgyor'),
('Wood');

INSERT INTO public.operators (name, role) VALUES ('Admin','admin');
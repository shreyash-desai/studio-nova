-- Migration: Add dispatch sent, return, photo_url and ensure 5 online categories exist

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS tick_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tick_return boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_url text;

-- Ensure the 5 Online Categories exist in channels:
INSERT INTO public.channels (name) VALUES
('Amazon'),
('Pepperfry'),
('Flipkart'),
('Claymango'),
('Website')
ON CONFLICT (name) DO NOTHING;


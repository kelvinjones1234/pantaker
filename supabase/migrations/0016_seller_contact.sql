-- Seller contact details.
--
-- Optional, profile-wide contact information that sellers choose to publish on
-- their listings. The phone number is free text by product decision; handles are
-- validated in the application before they are stored.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists phone_is_whatsapp boolean not null default false,
  add column if not exists instagram_handle text,
  add column if not exists x_handle text,
  add column if not exists facebook_handle text,
  add column if not exists tiktok_handle text;

do $$
begin
  alter table public.profiles
    add constraint profiles_phone_length
    check (phone is null or char_length(phone) <= 32);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_phone_whatsapp_requires_phone
    check (not phone_is_whatsapp or phone is not null);
exception
  when duplicate_object then null;
end $$;

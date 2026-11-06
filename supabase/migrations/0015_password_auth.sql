-- Password authentication.
--
-- Sign-up verifies the email with a one-time code and stores a password hash on
-- the user. Sign-in then uses email + password only. The pending sign-up hash is
-- held on the login_otps row so a plaintext password is never re-sent.

alter table public.users
  add column if not exists password_hash text;

alter table public.login_otps
  add column if not exists password_hash text;

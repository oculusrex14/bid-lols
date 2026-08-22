alter table listings add column if not exists socials jsonb not null default '[]'::jsonb;

update listings set socials = '["https://x.com/amirachen","https://www.linkedin.com/in/jonasveld","https://northstarlabs.com"]'::jsonb
where id = 'lst_fb_01' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/leopark","https://www.linkedin.com/in/sanaidris"]'::jsonb
where id = 'lst_fb_02' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/mayakite","https://www.linkedin.com/in/owenhale","https://kiteandco.com"]'::jsonb
where id = 'lst_fb_03' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/noahellison","https://tessokada.com"]'::jsonb
where id = 'lst_fb_04' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/ibrahimnoor","https://www.linkedin.com/in/clairevoss","https://harborprotocol.xyz"]'::jsonb
where id = 'lst_fb_05' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/helenaruiz","https://vesper.club"]'::jsonb
where id = 'lst_fb_06' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/chrislang","https://www.linkedin.com/in/yunachoi"]'::jsonb
where id = 'lst_fb_07' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/adamoreau","https://secondform.co"]'::jsonb
where id = 'lst_fb_08' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/ruthadler","https://palefire.press"]'::jsonb
where id = 'lst_fb_09' and socials = '[]'::jsonb;

update listings set socials = '["https://x.com/gabenilsen","https://www.linkedin.com/in/marenholt"]'::jsonb
where id = 'lst_fb_10' and socials = '[]'::jsonb;

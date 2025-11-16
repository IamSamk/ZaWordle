-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Rename users table to profiles if it exists
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'users') then
    alter table public.users rename to profiles;
  else
    -- Create profiles table if it doesn't exist
    create table public.profiles (
      id uuid references auth.users on delete cascade primary key,
      username text unique not null,
      email text unique not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20)
    );
  end if;
end $$;

-- Add updated_at column if it doesn't exist
alter table public.profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Add username format constraint if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'username_format' 
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint username_format check (username ~ '^[a-zA-Z0-9_]+$');
  end if;
end $$;

-- Create or update daily_streaks table
do $$
begin
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'daily_streaks') then
    create table public.daily_streaks (
      id uuid default uuid_generate_v4() primary key,
      user_id uuid references public.profiles(id) on delete cascade not null,
      current_streak integer default 0 not null,
      longest_streak integer default 0 not null,
      last_played_date date,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
      unique(user_id)
    );
  else
    -- Update existing daily_streaks table
    alter table public.daily_streaks add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
    alter table public.daily_streaks rename column last_played to last_played_date;
    
    -- Drop old constraint if exists and add new one
    alter table public.daily_streaks drop constraint if exists one_streak_per_user;
    alter table public.daily_streaks add constraint daily_streaks_user_id_key unique(user_id);
  end if;
exception
  when duplicate_column then null;
  when undefined_column then null;
end $$;

-- Create or update blitz_scores table
do $$
begin
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'blitz_scores') then
    create table public.blitz_scores (
      id uuid default uuid_generate_v4() primary key,
      user_id uuid references public.profiles(id) on delete cascade not null,
      difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
      best_time integer not null,
      times_achieved integer default 1 not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
      unique(user_id, difficulty)
    );
  else
    -- Update existing blitz_scores table
    alter table public.blitz_scores add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
    alter table public.blitz_scores add column if not exists times_achieved integer default 1 not null;
    alter table public.blitz_scores drop column if exists word;
    alter table public.blitz_scores drop column if exists attempt_count;
    
    -- Add unique constraint if it doesn't exist
    do $inner$
    begin
      if not exists (
        select 1 from pg_constraint 
        where conname = 'blitz_scores_user_id_difficulty_key' 
        and conrelid = 'public.blitz_scores'::regclass
      ) then
        alter table public.blitz_scores add constraint blitz_scores_user_id_difficulty_key unique(user_id, difficulty);
      end if;
    end $inner$;
  end if;
exception
  when duplicate_column then null;
  when undefined_column then null;
end $$;

-- Create or update speedrun_scores table
do $$
begin
  -- Drop policies that depend on columns we're about to remove
  drop policy if exists "Anyone can view completed speedrun scores (for leaderboards)" on public.speedrun_scores;
  drop policy if exists "Users can insert their own speedrun scores" on public.speedrun_scores;
  drop policy if exists "Users can view all their own speedrun scores" on public.speedrun_scores;
  
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'speedrun_scores') then
    create table public.speedrun_scores (
      id uuid default uuid_generate_v4() primary key,
      user_id uuid references public.profiles(id) on delete cascade not null,
      difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
      timer_duration integer not null check (timer_duration in (60, 180, 300)),
      word_count integer not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      constraint speedrun_scores_user_difficulty_timer unique(user_id, difficulty, timer_duration)
    );
  else
    -- Update existing speedrun_scores table
    alter table public.speedrun_scores drop column if exists completion_time cascade;
    alter table public.speedrun_scores drop column if exists completed cascade;
    
    -- Add timer_duration constraint if it doesn't exist
    do $inner$
    begin
      if not exists (
        select 1 from pg_constraint 
        where conname = 'speedrun_scores_timer_duration_check' 
        and conrelid = 'public.speedrun_scores'::regclass
      ) then
        alter table public.speedrun_scores add constraint speedrun_scores_timer_duration_check check (timer_duration in (60, 180, 300));
      end if;
    end $inner$;
    
    -- Add unique constraint if it doesn't exist
    do $inner$
    begin
      if not exists (
        select 1 from pg_constraint 
        where conname = 'speedrun_scores_user_difficulty_timer' 
        and conrelid = 'public.speedrun_scores'::regclass
      ) then
        alter table public.speedrun_scores add constraint speedrun_scores_user_difficulty_timer unique(user_id, difficulty, timer_duration);
      end if;
    end $inner$;
  end if;
exception
  when duplicate_column then null;
  when undefined_column then null;
end $$;

-- Create indexes for leaderboard queries (drop old ones first)
drop index if exists public.idx_blitz_scores_user_difficulty;
drop index if exists public.idx_speedrun_scores_user_difficulty;
drop index if exists public.idx_speedrun_scores_leaderboard;

create index if not exists speedrun_scores_leaderboard_idx on public.speedrun_scores(difficulty, timer_duration, word_count desc);
create index if not exists blitz_scores_leaderboard_idx on public.blitz_scores(difficulty, best_time asc);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.daily_streaks enable row level security;
alter table public.blitz_scores enable row level security;
alter table public.speedrun_scores enable row level security;

-- Profiles policies (drop old ones and recreate)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Daily streaks policies (drop old ones and recreate)
drop policy if exists "Users can view their own streaks" on public.daily_streaks;
drop policy if exists "Users can insert their own streaks" on public.daily_streaks;
drop policy if exists "Users can update their own streaks" on public.daily_streaks;
drop policy if exists "Users can view own streak" on public.daily_streaks;
drop policy if exists "Users can update own streak" on public.daily_streaks;
drop policy if exists "Users can insert own streak" on public.daily_streaks;

create policy "Users can view own streak" on public.daily_streaks
  for select using (auth.uid() = user_id);

create policy "Users can update own streak" on public.daily_streaks
  for update using (auth.uid() = user_id);

create policy "Users can insert own streak" on public.daily_streaks
  for insert with check (auth.uid() = user_id);

-- Blitz scores policies (drop old ones and recreate)
drop policy if exists "Users can view their own blitz scores" on public.blitz_scores;
drop policy if exists "Users can insert their own blitz scores" on public.blitz_scores;
drop policy if exists "Blitz scores are viewable by everyone" on public.blitz_scores;
drop policy if exists "Users can insert own blitz scores" on public.blitz_scores;
drop policy if exists "Users can update own blitz scores" on public.blitz_scores;

create policy "Blitz scores are viewable by everyone" on public.blitz_scores
  for select using (true);

create policy "Users can insert own blitz scores" on public.blitz_scores
  for insert with check (auth.uid() = user_id);

create policy "Users can update own blitz scores" on public.blitz_scores
  for update using (auth.uid() = user_id);

-- Speedrun scores policies (drop old ones and recreate)
drop policy if exists "Speedrun scores are viewable by everyone" on public.speedrun_scores;
drop policy if exists "Users can insert own speedrun scores" on public.speedrun_scores;
drop policy if exists "Users can update own speedrun scores" on public.speedrun_scores;

create policy "Speedrun scores are viewable by everyone" on public.speedrun_scores
  for select using (true);

create policy "Users can insert own speedrun scores" on public.speedrun_scores
  for insert with check (auth.uid() = user_id);

create policy "Users can update own speedrun scores" on public.speedrun_scores
  for update using (auth.uid() = user_id);

-- Function to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at (drop and recreate)
drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_daily_streaks_updated_at on public.daily_streaks;
create trigger handle_daily_streaks_updated_at before update on public.daily_streaks
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_blitz_scores_updated_at on public.blitz_scores;
create trigger handle_blitz_scores_updated_at before update on public.blitz_scores
  for each row execute procedure public.handle_updated_at();

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  
  insert into public.daily_streaks (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup (drop and recreate)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cleanup function for old speedrun scores (keep only last 5 per user)
create or replace function cleanup_old_speedrun_scores()
returns trigger as $$
begin
  delete from public.speedrun_scores
  where id in (
    select id from public.speedrun_scores
    where user_id = NEW.user_id
    order by word_count desc, created_at desc
    offset 5
  );
  return NEW;
end;
$$ language plpgsql;

-- Trigger to cleanup old speedrun scores (drop and recreate)
drop trigger if exists cleanup_speedrun_scores_trigger on public.speedrun_scores;
create trigger cleanup_speedrun_scores_trigger
  after insert on public.speedrun_scores
  for each row execute procedure cleanup_old_speedrun_scores();

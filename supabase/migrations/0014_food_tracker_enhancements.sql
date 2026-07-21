-- Food tracker deep enhancements: richer custom foods, favorites, recently
-- eaten (derived from food_logs, no new table), meal templates, recipes.

alter table public.foods
  add column sugar_g numeric not null default 0,
  add column sodium_mg numeric not null default 0,
  add column weight_g numeric,
  add column default_meal_type text
    check (default_meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drink'));

alter table public.food_logs
  add column sugar_g numeric not null default 0,
  add column sodium_mg numeric not null default 0;

-- Recipes are just foods rows (so they can be logged like any other food),
-- composed from other foods via recipe_ingredients.
alter table public.foods
  drop constraint foods_source_check,
  add constraint foods_source_check check (source in ('usda', 'custom', 'recipe'));

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_food_id uuid not null references public.foods(id) on delete cascade,
  ingredient_food_id uuid references public.foods(id) on delete set null,
  quantity numeric not null default 1,
  sort_order integer not null default 0
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_food_id);

alter table public.recipe_ingredients enable row level security;
create policy "recipe_ingredients_all_via_recipe" on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.foods f
      where f.id = recipe_ingredients.recipe_food_id and f.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.foods f
      where f.id = recipe_ingredients.recipe_food_id and f.created_by = auth.uid()
    )
  );

create table public.user_favorite_foods (
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

alter table public.user_favorite_foods enable row level security;
create policy "user_favorite_foods_all_own" on public.user_favorite_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;
create policy "meal_templates_all_own" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  quantity numeric not null default 1,
  sort_order integer not null default 0
);

create index meal_template_items_template_idx on public.meal_template_items (template_id);

alter table public.meal_template_items enable row level security;
create policy "meal_template_items_all_via_template" on public.meal_template_items
  for all using (
    exists (
      select 1 from public.meal_templates mt
      where mt.id = meal_template_items.template_id and mt.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_templates mt
      where mt.id = meal_template_items.template_id and mt.user_id = auth.uid()
    )
  );

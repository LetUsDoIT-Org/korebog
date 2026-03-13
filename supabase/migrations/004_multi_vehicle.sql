-- Add vehicle_id to favorite_trips so each saved route can be associated with a specific car
alter table favorite_trips
  add column vehicle_id uuid references vehicles(id) on delete set null;

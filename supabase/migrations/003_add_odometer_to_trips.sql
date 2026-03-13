-- Add odometer start/end readings to trips for SKAT documentation
alter table trips add column odometer_start_km integer;
alter table trips add column odometer_end_km integer;

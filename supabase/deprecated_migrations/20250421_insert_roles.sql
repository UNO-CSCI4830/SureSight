-- Insert standard roles for SureSight application
INSERT INTO roles (id, name)
VALUES 
  (uuid_generate_v4(), 'Homeowner'),
  (uuid_generate_v4(), 'Contractor'),
  (uuid_generate_v4(), 'Adjuster'),
  (uuid_generate_v4(), 'Admin');
# Generated Database Schema Reference

## activities
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **user_id**: `uuid`, NOT NULL, FK → `users(id)`
- **report_id**: `uuid`, NULL, FK → `reports(id)`
- **activity_type**: `text`, NOT NULL
- **details**: `jsonb`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## adjuster_profiles
- **id**: `uuid`, NOT NULL, PRIMARY KEY, FK → `profiles(id)`
- **company_name**: `text`, NOT NULL
- **adjuster_license**: `text`, NULL
- **territories**: `ARRAY`, NULL
- **certification_verified**: `boolean`, NULL, DEFAULT `false`

## app_settings
- **key**: `text`, NOT NULL, PRIMARY KEY
- **value**: `text`, NOT NULL
- **description**: `text`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## assessment_areas
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **report_id**: `uuid`, NOT NULL, FK → `reports(id)`
- **damage_type**: `USER-DEFINED`, NOT NULL
- **location**: `text`, NOT NULL
- **severity**: `USER-DEFINED`, NOT NULL
- **dimensions**: `text`, NULL
- **notes**: `text`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## comments
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **report_id**: `uuid`, NOT NULL, FK → `reports(id)`
- **user_id**: `uuid`, NOT NULL, FK → `users(id)`
- **content**: `text`, NOT NULL
- **parent_id**: `uuid`, NULL, FK → `comments(id)`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## contractor_profiles
- **id**: `uuid`, NOT NULL, PRIMARY KEY, FK → `profiles(id)`
- **company_name**: `text`, NOT NULL
- **license_number**: `text`, NULL
- **specialties**: `ARRAY`, NULL
- **years_experience**: `integer`, NULL
- **service_area**: `text`, NULL
- **insurance_verified**: `boolean`, NULL, DEFAULT `false`
- **rating**: `numeric`, NULL
- **service_areas**: `ARRAY`, NULL
- **availability_status**: `character varying`, NULL, DEFAULT `'available'::character varying`
- **rating_count**: `integer`, NULL, DEFAULT `0`
- **search_radius**: `integer`, NULL, DEFAULT `25`
- **last_active**: `timestamp with time zone`, NULL

## contractor_requests
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **report_id**: `uuid`, NOT NULL, FK → `reports(id)`
- **contractor_id**: `uuid`, NULL, FK → `contractor_profiles(id)`
- **status**: `character varying`, NOT NULL
- **requested_by**: `uuid`, NOT NULL, FK → `users(id)`
- **requested_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **response_deadline**: `timestamp with time zone`, NULL
- **notes**: `text`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## estimate_items
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **estimate_id**: `uuid`, NOT NULL, FK → `estimates(id)`
- **description**: `text`, NOT NULL
- **quantity**: `numeric`, NOT NULL
- **unit_price**: `numeric`, NOT NULL
- **total_price**: `numeric`, NOT NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## estimates
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **report_id**: `uuid`, NOT NULL, FK → `reports(id)`
- **contractor_id**: `uuid`, NOT NULL, FK → `contractor_profiles(id)`
- **total_amount**: `numeric`, NOT NULL
- **currency**: `text`, NULL, DEFAULT `'USD'::text`
- **labor_cost**: `numeric`, NULL
- **materials_cost**: `numeric`, NULL
- **description**: `text`, NULL
- **valid_until**: `date`, NULL
- **status**: `text`, NULL, DEFAULT `'pending'::text`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## homeowner_profiles
- **id**: `uuid`, NOT NULL, PRIMARY KEY, FK → `profiles(id)`
- **preferred_contact_method**: `USER-DEFINED`, NULL, DEFAULT `'email'::contact_method`
- **additional_notes**: `text`, NULL
- **property_count**: `integer`, NULL, DEFAULT `1`

## image_analysis
- **id**: `uuid`, NOT NULL, DEFAULT `gen_random_uuid()`, PRIMARY KEY
- **image_id**: `uuid`, NOT NULL, FK → `images(id)`
- **report_id**: `uuid`, NULL, FK → `reports(id)`
- **assessment_area_id**: `uuid`, NULL, FK → `assessment_areas(id)`
- **damage_detected**: `boolean`, NULL, DEFAULT `false`
- **damage_types**: `ARRAY`, NULL, DEFAULT `'{}'::text[]`
- **damage_severity**: `text`, NULL, DEFAULT `'none'::text`
- **affected_areas**: `ARRAY`, NULL, DEFAULT `'{}'::text[]`
- **confidence**: `double precision`, NULL, DEFAULT `0`
- **raw_results**: `jsonb`, NULL, DEFAULT `'{}'::jsonb`
- **analyzed_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## images
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **assessment_area_id**: `uuid`, NULL, FK → `assessment_areas(id)`
- **report_id**: `uuid`, NULL, FK → `reports(id)`
- **storage_path**: `text`, NOT NULL
- **filename**: `text`, NOT NULL
- **file_size**: `integer`, NULL
- **content_type**: `text`, NULL
- **width**: `integer`, NULL
- **height**: `integer`, NULL
- **ai_processed**: `boolean`, NULL, DEFAULT `false`
- **ai_confidence**: `numeric`, NULL
- **ai_damage_type**: `USER-DEFINED`, NULL
- **ai_damage_severity**: `USER-DEFINED`, NULL
- **uploaded_by**: `uuid`, NULL, FK → `users(id)`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **metadata**: `jsonb`, NULL

## messages
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **sender_id**: `uuid`, NOT NULL, FK → `users(auth_user_id)`
- **receiver_id**: `uuid`, NOT NULL, FK → `users(auth_user_id)`
- **content**: `text`, NOT NULL
- **is_read**: `boolean`, NULL, DEFAULT `false`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **report_id**: `uuid`, NULL, FK → `reports(id)`
- **property_id**: `uuid`, NULL, FK → `properties(id)`
- **message_type**: `character varying`, NULL, DEFAULT `'text'::character varying`
- **conversation_id**: `text`, NULL

## notifications
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **user_id**: `uuid`, NOT NULL, FK → `users(id)`
- **title**: `text`, NOT NULL
- **message**: `text`, NOT NULL
- **is_read**: `boolean`, NULL, DEFAULT `false`
- **notification_type**: `text`, NOT NULL
- **related_id**: `uuid`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## profiles
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **user_id**: `uuid`, NOT NULL, FK → `users(id)`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## properties
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **homeowner_id**: `uuid`, NOT NULL, FK → `homeowner_profiles(id)`
- **address_line1**: `text`, NOT NULL
- **address_line2**: `text`, NULL
- **city**: `text`, NOT NULL
- **state**: `text`, NOT NULL
- **postal_code**: `text`, NOT NULL
- **country**: `text`, NULL, DEFAULT `'USA'::text`
- **property_type**: `text`, NULL
- **year_built**: `integer`, NULL
- **square_footage**: `integer`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## report_collaborators
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **report_id**: `uuid`, NOT NULL, FK → `reports(id)`
- **user_id**: `uuid`, NOT NULL, FK → `users(id)`
- **role_type**: `character varying`, NOT NULL
- **permission_level**: `character varying`, NOT NULL
- **invited_by**: `uuid`, NULL, FK → `users(id)`
- **invitation_status**: `character varying`, NOT NULL
- **invitation_email**: `character varying`, NULL
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`

## reports
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **property_id**: `uuid`, NOT NULL, FK → `properties(id)`
- **creator_id**: `uuid`, NOT NULL, FK → `users(id)`
- **title**: `text`, NOT NULL
- **description**: `text`, NULL
- **incident_date**: `date`, NULL
- **status**: `USER-DEFINED`, NULL, DEFAULT `'draft'::report_status`
- **contractor_id**: `uuid`, NULL, FK → `contractor_profiles(id)`
- **adjuster_id**: `uuid`, NULL, FK → `adjuster_profiles(id)`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **submitted_at**: `timestamp with time zone`, NULL
- **reviewed_at**: `timestamp with time zone`, NULL

## users
- **id**: `uuid`, NOT NULL, DEFAULT `uuid_generate_v4()`, PRIMARY KEY
- **email**: `text`, NOT NULL
- **auth_user_id**: `uuid`, NULL
- **first_name**: `text`, NULL
- **last_name**: `text`, NULL
- **role**: `USER-DEFINED`, NOT NULL
- **avatar_url**: `text`, NULL
- **phone**: `text`, NULL
- **email_confirmed**: `boolean`, NULL, DEFAULT `false`
- **active**: `boolean`, NULL, DEFAULT `true`
- **created_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **updated_at**: `timestamp with time zone`, NULL, DEFAULT `now()`
- **password_reset**: `USER-DEFINED`, NULL

## storage.buckets

| id               | name               | owner | created_at                      | updated_at                      | public | avif_autodetection | file_size_limit | allowed_mime_types | owner_id |
| ---------------- | ------------------ | ----- | ------------------------------- | ------------------------------- | ------ | ------------------ | --------------- | ------------------ | -------- |
| reports          | reports            | nan   | 2025-03-28 01:29:42.958639+00   | 2025-03-28 01:29:42.958639+00   | True   | False              | nan             | nan                | nan      |
| users            | users              | nan   | 2025-03-28 01:30:06.790477+00   | 2025-03-28 01:30:06.790477+00   | True   | False              | nan             | nan                | nan      |
| photos           | photos             | nan   | 2025-04-03 17:07:35.924917+00   | 2025-04-03 17:07:35.924917+00   | True   | False              | nan             | nan                | nan      |
| property-images  | property-images    | nan   | 2025-05-06 13:01:08.328546+00   | 2025-05-06 13:01:08.328546+00   | True   | False              | nan             | nan                | nan      |

---

## storage.objects

| bucket_id        | name                                                                                          | updated_at                      |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| photos           | Adjustors/.emptyFolderPlaceholder                                                             | 2025-04-03 17:08:50.116776+00   |
| photos           | Contractors/.emptyFolderPlaceholder                                                           | 2025-04-03 17:08:13.308627+00   |
| photos           | Homeowners/d39630e7-c296-4278-8d6e-ae2820f353f7/a032f8ba-9fc8-469a-885e-1746065141580.jpg     | 2025-05-01 02:05:41.916700+00   |
| photos           | Homeowners/.emptyFolderPlaceholder                                                            | 2025-04-03 17:08:22.060993+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 14:36:01.712138+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 14:53:03.484019+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 15:03:27.133265+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 15:11:40.402867+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 15:24:16.190155+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 15:38:10.552230+00   |
| property-images  | property-images/4bbab242-9f71-4df8-a88a-7ae60a12-4ee1-aa95-a9b646eda886.jpg                   | 2025-05-06 15:47:06.199057+00   |
| reports          | Adjustors/.emptyFolderPlaceholder                                                             | 2025-04-03 17:09:12.132178+00   |
| reports          | Contractors/.emptyFolderPlaceholder                                                           | 2025-04-03 17:09:05.058079+00   |
| reports          | Homeowners/4bbab242-9f71-4df8-a88a-7ae68ff9026c/cf66c1b7-81f9-4ad2-d2f0d-1746494959104.jpg     | 2025-05-06 01:29:20.188405+00   |
| reports          | Homeowners/4bbab242-9f71-4df8-a88a-7ae68ff9026c/f4769e67-05de-5e64-9cb3-1746494957365.jpg     | 2025-05-06 01:29:18.276160+00   |
| reports          | Homeowners/.emptyFolderPlaceholder                                                            | 2025-04-03 17:09:17.024681+00   |
| reports          | inspections/1746326043789-1746326038615-scjnzalof.jpg                                          | 2025-05-04 02:34:04.584578+00   |
| reports          | inspections/1746326769298-1746326765718-6698g5pbn.webp                                        | 2025-05-04 02:46:10.628493+00   |
| reports          | inspections/1746493839629-1746493836277-u309i6w7n.jpg                                          | 2025-05-06 01:10:40.530186+00   |
| reports          | reports/8c19c395-d740-4e93-9b44-95b66e088d4d/general-fb5-44bf-96ad-208b3ff03155.jpg           | 2025-05-04 17:27:35.584928+00   |
| reports          | reports/8c19c395-d740-4e93-9b44-95b66e088d4d/general-de89-4c2a-be8c-8b33d0944e06.jpg           | 2025-05-04 17:27:37.066400+00   |
| reports          | reports/ae0ee8ce-2c52-4204-9851-1060c46f3d21/66007ac65-1745962604191-test-image.png           | 2025-04-29 21:36:44.542640+00   |
| users            | Adjusters/.emptyFolderPlaceholder                                                             | 2025-03-28 01:31:29.567363+00   |
| users            | Contractors/.emptyFolderPlaceholder                                                           | 2025-03-28 01:31:17.259307+00   |
| users            | Homeowners/.emptyFolderPlaceholder                                                            | 2025-03-28 01:31:11.637697+00   |

---

## user-defined functions

| schema | function_name                         | arguments                                                                                                                             | return_type                                                      |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| public | add_assessment_area                   | p_report_id uuid, p_damage_type damage_type, p_location text, p_severity severity, p_dimensions text DEFAULT NULL::text, p_notes text DEFAULT NULL::text | uuid                                                             |
| public | assign_contractor_to_report           | p_report_id uuid, p_contractor_profile_id uuid, p_assigned_by_user_id uuid                                                            | boolean                                                          |
| public | assign_contractor_to_report           | p_request_id uuid, p_contractor_id uuid                                                                                               | boolean                                                          |
| public | calculate_contractor_match_score      | p_contractor_id uuid, p_report_id uuid                                                                                                | numeric                                                          |
| public | check_database_status                 |                                                                                                                                       | text                                                             |
| public | check_user_setup                      | auth_id uuid                                                                                                                          | TABLE(table_name text, record_exists boolean)                    |
| public | count_unread_messages                 | p_user_id uuid                                                                                                                        | integer                                                          |
| public | create_property                       | p_homeowner_profile_id uuid, p_address_line1 text, p_city text, p_state text, p_postal_code text, p_country text DEFAULT NULL::text, p_property_type text DEFAULT NULL::text, p_year_built integer DEFAULT NULL::integer, p_square_footage integer DEFAULT NULL::integer | uuid                                                             |
| public | create_report                         | p_property_id uuid, p_creator_id uuid, p_title text, p_description text DEFAULT NULL::text, p_incident_date date DEFAULT NULL::date | uuid                                                             |
| public | create_user_profile                   | p_email text, p_first_name text, p_last_name text, p_role user_role, p_specialties text[] DEFAULT NULL::text[], p_certification_verified boolean DEFAULT false | uuid                                                             |
| public | debug_rls_policies                    | table_name text                                                                                                                       | TABLE(policy_name text, cmd text, qual text, with_check text)    |
| public | delete_user_profile                   | p_user_id uuid                                                                                                                        | jsonb                                                            |
| public | find_available_contractors            | p_report_id uuid, p_limit integer DEFAULT 10, p_min_rating numeric DEFAULT 0                                                           | TABLE(contractor_profile_id uuid, availability_status character varying, match_score numeric) |
| public | fix_missing_user_profiles             |                                                                                                                                       | TABLE(user_id uuid, created boolean, role_profile_created boolean, role user_role) |
| public | get_storage_presigned_url             | bucket_id text, file_name text                                                                                                        | text                                                             |
| public | remove_empty_folders                  |                                                                                                                                       | trigger                                                          |
| public | submit_report                         | p_report_id uuid, p_submitted_by uuid                                                                                                 | boolean                                                          |
| public | trigger_image_analysis                |                                                                                                                                       | trigger                                                          |
| public | update_contractor_last_active         |                                                                                                                                       | trigger                                                          |
| public | update_contractor_requests_updated_at |                                                                                                                                       | trigger                                                          |
| public | update_homeowner_property_count       |                                                                                                                                       | trigger                                                          |
| public | update_report_collaborators_updated_at |                                                                                                                                      | trigger                                                          |
| public | update_report_damage_status           |                                                                                                                                       | trigger                                                          |
| public | update_report_review_timestamp        |                                                                                                                                       | trigger                                                          |
| public | update_timestamp                      |                                                                                                                                       | trigger                                                          |
| public | word_similarity                       | text, text                                                                                                                            | real                                                             |
| public | word_similarity_commutator_op         | text, text                                                                                                                            | boolean                                                          |
| public | word_similarity_dist_commutator_op    | text, text                                                                                                                            | real                                                             |
| public | word_similarity_dist_op               | text, text                                                                                                                            | real                                                             |
| public | word_similarity_op                    | text, text                                                                                                                            | boolean                                                          |

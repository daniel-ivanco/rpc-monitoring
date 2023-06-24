# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2023_06_19_145423) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "measurements", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "latest_block_diff"
    t.boolean "up"
    t.uuid "rpc_endpoint_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rpc_endpoint_id"], name: "index_measurements_on_rpc_endpoint_id"
  end

  create_table "rpc_endpoints", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.string "url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["url"], name: "index_rpc_endpoints_on_url", unique: true
  end

  create_table "user_endpoints", force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "rpc_endpoint_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rpc_endpoint_id"], name: "index_user_endpoints_on_rpc_endpoint_id"
    t.index ["user_id", "rpc_endpoint_id"], name: "index_user_endpoints_on_user_id_and_rpc_endpoint_id", unique: true
    t.index ["user_id"], name: "index_user_endpoints_on_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "measurements", "rpc_endpoints"
  add_foreign_key "user_endpoints", "rpc_endpoints"
  add_foreign_key "user_endpoints", "users"
end
